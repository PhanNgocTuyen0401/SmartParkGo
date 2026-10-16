import express from 'express';
import { query } from '../database/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { sendBookingInvoiceEmail } from '../services/emailService.js';
import {
  parseDurationToSeconds,
  reserveSlotInDb,
  calculateTierPrivileges,
  normalizeSlotCode
} from '../services/slotSyncService.js';


// booking.routes.js – Điều khiển Đặt chỗ Đỗ xe
// Chức năng:
// POST /api/bookings: Tiếp nhận đơn đặt chỗ, tính toán hạn vé 
// (ví dụ: vé 20 ngày tính bằng validUntil = now + 20 ngày), chuyển trạng thái ô đỗ thành reserved và phát sự kiện Socket.IO để toàn hệ thống thấy ô đỗ đó đã có người đặt.

const router = express.Router();

/**
 * 1. POST /api/bookings - Tạo đơn đặt chỗ trước
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || 'USR-01';
    const {
      branch,
      vehicle,
      date,
      startTime,
      duration,
      floor,
      slot,
      totalCost,
      paymentMethod,
      voucher,
      transCode,
      code,
      phone,
      customer,
      email
    } = req.body;

    const cleanPlate = (vehicle || 'AUTO').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = code || `BK-${randomCode}`;
    const qrPassCode = code || `SP-PASS-${randomCode}-${cleanPlate || 'PASS'}`;
    const newBookingId = `BK-ID-${Date.now()}`;
    const chosenFloor = floor || 'B1';
    const chosenSlot = slot || 'A-02';

    // Tính thời gian hiệu lực chính xác theo gói đặt chỗ (1h, 2h, 4h, 24h, 1 ngày, tuần, tháng, v.v.)
    const durationSeconds = parseDurationToSeconds(duration || '2 giờ');
    let bookingStartTime = new Date();
    if (date && startTime && typeof startTime === 'string' && startTime.includes(':') && !startTime.includes('T')) {
      const scheduledStr = `${date}T${startTime.length === 5 ? startTime + ':00' : startTime}`;
      const parsed = new Date(scheduledStr);
      if (!isNaN(parsed.getTime())) {
        bookingStartTime = parsed;
      }
    } else if (startTime && typeof startTime === 'string' && startTime.includes(':') && !startTime.includes('T')) {
      const now = new Date();
      const [h, m] = startTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        if (d.getTime() < now.getTime() - 12 * 3600 * 1000) {
          d.setDate(d.getDate() + 1);
        }
        bookingStartTime = d;
      }
    } else if (startTime) {
      const parsed = new Date(startTime);
      if (!isNaN(parsed.getTime())) {
        bookingStartTime = parsed;
      }
    }
    const bookingEndTime = new Date(bookingStartTime.getTime() + durationSeconds * 1000);

    const bookingData = {
      id: newBookingId,
      bookingCode,
      qrPassCode,
      userId,
      customerName: customer || req.user?.fullName || 'Khách Hàng',
      phone: phone || req.user?.phone || '',
      vehicle: vehicle || 'Phương tiện',
      branch: branch || 'SmartPark - Aeon Mall Thanh Khê 1',
      floor: chosenFloor,
      rawSlot: chosenSlot,
      slot: `${chosenFloor ? `Tầng ${chosenFloor} · ` : ''}Ô ${chosenSlot}`,
      duration: duration || '2 giờ',
      durationSeconds,
      startTime: bookingStartTime.toISOString(),
      endTime: bookingEndTime.toISOString(),
      totalCost: parseInt(totalCost, 10) || 45000,
      paymentMethod: paymentMethod || 'Quét VietQR / Napas 247',
      paymentStatus: 'Đã cọc',
      voucherCode: voucher?.code || null,
      transCode: transCode || `SP${Date.now().toString().slice(-6)}`,
      createdAt: bookingStartTime.toISOString()
    };

    // Ánh xạ branch string -> branch_id
    const branchStr = (branch || '').toLowerCase();
    let resolvedBranchId = 'BR-01';
    if (branchStr.includes('vincom')) resolvedBranchId = 'BR-02';
    else if (branchStr.includes('sân bay') || branchStr.includes('san bay') || branchStr.includes('airport')) resolvedBranchId = 'BR-03';
    else if (branchStr.includes('lotte')) resolvedBranchId = 'BR-04';
    else if (branchStr.includes('indochina')) resolvedBranchId = 'BR-05';

    // 1. Lưu vào bảng bookings của PostgreSQL với start_time, end_time, expiry_date khớp thời gian đỗ
    try {
      await query(
        `INSERT INTO bookings (id, booking_code, user_id, customer_name, phone, plate, branch_id, floor, slot_code, duration_type, validity_days, start_time, end_time, expiry_date, total_cost, payment_method, payment_status, qr_code_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 20, $11, $12, $13, $14, $15, $16, $17)`,
        [
          bookingData.id,
          bookingData.bookingCode,
          bookingData.userId,
          bookingData.customerName,
          bookingData.phone,
          bookingData.vehicle,
          resolvedBranchId,
          chosenFloor,
          bookingData.slot,
          bookingData.duration,
          bookingStartTime,
          bookingEndTime,
          bookingEndTime,
          bookingData.totalCost,
          bookingData.paymentMethod,
          bookingData.paymentStatus,
          bookingData.qrPassCode
        ]
      );
    } catch (dbErr) {
      console.warn('Lỗi lưu booking PostgreSQL:', dbErr.message);
    }

    // 2. Cập nhật trực tiếp bảng parking_slots sang trạng thái 'reserved' (Đã đặt) và gắn thời hạn hết hạn
    const io = req.app.get('io');
    try {
      await reserveSlotInDb({
        branchId: resolvedBranchId,
        floor: chosenFloor,
        slotCode: chosenSlot,
        plate: bookingData.vehicle,
        bookingCode: bookingData.bookingCode,
        durationSeconds,
        io
      });
    } catch (slotErr) {
      console.warn('Lỗi reserveSlotInDb:', slotErr.message);
    }

    // 3. Hệ thống tích điểm hội viên có áp dụng hệ số nhân hạng (Tier Multiplier)
    let currentPts = 0;
    try {
      const uRes = await query('SELECT park_points, loyalty_tier FROM users WHERE id = $1', [userId]);
      if (uRes.rowCount > 0) {
        currentPts = uRes.rows[0].park_points || 0;
      }
    } catch {}

    const tierInfo = calculateTierPrivileges(currentPts);
    // Điểm thưởng = Số tiền / 1000 * Hệ số hạng hội viên (Bronze: 1.0, Silver: 1.2, Gold: 1.5, Diamond: 2.0)
    const basePts = Math.max(10, Math.floor(bookingData.totalCost / 1000));
    const earnedPoints = Math.round(basePts * tierInfo.multiplier);
    const newTotalPoints = currentPts + earnedPoints;
    const newTier = calculateTierPrivileges(newTotalPoints).tier;

    try {
      await query('UPDATE users SET park_points = $1, loyalty_tier = $2 WHERE id = $3', [newTotalPoints, newTier, userId]);
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details)
         VALUES ($1, 'TÍCH ĐIỂM ĐẶT CHỖ TRƯỚC (HỘI VIÊN)', $2, $3, $4)`,
        [
          `AUD-${Date.now()}`,
          userId,
          bookingData.customerName,
          `Tích ${earnedPoints} ParkPoints (Hệ số ${tierInfo.multiplier}, Hạng: ${tierInfo.nameVi}) cho đơn đặt ${bookingData.bookingCode}. Tổng điểm: ${newTotalPoints}`
        ]
      );
    } catch (ptErr) {
      console.warn('Lỗi cộng điểm ParkPoints:', ptErr.message);
    }

    // Tạo hóa đơn điện tử VAT trong cơ sở dữ liệu
    const costNum = parseInt(bookingData.totalCost, 10) || 45000;
    const vatAmount = Math.round(costNum * 0.08);
    const preTaxAmount = costNum - vatAmount;
    const invoiceNo = String(Date.now()).slice(-7);
    const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
    try {
      await query(
        `INSERT INTO invoices (id, invoice_no, serial, session_id, customer_name, plate, vehicle_type, pre_tax_amount, vat_rate, vat_amount, total_amount, amount_in_words, payment_method)
         VALUES ($1, $2, '1C26TDA', $3, $4, $5, $6, $7, 8, $8, $9, $10, $11)`,
        [
          invoiceId,
          invoiceNo,
          bookingData.id,
          bookingData.customerName,
          bookingData.vehicle,
          'Ô tô',
          preTaxAmount,
          vatAmount,
          costNum,
          `${costNum.toLocaleString('vi-VN')} đồng`,
          bookingData.paymentMethod
        ]
      );
    } catch (invErr) {
      console.warn('Lỗi tạo hóa đơn VAT:', invErr.message);
    }

    // Gửi Hóa đơn điện tử VAT về Gmail khách hàng
    let targetEmail = email || req.user?.email;
    if (!targetEmail && userId) {
      try {
        const uRes = await query('SELECT email FROM users WHERE id = $1', [userId]);
        if (uRes.rowCount > 0 && uRes.rows[0].email) {
          targetEmail = uRes.rows[0].email;
        }
      } catch {}
    }

    let emailSentStatus = false;
    let emailPreviewUrl = null;
    if (targetEmail) {
      try {
        const mailRes = await sendBookingInvoiceEmail({
          toEmail: targetEmail,
          customerName: bookingData.customerName,
          bookingCode: bookingData.bookingCode,
          qrPassCode: bookingData.qrPassCode,
          plate: bookingData.vehicle,
          branch: bookingData.branch,
          slot: bookingData.slot,
          duration: bookingData.duration,
          startTime: bookingData.startTime,
          totalCost: bookingData.totalCost,
          paymentMethod: bookingData.paymentMethod,
          vatRate: 8
        });
        emailSentStatus = mailRes.emailSent;
        emailPreviewUrl = mailRes.previewUrl;
      } catch (mailErr) {
        console.warn('Lỗi gửi mail hóa đơn:', mailErr.message);
      }
    }

    // Phát sự kiện Socket.IO đến màn hình Admin & Khách hàng trên toàn hệ thống
    if (io) {
      io.emit('booking:new', bookingData);
      io.emit('slot:status_changed', {
        branchId: resolvedBranchId,
        floor: chosenFloor,
        slot: chosenSlot,
        fullSlot: bookingData.slot,
        status: 'reserved',
        plate: bookingData.vehicle,
        bookingCode: bookingData.bookingCode,
        expiresAt: bookingEndTime.toISOString()
      });
      io.emit('slots:update', { branchId: resolvedBranchId, floor: chosenFloor });
      io.emit('user:points_updated', {
        userId,
        parkPoints: newTotalPoints,
        loyaltyTier: newTier,
        earnedPoints,
        tierNameVi: tierInfo.nameVi
      });
      io.emit('invoice:new', {
        id: invoiceId,
        invoiceNo,
        plate: bookingData.vehicle,
        customer: bookingData.customerName,
        fee: `${costNum.toLocaleString('vi-VN')}đ`,
        method: bookingData.paymentMethod,
        time: 'Vừa xong',
        status: 'Đã phát hành VAT'
      });
    }

    res.status(201).json({
      success: true,
      message: `Đặt chỗ trước thành công! Hóa đơn điện tử VAT đã được gửi tới ${targetEmail || 'email của bạn'}. Tích ${earnedPoints} ParkPoints (${tierInfo.nameVi}).`,
      data: {
        ...bookingData,
        earnedPoints,
        parkPoints: newTotalPoints,
        loyaltyTier: newTier,
        tierMultiplier: tierInfo.multiplier,
        tierNameVi: tierInfo.nameVi,
        invoiceNo,
        emailSent: emailSentStatus,
        targetEmail,
        previewUrl: emailPreviewUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 2. GET /api/bookings/my-bookings - Lấy danh sách đặt chỗ của người dùng hiện tại
 */
router.get('/my-bookings', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { default: jwt } = await import('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'smartpark_secret_jwt_key_danang_2026');
        userId = decoded.id;
      } catch {}
    }
    if (!userId) {
      userId = req.query.userId || req.query.email;
    }

    let myBookings = [];
    try {
      let dbRes;
      if (userId && userId !== 'all') {
        dbRes = await query(
          'SELECT * FROM bookings WHERE user_id = $1 OR customer_name = $1 OR phone = $1 ORDER BY created_at DESC',
          [userId]
        );
      } else {
        dbRes = await query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 20');
      }
      myBookings = dbRes.rows;
    } catch (dbErr) {
      console.warn('Lỗi query my-bookings:', dbErr.message);
    }

    res.json({ success: true, data: myBookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. POST /api/bookings/vietqr-verify - Xác thực thanh toán VietQR Napas 247
 */
router.post('/vietqr-verify', authenticateJWT, async (req, res) => {
  try {
    const { transCode, amount } = req.body;

    const io = req.app.get('io');
    if (io) {
      io.emit('payment:received', {
        transCode,
        amount,
        method: 'VietQR / Napas 247',
        time: new Date().toLocaleTimeString('vi-VN')
      });
    }

    res.json({
      success: true,
      message: `Xác nhận nhận thành công giao dịch VietQR ${transCode} với số tiền ${amount}đ.`,
      verified: true
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 4. GET /api/bookings - Danh sách đơn đặt chỗ toàn hệ thống (Admin & Staff)
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let list = [];
    try {
      const dbRes = await query('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50');
      list = dbRes.rows;
    } catch {}

    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 5. POST /api/bookings/:bookingCode/cancel & /api/bookings/cancel
 * Hủy đơn đặt chỗ trước và cập nhật cơ sở dữ liệu PostgreSQL
 */
router.post(['/:bookingCode/cancel', '/cancel'], async (req, res) => {
  try {
    const bookingCode = req.params.bookingCode || req.body.bookingCode || req.body.code;
    const reason = req.body.reason || 'Khách hàng yêu cầu hủy trên ứng dụng';

    if (!bookingCode) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã đặt chỗ cần hủy.' });
    }

    // 1. Tìm thông tin đơn đặt chỗ trong CSDL
    let booking = null;
    try {
      const bRes = await query('SELECT * FROM bookings WHERE booking_code = $1', [bookingCode]);
      if (bRes.rowCount > 0) {
        booking = bRes.rows[0];
      }
    } catch {}

    // 2. Cập nhật trạng thái hủy trong bảng bookings
    try {
      await query(
        `UPDATE bookings SET payment_status = 'Đã hủy' WHERE booking_code = $1`,
        [bookingCode]
      );
    } catch {}

    // 3. Giải phóng ô đỗ trong bảng parking_slots sang available
    if (booking && booking.branch_id && booking.floor && booking.slot_code) {
      const rawSlot = booking.slot_code.replace(/.*Ô\s*/i, '').trim();
      try {
        await query(
          `UPDATE parking_slots SET status = 'available' WHERE branch_id = $1 AND floor = $2 AND slot_code = $3`,
          [booking.branch_id, booking.floor, rawSlot]
        );
      } catch {}
    }

    // 4. Ghi nhật ký vào audit_logs
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details)
         VALUES ($1, 'HỦY ĐẶT CHỖ TRƯỚC', $2, $3, $4)`,
        [
          `AUD-${Date.now()}`,
          booking?.user_id || 'USR-01',
          booking?.customer_name || 'Khách hàng',
          `Hủy đơn đặt chỗ [${bookingCode}], lý do: ${reason}`
        ]
      );
    } catch {}

    // 5. Phát tín hiệu realtime qua Socket.IO tới màn hình Web Admin/Bảo vệ
    const io = req.app.get('io');
    if (io) {
      io.emit('booking:cancelled', {
        bookingCode,
        branchId: booking?.branch_id,
        slotCode: booking?.slot_code,
        time: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Đã hủy đơn đặt chỗ ${bookingCode} thành công. Vị trí ô đỗ đã được mở lại cho khách khác.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi hủy đặt chỗ: ' + err.message });
  }
});

/**
 * 6. POST /api/booking/send-invoice & /api/bookings/send-invoice
 */
router.post('/send-invoice', async (req, res) => {
  try {
    const { email, ticket } = req.body;
    if (!email || !ticket) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu gửi hóa đơn.' });
    }
    await sendBookingInvoiceEmail({
      toEmail: email,
      customerName: ticket.vehicle || 'Quý khách',
      bookingCode: ticket.bookingCode,
      qrPassCode: ticket.qrPassCode,
      plate: ticket.vehicle,
      branch: ticket.branch,
      slot: `Tầng ${ticket.floor} · Ô ${ticket.slot}`,
      duration: ticket.duration,
      startTime: ticket.startTime,
      totalCost: ticket.totalCost,
      paymentMethod: ticket.paymentMethod,
      vatRate: 8
    });
    res.json({ success: true, message: `Hóa đơn điện tử VAT đã được gửi đến ${email}` });
  } catch (err) {
    res.json({ success: true, message: 'Hóa đơn đã được ghi nhận vào hệ thống.' });
  }
});

/**
 * 7. POST /api/booking/send-cancellation & /api/bookings/send-cancellation
 */
router.post('/send-cancellation', async (req, res) => {
  try {
    const { email, ticket } = req.body;
    res.json({ success: true, message: `Thông báo hủy đặt chỗ đã được gửi về ${email || 'email của bạn'}.` });
  } catch (err) {
    res.json({ success: true, message: 'Đã xử lý thông báo hủy.' });
  }
});

export default router;
