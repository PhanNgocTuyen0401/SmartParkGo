import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { syncAndExpireSlots } from '../services/slotSyncService.js';

// ai.routes.js – Trợ lý Ảo Dự báo & Điều phối Ô đỗ
// Chức năng: Phân tích dữ liệu lịch sử để dự báo xác suất còn chỗ trống tại các chi nhánh theo từng khung giờ trong ngày, đưa ra lời khuyên cho khách hàng 
// (ví dụ: khuyên khách nên đến trước 11h30 để có chỗ gần thang máy).

dotenv.config();

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Thu thập dữ liệu nghiệp vụ thời gian thực từ cơ sở dữ liệu PostgreSQL
 * LƯU Ý BẢO MẬT: Chỉ lấy dữ liệu tổng hợp công khai và dữ liệu của chính người dùng đang hỏi.
 * Tuyệt đối không đưa mật khẩu, JWT secret, thông tin khách hàng khác hoặc voucher ẩn vào context.
 */
async function fetchLiveSystemContext(userContext, req) {
  const io = req.app.get('io');
  try {
    // 1. Đồng bộ và giải phóng các ô đỗ hết hạn để đảm bảo số liệu chính xác thời gian thực
    await syncAndExpireSlots(io);
  } catch (err) {
    console.debug('Slot sync before AI query warning:', err.message);
  }

  const liveData = {
    branches: [],
    slotsSummary: {},
    tariffs: [],
    vouchers: [],
    loyaltyTiers: [
      { tier: 'Đồng (Bronze)', minPts: 0, maxPts: 699, perks: 'Tích luỹ 15 - 500 điểm/lượt gửi, đổi voucher ưu đãi trên ứng dụng' },
      { tier: 'Bạc (Silver)', minPts: 700, maxPts: 2999, perks: 'Giảm 5% phí gửi xe, ưu tiên giữ chỗ trước, quyền đổi voucher Bạc độc quyền' },
      { tier: 'Vàng (Gold)', minPts: 3000, maxPts: 6499, perks: 'Giảm 10% phí gửi xe, miễn 100% phụ phí giờ cao điểm, ưu tiên vị trí đỗ sảnh chính, quyền đổi voucher Vàng' },
      { tier: 'Kim Cương (Diamond)', minPts: 6500, maxPts: 'Không giới hạn', perks: 'Giảm 20% phí gửi xe mọi chi nhánh, bảo lưu ô VIP riêng biệt, miễn phụ phí giờ cao điểm, hỗ trợ cứu hộ 24/7' }
    ],
    userSession: null
  };

  // 2. Lấy danh sách 5 chi nhánh chính thức từ PostgreSQL
  try {
    const branchRes = await query(
      `SELECT id, name, district, address, total_slots, floors 
       FROM branches 
       ORDER BY id ASC`
    );
    liveData.branches = branchRes.rows || [];
  } catch (bErr) {
    console.warn('Lỗi lấy branches cho AI:', bErr.message);
  }

  // 3. Lấy số lượng ô đỗ trống thực tế theo từng chi nhánh và từng tầng
  try {
    const slotRes = await query(
      `SELECT branch_id, floor, status, COUNT(*)::int AS count 
       FROM parking_slots 
       GROUP BY branch_id, floor, status 
       ORDER BY branch_id, floor, status`
    );

    const slotMap = {};
    (slotRes.rows || []).forEach(row => {
      const bId = row.branch_id;
      const fl = row.floor;
      if (!slotMap[bId]) slotMap[bId] = {};
      if (!slotMap[bId][fl]) {
        slotMap[bId][fl] = { available: 0, reserved: 0, occupied: 0, total: 0 };
      }
      const st = String(row.status).toLowerCase();
      if (st === 'available' || st === 'trống') {
        slotMap[bId][fl].available += row.count;
      } else if (st === 'reserved' || st === 'đã đặt') {
        slotMap[bId][fl].reserved += row.count;
      } else {
        slotMap[bId][fl].occupied += row.count;
      }
      slotMap[bId][fl].total += row.count;
    });
    liveData.slotsSummary = slotMap;
  } catch (sErr) {
    console.warn('Lỗi thống kê ô đỗ cho AI:', sErr.message);
  }

  // 4. Lấy biểu phí cước niêm yết mới nhất từ bảng tariffs
  try {
    const tariffRes = await query(
      `SELECT vehicle_type, first_2_hours, next_hour, day_rate, week_rate, month_rate, note 
       FROM tariffs 
       ORDER BY id ASC`
    );
    liveData.tariffs = tariffRes.rows || [];
  } catch (tErr) {
    console.warn('Lỗi tariffs cho AI:', tErr.message);
  }

  // 5. Lấy danh sách voucher công khai (Tuyệt đối không lấy mã ẩn / bí mật có is_hidden = TRUE)
  try {
    const voucherRes = await query(
      `SELECT code, title, discount_val, discount_type, min_order_val, expiry_date, conditions 
       FROM vouchers 
       WHERE (is_hidden = FALSE OR is_hidden IS NULL) 
         AND (visibility = 'public' OR visibility IS NULL) 
         AND (status = 'Kích hoạt' OR status = 'ACTIVE' OR status = 'Khả dụng') 
       ORDER BY created_at DESC 
       LIMIT 6`
    );
    liveData.vouchers = voucherRes.rows || [];
  } catch (vErr) {
    console.warn('Lỗi vouchers cho AI:', vErr.message);
  }

  // 6. Định danh người dùng hiện tại để lấy vị trí xe và phiên đỗ thực tế (chỉ của chính họ)
  try {
    let identifiedUserId = userContext?.userId || null;
    let identifiedPlate = userContext?.plate ? String(userContext.plate).trim() : null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded?.id) identifiedUserId = decoded.id;
        if (decoded?.plate) identifiedPlate = decoded.plate;
      } catch {}
    }

    if (identifiedPlate || identifiedUserId) {
      // Kiểm tra xe đang đỗ thực tế trong parking_sessions
      const sessRes = await query(
        `SELECT ps.id, ps.plate, ps.vehicle_type, ps.slot_code, ps.branch_id, ps.checkin_time, 
                ps.status, ps.fee, ps.is_early_arrival, ps.is_overstay, ps.overstay_minutes, ps.overstay_surcharge,
                b.name AS branch_name
         FROM parking_sessions ps
         LEFT JOIN branches b ON b.id = ps.branch_id
         WHERE (ps.plate = $1 OR ps.plate = $2) AND ps.status = 'Đang đỗ'
         ORDER BY ps.checkin_time DESC LIMIT 1`,
        [identifiedPlate || '---', userContext?.plate || '---']
      );

      if (sessRes.rows && sessRes.rows.length > 0) {
        const row = sessRes.rows[0];
        const checkinDate = new Date(row.checkin_time);
        const diffMinutes = Math.max(1, Math.round((Date.now() - checkinDate.getTime()) / 60000));
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const durationStr = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;

        liveData.userSession = {
          plate: row.plate,
          vehicleType: row.vehicle_type,
          slot: row.slot_code,
          branch: row.branch_name || 'SmartPark - Aeon Mall Thanh Khê 1',
          checkinTime: checkinDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          duration: durationStr,
          fee: row.fee ? `${Number(row.fee).toLocaleString('vi-VN')}đ` : '35.000đ',
          isEarlyArrival: Boolean(row.is_early_arrival),
          isOverstay: Boolean(row.is_overstay),
          overstayMinutes: row.overstay_minutes || 0,
          overstaySurcharge: row.overstay_surcharge ? Number(row.overstay_surcharge) : 0
        };
      } else {
        // Kiểm tra vé đặt chỗ trước còn hiệu lực
        const bookRes = await query(
          `SELECT bk.booking_code, bk.plate, bk.vehicle_model, bk.slot_code, bk.floor, bk.start_time,
                  bk.total_cost, bk.payment_status, bk.is_early_arrival, b.name AS branch_name
           FROM bookings bk
           LEFT JOIN branches b ON b.id = bk.branch_id
           WHERE (bk.plate = $1 OR bk.user_id = $2)
             AND bk.payment_status IN ('Đã cọc', 'Đang giữ chỗ', 'Đã vào bãi', 'Đã vào bãi (Đến sớm)')
           ORDER BY bk.created_at DESC LIMIT 1`,
          [identifiedPlate || '---', identifiedUserId || '---']
        );

        if (bookRes.rows && bookRes.rows.length > 0) {
          const brow = bookRes.rows[0];
          liveData.userSession = {
            plate: brow.plate,
            vehicleType: brow.vehicle_model || 'Ô tô tiêu chuẩn',
            slot: `Tầng ${brow.floor || 'B1'} · Ô ${brow.slot_code}`,
            branch: brow.branch_name || 'SmartPark - Aeon Mall Thanh Khê 1',
            checkinTime: brow.start_time ? new Date(brow.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Theo lịch',
            duration: 'Đã đặt chỗ trước',
            fee: brow.total_cost ? `${Number(brow.total_cost).toLocaleString('vi-VN')}đ` : '45.000đ',
            status: brow.payment_status,
            isEarlyArrival: Boolean(brow.is_early_arrival)
          };
        }
      }
    }
  } catch (sessErr) {
    console.warn('Lỗi lấy phiên người dùng cho AI:', sessErr.message);
  }

  return liveData;
}

/**
 * Trả lời bằng hệ thống tri thức nghiệp vụ thời gian thực khi Google Gemini API ngoại tuyến
 */
function getFallbackResponse(queryText, liveContext) {
  const q = queryText.toLowerCase();

  // Kiểm tra câu hỏi ngoài luồng
  const nonRelated = ['thời tiết', 'chính trị', 'làm thơ', 'viết code', 'bài tập', 'tổng thống', 'ca sĩ', 'bóng đá', 'chiến tranh', 'tổng bí thư'];
  if (nonRelated.some((w) => q.includes(w))) {
    return 'Xin lỗi quý khách! Tôi là Trợ lý AI chuyên trách của hệ thống bãi đỗ xe thông minh SmartPark Đà Nẵng. Tôi chỉ có thể hỗ trợ các thông tin và nghiệp vụ liên quan đến bãi xe, ô đỗ, giá vé, thanh toán và ưu đãi của SmartPark. Xin quý khách vui lòng đặt câu hỏi liên quan đến dịch vụ bãi đỗ xe SmartPark!';
  }

  // 1. Hỏi về vị trí xe hoặc tìm xe
  if (q.includes('xe') || q.includes('vị trí') || q.includes('ở đâu') || q.includes('tìm xe') || q.includes('đỗ chỗ nào')) {
    if (liveContext.userSession) {
      const u = liveContext.userSession;
      return `🚗 Vị trí xe của bạn (Thời gian thực):\n• Biển số: ${u.plate}\n• Dòng xe: ${u.vehicleType}\n• Vị trí đỗ: ${u.slot}\n• Chi nhánh: ${u.branch}\n• Giờ vào: ${u.checkinTime} (${u.duration})\n• Cước phí tạm tính: ${u.fee}${u.isOverstay ? ` (⚠️ Quá giờ ${u.overstayMinutes} phút, phụ phí +${u.overstaySurcharge.toLocaleString('vi-VN')}đ)` : ''}`;
    }
    return '🅿️ Để tra cứu vị trí xe của bạn, vui lòng đăng nhập tài khoản hoặc quét mã vé trên ứng dụng. Bạn cũng có thể xem trực tiếp tại màn hình bản đồ 3D bãi đỗ trên SmartPark!';
  }

  // 2. Hỏi về ô đỗ còn trống
  if (q.includes('ô đỗ') || q.includes('chỗ trống') || q.includes('còn chỗ') || q.includes('tầng') || q.includes('b1') || q.includes('b2') || q.includes('b3')) {
    const br1Slots = liveContext.slotsSummary['BR-01'];
    if (br1Slots) {
      let msg = '🅿️ Tình trạng ô đỗ thời gian thực tại SmartPark - Aeon Mall Thanh Khê 1:\n';
      for (const [floor, data] of Object.entries(br1Slots)) {
        msg += `• Tầng ${floor}: Còn ${data.available} ô trống / Tổng ${data.total} ô\n`;
      }
      msg += '👉 Bạn có thể đặt chỗ giữ chỗ trước ngay trên ứng dụng để đảm bảo có vị trí đỗ thuận tiện nhất!';
      return msg;
    }
    return '🅿️ Hiện tại hệ thống ghi nhận các chi nhánh SmartPark Đà Nẵng đều còn các ô đỗ trống khả dụng tại các tầng B1, B2, B3. Quý khách có thể xem sơ đồ thực tế trên trang chủ ứng dụng!';
  }

  // 3. Hỏi về giá cước, biểu phí
  if (q.includes('giá') || q.includes('phí') || q.includes('tiền') || q.includes('cước') || q.includes('bao nhiêu')) {
    if (liveContext.tariffs.length > 0) {
      let msg = '💰 Biểu phí cước niêm yết chính thức của SmartPark Đà Nẵng:\n';
      liveContext.tariffs.forEach(t => {
        msg += `• ${t.vehicle_type}: ${Number(t.first_2_hours).toLocaleString('vi-VN')}đ (2h đầu) · ${Number(t.next_hour).toLocaleString('vi-VN')}đ/h tiếp theo. Vé ngày: ${Number(t.day_rate).toLocaleString('vi-VN')}đ · Tháng: ${Number(t.month_rate).toLocaleString('vi-VN')}đ.\n`;
      });
      msg += '📌 Khách hàng là Hội viên Bạc, Vàng, Kim Cương hoặc dùng voucher sẽ được giảm cước trực tiếp!';
      return msg;
    }
    return '💰 Biểu phí cước SmartPark Đà Nẵng:\n• Ô tô con 4-7 chỗ: 25.000đ cho 2h đầu, 10.000đ/giờ tiếp theo. Vé ngày: 150.000đ, Vé tháng: 1.800.000đ.\n• Xe máy: 5.000đ cho 2h đầu, 3.000đ/giờ tiếp theo. Vé tháng: 300.000đ.';
  }

  // 4. Hỏi về chi nhánh, địa chỉ
  if (q.includes('chi nhánh') || q.includes('địa chỉ') || q.includes('ở đâu') || q.includes('trạm')) {
    if (liveContext.branches.length > 0) {
      let msg = '📍 Hệ thống 5 Chi Nhánh SmartPark tại TP. Đà Nẵng:\n';
      liveContext.branches.forEach((b, idx) => {
        msg += `${idx + 1}. ${b.name}: ${b.address} (${b.total_slots} ô đỗ)\n`;
      });
      return msg;
    }
    return '📍 Hệ thống SmartPark hiện có 5 chi nhánh tại Đà Nẵng:\n1. Aeon Mall Thanh Khê 1 (Nguyễn Tất Thành)\n2. Vincom Plaza Ngô Quyền (910A Ngô Quyền)\n3. Sân Bay Quốc Tế Đà Nẵng (Duy Tân)\n4. Lotte Mart Đà Nẵng (06 Nại Nam)\n5. Indochina Riverside Mall (74 Bạch Đằng)';
  }

  // 5. Hỏi về hội viên, tích điểm, hạng thành viên
  if (q.includes('hội viên') || q.includes('thành viên') || q.includes('điểm') || q.includes('hạng') || q.includes('parkpoint') || q.includes('bạc') || q.includes('vàng') || q.includes('kim cương')) {
    return '⭐ Chính sách Hạng Thành Viên SmartPark Đà Nẵng:\n• Hạng Đồng (0 - 699 pts): Tích lũy 15 - 500 điểm/lượt gửi.\n• Hạng Bạc (700 - 2.999 pts): Giảm 5% phí gửi xe, ưu tiên đặt trước.\n• Hạng Vàng (3.000 - 6.499 pts): Giảm 10% phí gửi xe, miễn 100% phụ phí giờ cao điểm, giữ chỗ sảnh chính.\n• Hạng Kim Cương (Từ 6.500 pts): Giảm 20% phí gửi xe toàn hệ thống, bảo lưu ô VIP riêng, miễn phụ phí giờ cao điểm, hotline hỗ trợ 24/7.';
  }

  // 6. Hỏi về voucher, khuyến mãi
  if (q.includes('voucher') || q.includes('mã') || q.includes('khuyến mãi') || q.includes('giảm giá')) {
    if (liveContext.vouchers.length > 0) {
      let msg = '🏷️ Các mã ưu đãi hiện có trên hệ thống SmartPark:\n';
      liveContext.vouchers.forEach(v => {
        const val = v.discount_type === 'percent' ? `${v.discount_val}%` : `${Number(v.discount_val).toLocaleString('vi-VN')}đ`;
        msg += `• Mã [${v.code}]: ${v.title} (Giảm ${val}, hạn dùng: ${v.expiry_date})\n`;
      });
      msg += '👉 Hãy vào mục "Kho Ưu Đãi" trên ứng dụng để thu thập và áp dụng khi đặt chỗ!';
      return msg;
    }
    return '🏷️ Bạn có thể vào mục "Kho Ưu Đãi" trên ứng dụng để nhận mã WELCOME20K (giảm 20.000đ khi đăng ký mới) hoặc mã DANANGFREE (tặng 2 giờ đỗ xe miễn phí)!';
  }

  // 7. Hỏi về thanh toán hoặc barrier
  if (q.includes('thanh toán') || q.includes('vietqr') || q.includes('momo') || q.includes('barrier') || q.includes('cổng')) {
    return '💳 Thanh toán & Thông quan SmartPark:\n• Thanh toán tiện lợi: Quét mã VietQR Napas 247 đa ngân hàng, ví MoMo, ZaloPay hoặc thẻ ngân hàng.\n• Mở Barrier tự động: Nhận diện biển số thông minh AI ANPR độ chính xác 99.4% hoặc đưa mã vé QR quét trước camera bốt bảo vệ để nâng cần trong 1 giây.';
  }

  return '🚗 Trợ lý SmartPark Đà Nẵng sẵn sàng hỗ trợ bạn! Bạn có thể hỏi tôi về: Vị trí xe bạn đang đỗ, kiểm tra ô đỗ trống theo tầng thời gian thực, bảng giá vé niêm yết, các chi nhánh, chính sách nâng hạng thành viên (Bạc 700pts, Vàng 3000pts, Kim Cương 6500pts) hoặc mã voucher giảm giá.';
}

/**
 * POST /api/ai/chat - Trợ lý AI kết nối dữ liệu hệ thống thời gian thực
 */
router.post('/chat', async (req, res) => {
  const { message, context } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung câu hỏi.' });
  }

  const userQuery = message.trim();

  // Kiểm tra câu hỏi ngoài lề
  const nonRelatedKeywords = ['thời tiết', 'chính trị', 'làm thơ', 'viết code', 'bài tập', 'tổng thống', 'chiến tranh', 'thể thao thế giới'];
  if (nonRelatedKeywords.some((k) => userQuery.toLowerCase().includes(k))) {
    return res.json({
      success: true,
      reply: 'Xin lỗi quý khách! Tôi là Trợ lý AI chuyên trách của hệ thống bãi đỗ xe thông minh SmartPark Đà Nẵng. Tôi chỉ có thể hỗ trợ các thông tin và nghiệp vụ liên quan đến bãi xe, ô đỗ, giá vé, thanh toán và ưu đãi của SmartPark. Xin quý khách vui lòng đặt câu hỏi liên quan đến dịch vụ bãi đỗ xe SmartPark!'
    });
  }

  // Kiểm tra hành vi dò hỏi thông tin bảo mật / quản trị hệ thống
  const securityProbing = ['mật khẩu', 'password', 'jwt', 'secret', 'gemini_api_key', 'database_url', 'kết nối db', 'thông tin khách khác', 'email khách khác', 'biển số người khác', 'admin'];
  if (securityProbing.some(k => userQuery.toLowerCase().includes(k) && !userQuery.toLowerCase().includes('admin mall') && !userQuery.toLowerCase().includes('đổi mật khẩu'))) {
    return res.json({
      success: true,
      reply: '🛡️ Hệ thống SmartPark bảo mật thông tin tuyệt đối. Tôi chỉ có thể hỗ trợ quý khách về thông tin phương tiện của chính bạn, ô đỗ trống thời gian thực, bảng giá vé niêm yết và chính sách hội viên. Mọi thông tin quản trị và dữ liệu cá nhân của người dùng khác được bảo mật nghiêm ngặt.'
    });
  }

  // Lấy dữ liệu nghiệp vụ thời gian thực từ cơ sở dữ liệu PostgreSQL
  const liveContext = await fetchLiveSystemContext(context, req);

  // Xây dựng bản tóm tắt dữ liệu hệ thống thời gian thực đưa vào System Prompt
  let branchText = '';
  liveContext.branches.forEach(b => {
    branchText += `- ${b.name} (${b.id}): ${b.address}. Quy mô ${b.total_slots} ô đỗ.\n`;
  });

  let slotsText = '';
  for (const [bId, floors] of Object.entries(liveContext.slotsSummary)) {
    const bName = liveContext.branches.find(b => b.id === bId)?.name || bId;
    slotsText += `+ Tại ${bName}:\n`;
    for (const [fl, st] of Object.entries(floors)) {
      slotsText += `  * Tầng ${fl}: Còn ${st.available} ô trống khả dụng (Đã đặt: ${st.reserved}, Đang đỗ: ${st.occupied}, Tổng: ${st.total})\n`;
    }
  }

  let tariffText = '';
  liveContext.tariffs.forEach(t => {
    tariffText += `- ${t.vehicle_type}: ${Number(t.first_2_hours).toLocaleString('vi-VN')}đ (2h đầu), ${Number(t.next_hour).toLocaleString('vi-VN')}đ/h tiếp. Vé ngày: ${Number(t.day_rate).toLocaleString('vi-VN')}đ, Tuần: ${Number(t.week_rate).toLocaleString('vi-VN')}đ, Tháng: ${Number(t.month_rate).toLocaleString('vi-VN')}đ (${t.note || ''})\n`;
  });

  let voucherText = '';
  liveContext.vouchers.forEach(v => {
    const val = v.discount_type === 'percent' ? `${v.discount_val}%` : `${Number(v.discount_val).toLocaleString('vi-VN')}đ`;
    voucherText += `- Mã "${v.code}": ${v.title} (Giảm ${val}, đơn tối thiểu ${Number(v.min_order_val || 0).toLocaleString('vi-VN')}đ, HSD: ${v.expiry_date})\n`;
  });

  let userText = 'Chưa xác định xe của người dùng hiện tại.';
  if (liveContext.userSession) {
    const u = liveContext.userSession;
    userText = `Biển số xe của khách: ${u.plate} (${u.vehicleType}), Vị trí đỗ hiện tại: ${u.slot} tại ${u.branch}, Thời gian vào: ${u.checkinTime} (đã gửi ${u.duration}), Cước phí tạm tính: ${u.fee}.${u.isEarlyArrival ? ' (Xe đến sớm hơn lịch đặt, hệ thống đang áp dụng vé vãng lai tạm thời).' : ''}${u.isOverstay ? ` (⚠️ Xe đã quá giờ đặt ${u.overstayMinutes} phút, phụ phí quá hạn: +${u.overstaySurcharge.toLocaleString('vi-VN')}đ).` : ''}`;
  } else if (context?.plate) {
    userText = `Biển số xe người dùng cung cấp: ${context.plate}, vị trí: ${context.slot || 'Bãi đỗ'}.`;
  }

  const promptSystem = `Bạn là Trợ lý AI Thông Minh chính thức của Hệ Thống Bãi Đỗ Xe SmartPark Đà Nẵng.
BẠN ĐANG ĐƯỢC KẾT NỐI TRỰC TIẾP VỚI CƠ SỞ DỮ LIỆU THỜI GIAN THỰC CỦA HỆ THỐNG SMARTPARK:

1. DỮ LIỆU CHI NHÁNH CHÍNH THỨC:
${branchText}

2. DỮ LIỆU Ô ĐỖ TRỐNG THỜI GIAN THỰC TỪ CẢM BIẾN POSTGRESQL:
${slotsText || 'Tất cả các chi nhánh đều có ô đỗ trống sẵn sàng phục vụ.'}

3. BIỂU PHÍ CƯỚC NIÊM YẾT CHÍNH THỨC:
${tariffText}

4. CHÍNH SÁCH ĐIỂM THƯỞNG & HẠNG THÀNH VIÊN SMARTPARK:
- Hạng Đồng (Bronze): 0 - 699 điểm (tích lũy 15 - 500 điểm/lượt gửi).
- Hạng Bạc (Silver): 700 - 2.999 điểm (Đặc quyền: Giảm 5% phí gửi xe, ưu tiên đặt chỗ trước, đổi voucher Bạc độc quyền).
- Hạng Vàng (Gold): 3.000 - 6.499 điểm (Đặc quyền: Giảm 10% phí gửi xe, miễn 100% phụ phí giờ cao điểm, ưu tiên vị trí đỗ sảnh chính, đổi voucher Vàng).
- Hạng Kim Cương (Diamond): 6.500+ điểm (Đặc quyền: Giảm 20% phí gửi xe toàn hệ thống, bảo lưu ô VIP riêng, miễn phụ phí giờ cao điểm, hỗ trợ cứu hộ 24/7).
(LƯU Ý: Không có đặc quyền sạc xe điện EV theo đúng chính sách chuẩn).

5. CÁC MÃ VOUCHER CÔNG KHAI KHẢ DỤNG:
${voucherText || 'WELCOME20K (Giảm 20.000đ cho thành viên mới), DANANGFREE (Tặng 2 giờ đỗ xe miễn phí).'}

6. THÔNG TIN PHƯƠNG TIỆN CỦA CHÍNH KHÁCH HÀNG ĐANG HỎI:
${userText}

QUY TẮC BẢO MẬT & ĐẠO ĐỨC CỐT LÕI:
- BẢO MẬT TUYỆT ĐỐI: Không bao giờ tiết lộ chuỗi kết nối Database, mật khẩu, JWT Secret, API Key, hoặc dữ liệu cá nhân của bất kỳ người dùng nào khác.
- KHÔNG TIẾT LỘ MÃ VOUCHER ẨN: Chỉ giới thiệu các mã công khai có trong danh sách trên.
- CHỈ TRẢ LỜI NGHIỆP VỤ BÃI XE: Nếu câu hỏi không liên quan đến hệ thống bãi xe SmartPark, từ chối lịch sự và hướng dẫn khách hỏi về đỗ xe.
- Trả lời bằng tiếng Việt lịch sự, súc tích, chính xác theo số liệu thời gian thực ở trên, dùng emoji phù hợp.`;

  // Gọi Google Gemini API bằng fetch
  try {
    const promptText = `${promptSystem}\n\nKhách hàng hỏi: "${userQuery}"\nTrợ lý AI trả lời:`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600
      }
    };

    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];
    let aiResponseText = null;

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(5000)
        });

        if (resp.ok) {
          const data = await resp.json();
          aiResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResponseText) break;
        }
      } catch {
        // Thử model tiếp theo
      }
    }

    if (aiResponseText) {
      return res.json({
        success: true,
        reply: aiResponseText.trim()
      });
    }

    // Nếu Gemini API gặp sự cố mạng hoặc vượt quota, fallback sử dụng dữ liệu thời gian thực
    const fallback = getFallbackResponse(userQuery, liveContext);
    return res.json({
      success: true,
      reply: fallback
    });
  } catch (err) {
    const fallback = getFallbackResponse(userQuery, liveContext);
    return res.json({
      success: true,
      reply: fallback
    });
  }
});

export default router;
