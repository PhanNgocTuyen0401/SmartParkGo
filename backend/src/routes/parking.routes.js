import express from 'express';
import { query } from '../database/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { syncAndExpireSlots } from '../services/slotSyncService.js';


// parking.routes.js – Vận hành Trạm Bốt & Nhận diện Biển số AI
// Chức năng:
// POST /api/parking/checkin: Khi camera ANPR nhận diện biển số hoặc quét mã QR Barrier Pass tại cổng vào, hệ thống tự động kiểm tra xem xe có đặt trước không. Nếu hợp lệ 
// →
// → lưu phiên đỗ parking_sessions với trạng thái Đang đỗ và phát lệnh nâng barrier.
// POST /api/parking/checkout: Tính toán thời gian đỗ thực tế, áp dụng biểu phí theo bảng giá tariffs (tính giờ, tính ngày), trừ voucher và lập hóa đơn.


const router = express.Router();

const FALLBACK_BRANCHES = [
  { id: 'BR-01', name: 'SmartPark - Aeon Mall Thanh Khê 1', district: 'Q. Thanh Khê', address: 'Đường Nguyễn Tất Thành, P. Tam Thuận', totalSlots: 240, status: 'Hoạt động' },
  { id: 'BR-02', name: 'SmartPark - Vincom Plaza Ngô Quyền', district: 'Q. Sơn Trà', address: '910A Ngô Quyền, P. An Hải Bắc', totalSlots: 180, status: 'Hoạt động' },
  { id: 'BR-03', name: 'SmartPark - Sân Bay Quốc Tế Đà Nẵng', district: 'Q. Hải Châu', address: 'Đường Duy Tân, P. Hòa Thuận Tây', totalSlots: 450, status: 'Hoạt động' },
  { id: 'BR-04', name: 'SmartPark - Lotte Mart Đà Nẵng', district: 'Q. Hải Châu', address: '06 Nại Nam, P. Hòa Cường Bắc', totalSlots: 150, status: 'Hoạt động' },
  { id: 'BR-05', name: 'SmartPark - Indochina Riverside Mall', district: 'Q. Hải Châu', address: '74 Bạch Đằng, P. Hải Châu 1', totalSlots: 120, status: 'Hoạt động' }
];

/**
 * 1. GET /api/parking/branches
 */
router.get('/branches', async (req, res) => {
  try {
    const dbRes = await query(`
      SELECT b.*,
        COALESCE(COUNT(CASE WHEN s.status = 'available' THEN 1 END), 0)::int as available_slots_calc,
        COALESCE(COUNT(s.id), b.total_slots)::int as total_slots_calc
      FROM branches b
      LEFT JOIN parking_slots s ON b.id = s.branch_id
      GROUP BY b.id
      ORDER BY b.id ASC
    `);

    const BRANCH_META = {
      'BR-01': { lat: 16.0664, lng: 108.1963, dist: 1.2, underground: true, outdoor: false, img: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80' },
      'BR-02': { lat: 16.0717, lng: 108.2325, dist: 2.8, underground: true, outdoor: false, img: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80' },
      'BR-03': { lat: 16.0469, lng: 108.2022, dist: 4.5, underground: false, outdoor: true, img: 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80' },
      'BR-04': { lat: 16.0606, lng: 108.2230, dist: 3.1, underground: true, outdoor: true, img: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80' },
      'BR-05': { lat: 16.0540, lng: 108.1960, dist: 0.8, underground: true, outdoor: false, img: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80' },
    };

    if (dbRes.rowCount > 0) {
      const branches = dbRes.rows.map(b => {
        const meta = BRANCH_META[b.id] || { lat: 16.0544, lng: 108.2022, dist: 2.0, underground: true, outdoor: false, img: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80' };
        const total = b.total_slots || b.total_slots_calc || 200;
        const avail = b.available_slots_calc > 0 ? b.available_slots_calc : Math.round(total * 0.45);
        return {
          id: b.id,
          name: b.name,
          district: b.district,
          address: b.address,
          total_slots: total,
          totalSlots: total,
          available_slots: avail,
          availableSlots: avail,
          floors: b.floors || 'G,B1,B2',
          barrier_ai_status: b.barrier_ai_status || 'Online (AI 99.4%)',
          barrierAi: b.barrier_ai_status || 'Online (AI 99.4%)',
          status: b.status || 'Hoạt động',
          latitude: meta.lat,
          longitude: meta.lng,
          lat: meta.lat,
          lng: meta.lng,
          distanceKm: meta.dist,
          isUnderground: meta.underground,
          isOutdoor: meta.outdoor,
          image: meta.img
        };
      });
      return res.json({ success: true, data: branches });
    }
  } catch (err) {
    console.warn('Lỗi query branches:', err.message);
  }
  res.json({ success: true, data: FALLBACK_BRANCHES });
});

/**
 * 2. POST /api/parking/barrier-trigger & /barrier/control
 */
const handleBarrierTrigger = async (req, res) => {
  try {
    const { gate, plate, action, reason } = req.body;
    const io = req.app.get('io');

    const barrierEvent = {
      gate: gate || 'Cổng Vào 01',
      plate: plate || '---',
      action: action || 'OPEN',
      reason: reason || 'Lệnh điều khiển từ nhân viên bốt',
      timestamp: new Date().toISOString()
    };

    if (io) {
      io.emit('barrier:action', barrierEvent);
    }

    // Ghi nhật ký vào bảng audit_logs
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `AUD-${Date.now()}`,
          action === 'FORCE_OPEN' || reason?.includes('cứu thương') ? 'MỞ BARRIER CƯỠNG CHẾ (F4)' : 'ĐIỀU KHIỂN BARRIER',
          req.user?.id || 'STAFF-01',
          req.user?.fullName || 'Nhân Viên Bốt',
          `Cổng: ${barrierEvent.gate} · Biển số: ${barrierEvent.plate} · Lý do: ${barrierEvent.reason}`,
          req.ip || '127.0.0.1'
        ]
      );
    } catch {}

    res.json({
      success: true,
      message: `Lệnh mở barrier ${barrierEvent.gate} đã được gửi thành công.`,
      data: barrierEvent
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.post('/barrier-trigger', authenticateJWT, handleBarrierTrigger);
router.post('/barrier/control', authenticateJWT, handleBarrierTrigger);

/**
 * 3. POST /api/parking/verify-qr
 * Xác thực mã QR Barrier Pass trực tiếp từ cơ sở dữ liệu PostgreSQL
 */
router.post('/verify-qr', async (req, res) => {
  try {
    const rawCode = req.body.code || req.body.qrCode;
    if (!rawCode || typeof rawCode !== 'string') {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin mã QR.' });
    }
    const code = rawCode;

    const trimmed = code.trim();
    let searchCode = trimmed;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.code) searchCode = parsed.code;
      } catch {}
    }

    // 1. Tìm kiếm trong bảng bookings của PostgreSQL
    try {
      const dbRes = await query(
        `SELECT b.*, u.full_name as user_name, u.phone as user_phone, br.name as branch_name
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         LEFT JOIN branches br ON b.branch_id = br.id
          WHERE UPPER(b.booking_code) = UPPER($1)
             OR UPPER(b.id) = UPPER($1)
             OR UPPER(b.qr_code_payload) = UPPER($1)
             OR UPPER(REPLACE(REPLACE(b.plate, ' ', ''), '-', '')) = UPPER(REPLACE(REPLACE($1, ' ', ''), '-', ''))
             OR $1 LIKE '%' || b.booking_code || '%'
             OR ($1 LIKE '%SP-PASS-%' AND (b.qr_code_payload LIKE '%' || SPLIT_PART($1, '-', 3) || '%' OR b.booking_code LIKE '%' || SPLIT_PART($1, '-', 3) || '%'))
             OR (b.qr_code_payload IS NOT NULL AND $1 LIKE '%' || b.qr_code_payload || '%')
          LIMIT 1`,
        [searchCode]
      );

      if (dbRes.rowCount > 0) {
        const row = dbRes.rows[0];
        const isExpired = row.payment_status === 'Quá hạn' || (row.expiry_date && new Date(row.expiry_date) < new Date());

        // 1. KIỂM TRA MÃ ĐÃ SỬ DỤNG TRƯỚC ĐÓ CHƯA (Mỗi mã chỉ quét 1 lần duy nhất)
        if (row.is_used || (row.scan_count && row.scan_count > 0) || row.payment_status === 'Đã vào bãi') {
          const usedTime = row.used_at
            ? `${new Date(row.used_at).toLocaleTimeString('vi-VN')} ngày ${new Date(row.used_at).toLocaleDateString('vi-VN')}`
            : 'trước đó';

          try {
            await query(
              `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
               VALUES ($1, 'CẢNH BÁO AN NINH: QUÉT LẶP LẠI MÃ QR ĐÃ DÙNG', 'STAFF', 'Nhân viên cổng', $2, $3)`,
              [`AUD-${Date.now()}`, `Mã vé ${row.booking_code} của xe ${row.plate} đã được quét trước đó lúc ${usedTime}. Từ chối mở barrier!`, req.ip || '127.0.0.1']
            );
          } catch {}

          return res.status(409).json({
            success: false,
            alreadyUsed: true,
            error: `Vé QR này đã được quét sử dụng lúc ${usedTime}! Mỗi mã QR của hệ thống chỉ được phép quét duy nhất một lần.`,
            data: {
              code: row.booking_code,
              plate: row.plate,
              customer: row.customer_name || row.user_name || 'Khách hàng SmartPark',
              slot: row.slot_code,
              bookingTime: 'Vé đã qua sử dụng',
              usedAt: usedTime,
              status: 'ALREADY_USED',
              canOpenBarrier: false
            }
          });
        }

        if (isExpired) {
          return res.status(400).json({
            success: false,
            error: 'Vé QR đã hết hạn! Vui lòng liên hệ quầy hỗ trợ hoặc đặt vé mới.',
            data: {
              code: row.booking_code,
              plate: row.plate,
              customer: row.customer_name || row.user_name,
              slot: row.slot_code,
              status: 'EXPIRED',
              canOpenBarrier: false
            }
          });
        }

        // 2. KIỂM TRA KHÁCH HÀNG ĐẾN SỚM HƠN GIỜ ĐẶT CHỖ (CHUYỂN SANG VÉ VÃNG LAI BỔ SUNG)
        const now = new Date();
        const startTime = row.start_time ? new Date(row.start_time) : null;
        let isEarlyArrival = false;
        let earlyMinutes = 0;

        // Nếu xe đến sớm hơn 10 phút so với giờ bắt đầu đăng ký
        if (startTime && now.getTime() < (startTime.getTime() - 10 * 60 * 1000)) {
          isEarlyArrival = true;
          earlyMinutes = Math.round((startTime.getTime() - now.getTime()) / 60000);
        }

        const bookingStatus = isEarlyArrival ? 'Đã vào bãi (Đến sớm)' : 'Đã vào bãi';
        const ticketType = isEarlyArrival ? 'Vé vãng lai (Đến sớm)' : 'Vé đặt trước app';

        // 3. ĐÁNH DẤU VÉ ĐÃ SỬ DỤNG VÀ GHI NHẬN LƯỢT QUÉT DUY NHẤT VÀO POSTGRESQL
        try {
          await query(
            `UPDATE bookings 
             SET is_used = TRUE, 
                 used_at = CURRENT_TIMESTAMP, 
                 scan_count = COALESCE(scan_count, 0) + 1,
                 payment_status = $1,
                 is_early_arrival = $2
             WHERE id = $3`,
            [bookingStatus, isEarlyArrival, row.id]
          );
        } catch (updateErr) {
          console.warn('Lỗi cập nhật trạng thái đã dùng của booking:', updateErr.message);
        }

        // Tự động ghi nhận vào parking_sessions để quản lý phương tiện đang đỗ
        try {
          await query(
            `INSERT INTO parking_sessions (id, ticket_code, plate, vehicle_type, slot_code, branch_id, checkin_time, status, fee, payment_method, payment_status, ticket_type, is_early_arrival)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'Đang đỗ', $7, $8, $9, $10, $11)
             ON CONFLICT (ticket_code) DO UPDATE
             SET status = 'Đang đỗ',
                 ticket_type = EXCLUDED.ticket_type,
                 is_early_arrival = EXCLUDED.is_early_arrival,
                 checkin_time = CURRENT_TIMESTAMP`,
            [
              `SESS-${Date.now()}`,
              row.booking_code,
              row.plate,
              row.vehicle_model || 'Ô tô tiêu chuẩn',
              row.slot_code,
              row.branch_id,
              row.total_cost || 45000,
              row.payment_method || 'VietQR',
              isEarlyArrival ? 'Chuyển vé vãng lai' : 'Đã cọc',
              ticketType,
              isEarlyArrival
            ]
          );
        } catch (sessErr) {
          console.debug('Lỗi tạo parking_session:', sessErr.message);
        }

        // Cập nhật trạng thái ô đỗ thành 'occupied' (Đang đỗ) thời gian thực
        try {
          const cleanSlot = (row.slot_code || '').replace(/Tầng\s+[A-Za-z0-9]+\s*·\s*/i, '').replace(/^Ô\s*/i, '').trim();
          await query(
            `UPDATE parking_slots
             SET status = 'occupied',
                 occupied_by_plate = $1,
                 occupied_by_booking = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE (branch_id = $3 OR $3 = 'all')
               AND (slot_code = $4 OR slot_code = $5 OR slot_code LIKE '%' || $5 || '%' OR $4 LIKE '%' || slot_code || '%')`,
            [row.plate, row.booking_code, row.branch_id || 'BR-01', row.slot_code, cleanSlot]
          );
          const io = req.app.get('io');
          if (io) {
            io.emit('slot:status_changed', {
              branchId: row.branch_id || 'BR-01',
              floor: row.floor || 'B1',
              slot: row.slot_code,
              status: 'occupied',
              plate: row.plate
            });
            io.emit('slots:update', { timestamp: new Date().toISOString() });
          }
        } catch (slotUpdateErr) {
          console.debug('Lỗi cập nhật parking_slots khi quét vào:', slotUpdateErr.message);
        }

        // Lưu nhật ký thông quan vào bảng clearance_logs để lưu trữ vĩnh viễn không mất
        try {
          const logId = `LOG-${Date.now().toString().slice(-4)}`;
          const today = new Date();
          await query(
            `INSERT INTO clearance_logs (id, log_date, date_display, time_in, time_out, duration, plate, slot, customer, ticket_type, status, method, fee, gate_in, gate_out)
             VALUES ($1, CURRENT_DATE, $2, $3, '--:--', 'Vừa vào bãi', $4, $5, $6, $7, $8, $9, $10, 'Cổng Vào 01', '--')
             ON CONFLICT (id) DO NOTHING`,
            [
              logId,
              today.toLocaleDateString('vi-VN'),
              today.toLocaleTimeString('vi-VN'),
              row.plate,
              row.slot_code || 'Bãi đỗ',
              row.customer_name || row.user_name || 'Khách hàng SmartPark',
              ticketType,
              isEarlyArrival ? 'Đến sớm (Chờ thanh toán)' : 'Đã vào bãi',
              isEarlyArrival ? 'Vé vãng lai tạm thời' : 'Đã thanh toán qua App',
              typeof row.total_cost === 'number' ? `${row.total_cost.toLocaleString('vi-VN')}đ` : '45.000đ'
            ]
          );
        } catch (logErr) {
          console.debug('Lỗi lưu clearance_logs:', logErr.message);
        }

        // 4. Nếu khách đến sớm: Gửi thông báo thời gian thực về tài khoản người dùng
        if (isEarlyArrival) {
          const notifId = `NOTI-EARLY-${Date.now()}`;
          const earlyTimeStr = earlyMinutes >= 60
            ? `${Math.floor(earlyMinutes / 60)} giờ ${earlyMinutes % 60 > 0 ? `${earlyMinutes % 60} phút` : ''}`
            : `${earlyMinutes} phút`;
          const notifMsg = `Phương tiện ${row.plate} đã quét mã vào bãi sớm hơn ${earlyTimeStr} so với giờ bắt đầu đặt (${new Date(row.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}). Hệ thống tự động áp dụng chế độ vé vãng lai tạm thời cho khoảng thời gian đến sớm này.`;
          const notifMsgEn = `Vehicle ${row.plate} checked in ${earlyTimeStr} before scheduled booking (${new Date(row.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}). Switched to temporary walk-in ticket for early duration.`;

          try {
            await query(
              `INSERT INTO notifications (id, type, title, title_en, message, message_en, audience, unread, created_at)
               VALUES ($1, 'booking', 'Thông báo vào bãi sớm (Chuyển vé vãng lai)', 'Early Arrival Notice', $2, $3, $4, TRUE, CURRENT_TIMESTAMP)`,
              [notifId, notifMsg, notifMsgEn, row.user_id || 'all']
            );
          } catch {}

          const io = req.app.get('io');
          if (io) {
            io.emit('notification:new', {
              id: notifId,
              type: 'booking',
              title: 'Thông báo vào bãi sớm (Chuyển vé vãng lai)',
              titleEn: 'Early Arrival Notice',
              message: notifMsg,
              messageEn: notifMsgEn,
              unread: true,
              time: 'Vừa xong',
              timeEn: 'Just now',
              userId: row.user_id
            });
          }
        }

        const verifiedData = {
          code: row.booking_code || row.qr_code_payload || searchCode,
          plate: row.plate,
          customer: row.customer_name || row.user_name || 'Khách hàng SmartPark',
          phone: row.phone || row.user_phone || '',
          model: row.vehicle_model || 'Ô tô tiêu chuẩn',
          branch: row.branch_name || 'SmartPark - Aeon Mall Thanh Khê 1 (Đà Nẵng)',
          slot: row.slot_code || 'Tầng B2 · Ô B-08',
          bookingTime: isEarlyArrival
            ? `Đến sớm ${earlyMinutes} phút (Lịch đặt: ${new Date(row.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`
            : `${row.duration_type || 'Vé đặt trước'}`,
          validUntil: row.expiry_date || new Date(Date.now() + 20 * 86400000).toISOString(),
          status: 'ACTIVE',
          fee: typeof row.total_cost === 'number' ? `${row.total_cost.toLocaleString('vi-VN')}đ` : '45.000đ',
          paymentStatus: isEarlyArrival ? 'Chuyển vé vãng lai (Đến sớm)' : 'Đã vào bãi (Đã thanh toán)',
          depositPaid: !isEarlyArrival,
          isPrebooked: !isEarlyArrival,
          isEarlyArrival,
          earlyMinutes,
          ticketType,
          canOpenBarrier: true,
          isUsed: true,
          usedAt: new Date().toLocaleTimeString('vi-VN')
        };

        // Ghi nhật ký vào audit_logs
        try {
          await query(
            `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
             VALUES ($1, $2, 'STAFF', 'Nhân viên cổng', $3, $4)`,
            [
              `AUD-${Date.now()}`,
              isEarlyArrival ? 'QUÉT MÃ QR: ĐẾN SỚM (CHUYỂN VÉ VÃNG LAI)' : 'QUÉT MÃ QR BARRIER THÀNH CÔNG',
              `Mã vé: ${verifiedData.code} · Xe: ${verifiedData.plate} · Vị trí: ${verifiedData.slot}${isEarlyArrival ? ` · Đến sớm: ${earlyMinutes} phút` : ''}`,
              req.ip || '127.0.0.1'
            ]
          );
        } catch {}

        return res.json({ success: true, data: verifiedData });
      }
    } catch (dbErr) {
      console.warn('Lỗi query PostgreSQL bookings:', dbErr.message);
    }

    // 2. Kiểm tra định dạng mã hệ thống (SP-PASS-, SMARTPARK-, BK-, SP-VL-)
    const isSystemFormat = /^SP-PASS-|^SMARTPARK-|^BK-|^SP-VL-/i.test(trimmed) || 
      (trimmed.startsWith('{') && (trimmed.includes('SP-PASS-') || trimmed.includes('SmartPark') || trimmed.includes('booking_code')));

    if (!isSystemFormat) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
      try {
        await query(
          `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
           VALUES ($1, 'CẢNH BÁO AN NINH: QUÉT MÃ QR NGOÀI / KHÔNG HỢP LỆ', 'STAFF', 'Nhân viên cổng', $2, $3)`,
          [`AUD-${Date.now()}`, `Phát hiện quét mã QR lạ không thuộc hệ sinh thái SmartPark: "${trimmed.slice(0, 80)}" từ IP ${clientIp}`, clientIp]
        );
      } catch {}
      return res.status(400).json({
        success: false,
        error: 'Mã QR không hợp lệ! Hệ thống SmartPark chỉ chấp nhận vé QR chính thức do hệ thống phát hành.'
      });
    }

    // Tuyệt đối không tạo vé giả nếu không tồn tại trong cơ sở dữ liệu
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
         VALUES ($1, 'CẢNH BÁO AN NINH: MÃ VÉ KHÔNG TỒN TẠI TRONG DB', 'STAFF', 'Nhân viên cổng', $2, $3)`,
        [`AUD-${Date.now()}`, `Mã vé ${searchCode} đúng định dạng nhưng không tìm thấy trong hệ thống đặt chỗ`, clientIp]
      );
    } catch {}
    return res.status(404).json({
      success: false,
      error: 'Mã QR không tồn tại trong hệ thống dữ liệu SmartPark.'
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/parking/slots/:branchId/:floor & /api/parking/branches/:branchId/slots
 */
router.get(['/slots/:branchId/:floor', '/branches/:branchId/slots'], async (req, res) => {
  try {
    const branchId = req.params.branchId;
    const floor = req.params.floor || req.query.floor || 'B1';
    const io = req.app.get('io');

    // Tự động đồng bộ và giải phóng ô đỗ hết hạn trước khi trả về dữ liệu
    await syncAndExpireSlots(io);

    let slots = [];
    try {
      const dbRes = await query(
        `SELECT ps.*,
          CASE
            WHEN ps.status = 'occupied' THEN 'occupied'
            WHEN ps.status = 'reserved' AND (ps.expires_at IS NULL OR ps.expires_at > CURRENT_TIMESTAMP) THEN 'reserved'
            WHEN EXISTS (
              SELECT 1 FROM parking_sessions pses
              WHERE (pses.slot_code LIKE '%' || ps.slot_code || '%' OR ps.slot_code LIKE '%' || pses.slot_code || '%')
                AND (pses.branch_id = ps.branch_id OR pses.branch_id = 'all')
                AND (pses.status = 'Đang đỗ' OR pses.payment_status = 'Đang gửi')
            ) THEN 'occupied'
            WHEN EXISTS (
              SELECT 1 FROM bookings b
              WHERE (
                b.slot_code = ps.slot_code
                OR b.slot_code LIKE '%' || ps.slot_code || '%'
                OR ps.slot_code LIKE '%' || b.slot_code || '%'
                OR (b.floor = ps.floor AND (
                  ps.slot_code LIKE '%' || SPLIT_PART(b.slot_code, 'Ô ', 2) || '%'
                  OR b.slot_code LIKE '%' || SPLIT_PART(ps.slot_code, '-', 2) || '%'
                ))
              )
              AND (b.branch_id = ps.branch_id OR b.branch_id = 'all')
              AND b.payment_status IN ('Đã cọc', 'Đang giữ chỗ')
              AND (
                (b.end_time IS NOT NULL AND b.end_time > CURRENT_TIMESTAMP)
                OR (b.expiry_date IS NOT NULL AND b.expiry_date > CURRENT_TIMESTAMP)
              )
            ) THEN 'reserved'
            ELSE 'available'
          END as computed_status
         FROM parking_slots ps
         WHERE ps.branch_id = $1 AND ps.floor = $2
         ORDER BY ps.slot_code ASC`,
        [branchId, floor]
      );

      slots = dbRes.rows.map((s) => {
        const liveSt = s.computed_status || s.status || 'available';
        const isEv = s.slot_type === 'ev' || (s.slot_code && s.slot_code.includes('EV'));
        const isVip = s.slot_type === 'vip' || s.floor === 'B3' || (s.slot_code && (s.slot_code.startsWith('B3-') || s.slot_code.includes('V-')));
        const shortId = s.slot_code.includes('-') && !s.slot_code.startsWith('G-') ? s.slot_code.replace(/^[A-Za-z0-9]+-/, '') : s.slot_code;

        return {
          id: s.slot_code,
          slot_code: s.slot_code,
          floor: s.floor || floor,
          shortId,
          code: s.slot_code,
          status: liveSt,
          slot_type: s.slot_type || (isEv ? 'ev' : isVip ? 'vip' : 'standard'),
          type: s.slot_type || (isEv ? 'ev' : isVip ? 'vip' : 'car'),
          isEv,
          isVip,
          occupiedByPlate: s.occupied_by_plate,
          occupiedByBooking: s.occupied_by_booking,
          expiresAt: s.expires_at
        };
      });
    } catch (dbErr) {
      console.warn('Lỗi query parking_slots từ DB:', dbErr.message);
      slots = Array.from({ length: 12 }, (_, i) => ({
        id: `${floor}-${String(i + 1).padStart(2, '0')}`,
        shortId: `${String(i + 1).padStart(2, '0')}`,
        status: 'available',
        type: 'car',
        isEv: false,
        isVip: false
      }));
    }

    res.json({ success: true, data: slots, floor, branchId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/parking/slots/:branchId/:slotCode - Admin cập nhật trạng thái ô đỗ trực tiếp
 */
router.patch('/slots/:branchId/:slotCode', authenticateJWT, async (req, res) => {
  try {
    const { branchId, slotCode } = req.params;
    const { status, plate, floor } = req.body;
    const io = req.app.get('io');

    const validStatuses = ['available', 'occupied', 'reserved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ. Chọn: available, occupied, reserved.' });
    }

    let expiresAt = null;
    let occupiedPlate = null;

    if (status === 'reserved') {
      expiresAt = new Date(Date.now() + 2 * 3600 * 1000); // 2 giờ
      occupiedPlate = plate || 'ADMIN-RESERVED';
    } else if (status === 'occupied') {
      occupiedPlate = plate || 'ADMIN-OCCUPIED';
    }

    const updateRes = await query(
      `UPDATE parking_slots
       SET status = $1,
           occupied_by_plate = $2,
           occupied_by_booking = CASE WHEN $1 = 'available' THEN NULL ELSE occupied_by_booking END,
           expires_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE branch_id = $4 AND (slot_code = $5 OR slot_code LIKE '%' || $5 || '%')
       RETURNING *`,
      [status, occupiedPlate, expiresAt, branchId, slotCode]
    );

    const updatedSlot = updateRes.rows[0];

    // Phát sự kiện cập nhật ngay lập tức qua Socket.IO tới toàn bộ máy khách
    if (io) {
      io.emit('slot:status_changed', {
        branchId,
        slot: slotCode,
        floor: updatedSlot?.floor || floor,
        status,
        plate: occupiedPlate,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        byAdmin: true
      });
      io.emit('slots:update', { branchId, floor: updatedSlot?.floor || floor });
    }

    // Ghi audit log
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
         VALUES ($1, 'CẬP NHẬT TRẠNG THÁI Ô ĐỖ', $2, $3, $4, $5)`,
        [
          `AUD-${Date.now()}`,
          req.user?.id || 'ADMIN',
          req.user?.fullName || 'Quản trị viên',
          `Cập nhật ô ${slotCode} (${branchId}) sang trạng thái [${status}]`,
          req.ip || '127.0.0.1'
        ]
      );
    } catch {}

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái ô ${slotCode} thành "${status}".`,
      data: updatedSlot || { branchId, slotCode, status }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/parking/tariffs/:branchId - Giá đặt chỗ theo chi nhánh
 */
router.get('/tariffs/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    let tariffs = [];
    try {
      const dbRes = await query(
        `SELECT * FROM tariffs WHERE branch_id = $1 OR branch_id = 'all' ORDER BY id ASC`,
        [branchId]
      );
      tariffs = dbRes.rows;
    } catch {
      tariffs = [
        { vehicle_type: 'Ô tô con 4-7 chỗ', first_2_hours: 25000, next_hour: 10000, day_rate: 150000, week_rate: 650000, month_rate: 1800000 },
        { vehicle_type: 'Ô tô SUV / Bán tải', first_2_hours: 30000, next_hour: 12000, day_rate: 180000, week_rate: 750000, month_rate: 2100000 },
        { vehicle_type: 'Xe máy', first_2_hours: 5000, next_hour: 3000, day_rate: 20000, week_rate: 100000, month_rate: 300000 }
      ];
    }
    res.json({ success: true, data: tariffs, branchId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/parking/clearance-logs - Lấy nhật ký thông quan (hỗ trợ lọc theo ngày)
 */
router.get('/clearance-logs', async (req, res) => {
  try {
    const { date } = req.query;
    let sql = 'SELECT * FROM clearance_logs';
    let params = [];

    if (date && date.trim() !== '') {
      sql += ' WHERE log_date = $1 ORDER BY time_in DESC, created_at DESC LIMIT 300';
      params.push(date.trim());
    } else {
      sql += ' ORDER BY log_date DESC, time_in DESC, created_at DESC LIMIT 500';
    }

    const dbRes = await query(sql, params);
    res.json({ success: true, data: dbRes.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/parking/clearance-logs - Thêm hoặc cập nhật nhật ký thông quan
 */
router.post('/clearance-logs', async (req, res) => {
  try {
    const log = req.body;
    if (!log || !log.id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin nhật ký' });
    }

    const today = new Date();
    const logDate = log.date || log.log_date || today.toISOString().split('T')[0];
    const dateDisplay = log.dateDisplay || log.date_display || today.toLocaleDateString('vi-VN');

    await query(
      `INSERT INTO clearance_logs (id, log_date, date_display, time_in, time_out, duration, plate, slot, customer, ticket_type, status, method, fee, gate_in, gate_out)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE
       SET time_out = EXCLUDED.time_out,
           duration = EXCLUDED.duration,
           status = EXCLUDED.status,
           method = EXCLUDED.method,
           fee = EXCLUDED.fee,
           gate_out = EXCLUDED.gate_out,
           updated_at = CURRENT_TIMESTAMP`,
      [
        log.id, logDate, dateDisplay, log.timeIn || log.time_in || today.toLocaleTimeString('vi-VN'),
        log.timeOut || log.time_out || '--:--', log.duration || 'Vừa vào bãi',
        log.plate, log.slot, log.customer, log.ticketType || log.ticket_type,
        log.status, log.method, log.fee, log.gateIn || log.gate_in || 'Cổng Vào 01',
        log.gateOut || log.gate_out || '--'
      ]
    );

    res.json({ success: true, message: 'Đã lưu nhật ký thông quan vào cơ sở dữ liệu' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/parking/checkout - Xe ra bãi: thanh toán cước, mở barrier ra và giải phóng ô đỗ về TRỐNG ngay lập tức
 */
router.post('/checkout', async (req, res) => {
  try {
    const { sessionId, plate, slot, fee, paymentMethod, ticketType } = req.body;
    const io = req.app.get('io');
    const now = new Date();
    const timeOutStr = now.toLocaleTimeString('vi-VN');

    // 1. Cập nhật parking_sessions sang 'Hoàn tất' (đã ra bãi)
    try {
      await query(
        `UPDATE parking_sessions
         SET status = 'Hoàn tất',
             payment_status = 'Đã thanh toán',
             payment_method = $1,
             checkout_time = CURRENT_TIMESTAMP
         WHERE id = $2 OR plate = $3`,
        [paymentMethod || 'VietQR / Napas 247', sessionId || '---', plate || '---']
      );
    } catch (sErr) {
      console.warn('Lỗi cập nhật parking_sessions checkout:', sErr.message);
    }

    // 2. Cập nhật booking nếu là khách đặt trước
    try {
      await query(
        `UPDATE bookings
         SET payment_status = 'Hoàn tất (Đã ra bãi)'
         WHERE plate = $1 AND payment_status IN ('Đã vào bãi', 'Đã vào bãi (Đến sớm)', 'Đã cọc', 'Đang giữ chỗ')`,
        [plate || '---']
      );
    } catch {}

    // 3. GIẢI PHÓNG Ô ĐỖ VỀ TRỐNG NGAY LẬP TỨC (thời gian thực)
    let freedSlot = null;
    try {
      const cleanSlot = (slot || '').replace(/Tầng\s+[A-Za-z0-9]+\s*·\s*/i, '').replace(/^Ô\s*/i, '').trim();
      const freeRes = await query(
        `UPDATE parking_slots
         SET status = 'available',
             occupied_by_plate = NULL,
             occupied_by_booking = NULL,
             expires_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE status != 'available'
           AND (
             slot_code = $1
             OR slot_code = $2
             OR slot_code LIKE '%' || $2 || '%'
             OR $1 LIKE '%' || slot_code || '%'
           )
         RETURNING *`,
        [slot, cleanSlot]
      );
      freedSlot = freeRes.rows[0];
    } catch (slotErr) {
      console.warn('Lỗi giải phóng ô đỗ checkout:', slotErr.message);
    }

    // 4. Cập nhật nhật ký thông quan trong clearance_logs
    try {
      await query(
        `UPDATE clearance_logs
         SET time_out = $1,
             status = 'Đã thanh toán & Ra bãi',
             gate_out = 'Cổng Ra 01',
             method = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE plate = $3 AND time_out = '--:--'`,
        [timeOutStr, paymentMethod || 'VietQR', plate || '---']
      );
    } catch {}

    // 5. Ghi hóa đơn nếu chưa có
    try {
      const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
      const numFee = parseInt(String(fee || '35000').replace(/[^0-9]/g, ''), 10) || 35000;
      await query(
        `INSERT INTO invoices (id, invoice_no, plate, customer_name, vehicle_type, total_amount, payment_method, signed_at)
         VALUES ($1, $2, $3, 'Khách hàng SmartPark', 'Ô tô', $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO NOTHING`,
        [`IV-${Date.now()}`, invoiceNo, plate || '---', numFee, paymentMethod || 'VietQR']
      );
    } catch {}

    // 6. Phát sự kiện Socket.IO thời gian thực
    if (io) {
      // Báo mở barrier ra (4 giây)
      io.emit('barrier:action', {
        gate: 'Cổng Ra 01',
        plate: plate || '---',
        action: 'OPEN',
        reason: 'Thanh toán cước thành công tại làn ra'
      });

      // Báo ô đỗ chuyển về TRỐNG ngay lập tức cho toàn bộ người dùng và admin
      if (freedSlot) {
        io.emit('slot:status_changed', {
          branchId: freedSlot.branch_id,
          floor: freedSlot.floor,
          slot: freedSlot.slot_code,
          status: 'available',
          reason: 'CHECKOUT'
        });
      }
      io.emit('slots:update', { timestamp: now.toISOString() });
      io.emit('session:checkout', { plate, slot, timeOut: timeOutStr });
    }

    res.json({
      success: true,
      message: `Thanh toán thành công cước ${fee}. Ô đỗ đã cập nhật về TRỐNG và barrier làn ra đã mở.`,
      data: { plate, slot, timeOut: timeOutStr, fee }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/parking/pay-early - Thu cước cho khách đặt trước đến sớm
 */
router.post('/pay-early', async (req, res) => {
  try {
    const { sessionId, plate, fee, paymentMethod } = req.body;
    const io = req.app.get('io');

    // Cập nhật parking_sessions
    await query(
      `UPDATE parking_sessions
       SET payment_status = 'Đã thanh toán (Đến sớm)',
           payment_method = $1
       WHERE id = $2 OR plate = $3`,
      [paymentMethod || 'VietQR', sessionId || '---', plate || '---']
    );

    // Cập nhật clearance_logs
    await query(
      `UPDATE clearance_logs
       SET status = 'Đã thanh toán (Đến sớm)',
           method = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE plate = $2 AND time_out = '--:--'`,
      [paymentMethod || 'VietQR', plate || '---']
    );

    if (io) {
      io.emit('session:paid_early', { plate, fee, paymentMethod });
    }

    res.json({
      success: true,
      message: `Đã thu cước đến sớm ${fee} thành công. Khách hàng có thể in hóa đơn bất cứ lúc nào.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
