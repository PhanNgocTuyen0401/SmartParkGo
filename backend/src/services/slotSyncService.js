import { query } from '../database/db.js';

/**
 * Phân tích chuỗi duration thành số giây
 * Hỗ trợ: "1 giờ", "2 giờ", "4 giờ", "24 giờ", "Vé ngày", "Gói Tuần", "Gói Tháng", "1 phút", "2 phút"
 */

// slotSyncService.js – Tự động Đồng bộ Ô đỗ & Phạt Xe Quá Giờ
// Chức năng: Chứa logic tự động hóa cao cấp nhất của bãi xe:
// syncAndExpireSlots(): Quét bảng bookings, nếu đơn đặt trước đã quá hạn hẹn mà khách không đến, tự động chuyển thành Hết hạn và nhả ô đỗ về available (sẵn sàng cho người khác đặt).
// detectAndNotifyOverstay(): Quét bảng parking_sessions, phát hiện các phương tiện đỗ quá số giờ đã mua, tự động tính phụ phí quá giờ (15.000đ/giờ) và bắn thông báo cảnh báo khẩn cấp tới nhân viên bốt trực.


export function parseDurationToSeconds(durationStr = '') {
  const str = String(durationStr).toLowerCase().trim();

  // Test minutes support: "1 phút", "2 phút", "5 phút"
  const minMatch = str.match(/(\d+)\s*(phút|minute|m)/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    return Math.max(10, mins * 60);
  }

  // Hours: "1 giờ", "2 giờ", "4 giờ"
  const hourMatch = str.match(/(\d+)\s*(giờ|hour|h)/i);
  if (hourMatch) {
    const hrs = parseInt(hourMatch[1], 10);
    return hrs * 3600;
  }

  // Days: "1 ngày", "24 giờ", "vé ngày", "day"
  if (str.includes('ngày') || str.includes('day') || str.includes('24h') || str.includes('24 giờ')) {
    const dayMatch = str.match(/(\d+)\s*ngày/i);
    const days = dayMatch ? parseInt(dayMatch[1], 10) : 1;
    return days * 86400;
  }

  // Weeks: "gói tuần", "1 tuần", "week"
  if (str.includes('tuần') || str.includes('week')) {
    return 7 * 86400;
  }

  // Months: "gói tháng", "1 tháng", "month"
  if (str.includes('tháng') || str.includes('month')) {
    return 30 * 86400;
  }

  // Mặc định 2 giờ
  return 7200;
}

/**
 * Chuẩn hóa mã ô đỗ theo định dạng của parking_slots (VD: "B1-A02", "B2-B08", "G-03")
 */
export function normalizeSlotCode(floor = 'B1', rawSlot = '') {
  let s = String(rawSlot).trim();
  // Loại bỏ tiền tố "Ô ", "Tầng ... · "
  s = s.replace(/Tầng\s+[A-Za-z0-9]+\s*·\s*/i, '');
  s = s.replace(/^Ô\s*/i, '').trim();

  // Nếu đã chứa dấu gạch và floor tương ứng (vd B1-A01, G-01)
  if (s.includes('-')) {
    if (s.startsWith(`${floor}-`)) return s;
    if (s.startsWith('G-') && floor === 'G') return s;
    return `${floor}-${s}`;
  }

  // Ghép floor vào
  return `${floor}-${s}`;
}

/**
 * Tự động đồng bộ và giải phóng ô đỗ hết hạn thời gian thực
 * Chạy định kỳ hoặc khi có request tra cứu trạng thái ô đỗ
 */
export async function syncAndExpireSlots(io) {
  try {
    const now = new Date();

    // 1. Cập nhật các đơn đặt chỗ đã quá hạn đỗ xe
    const expiredBookings = await query(
      `UPDATE bookings
       SET payment_status = 'Hết hạn'
       WHERE payment_status IN ('Đã cọc', 'Đang giữ chỗ')
         AND (
           (end_time IS NOT NULL AND end_time <= CURRENT_TIMESTAMP)
           OR (expiry_date IS NOT NULL AND expiry_date <= CURRENT_TIMESTAMP)
         )
       RETURNING id, booking_code, branch_id, floor, slot_code, plate`,
      []
    );

    // 2. Tự động giải phóng các ô đỗ trong bảng parking_slots khi đặt chỗ hết hạn nhưng khách không đến (expires_at <= now)
    // LƯU Ý NGHIỆP VỤ: Nếu khách đã vào bãi (đang đỗ) hoặc đang thu thêm phụ phí quá giờ, ô đỗ VẪN GIỮ NGUYÊN trạng thái 'occupied', tuyệt đối không giải phóng về trống!
    const releasedSlots = await query(
      `UPDATE parking_slots
       SET status = 'available',
           occupied_by_plate = NULL,
           occupied_by_booking = NULL,
           expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE status = 'reserved'
         AND expires_at IS NOT NULL
         AND expires_at <= CURRENT_TIMESTAMP
         AND NOT EXISTS (
           SELECT 1 FROM parking_sessions ps
           WHERE (ps.slot_code = parking_slots.slot_code OR parking_slots.slot_code LIKE '%' || ps.slot_code || '%' OR ps.slot_code LIKE '%' || parking_slots.slot_code || '%')
             AND ps.status = 'Đang đỗ'
         )
       RETURNING slot_code, branch_id, floor`,
      []
    );

    // 3. Giải phóng ô đỗ về TRỐNG ngay lập tức khi xe đã làm thủ tục ra bãi (Hoàn tất / Đã ra bãi)
    const checkedOutRelease = await query(
      `UPDATE parking_slots
       SET status = 'available',
           occupied_by_plate = NULL,
           occupied_by_booking = NULL,
           expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE status != 'available'
         AND EXISTS (
           SELECT 1 FROM parking_sessions ps
           WHERE (ps.slot_code = parking_slots.slot_code OR parking_slots.slot_code LIKE '%' || ps.slot_code || '%' OR ps.slot_code LIKE '%' || parking_slots.slot_code || '%')
             AND ps.status IN ('Đã thanh toán', 'Hoàn tất', 'Đã ra bãi')
         )
         AND NOT EXISTS (
           SELECT 1 FROM parking_sessions ps2
           WHERE (ps2.slot_code = parking_slots.slot_code OR parking_slots.slot_code LIKE '%' || ps2.slot_code || '%' OR ps2.slot_code LIKE '%' || parking_slots.slot_code || '%')
             AND ps2.status = 'Đang đỗ'
         )
       RETURNING slot_code, branch_id, floor`,
      []
    );

    // Nếu có ô đỗ nào vừa được giải phóng về trạng thái trống
    const totalReleased = (releasedSlots.rowCount || 0) + (checkedOutRelease.rowCount || 0);
    if (totalReleased > 0 && io) {
      console.log(`♻️ [SlotSync] Tự động giải phóng ${totalReleased} ô đỗ về trạng thái [TRỐNG].`);

      const allFreed = [...(releasedSlots.rows || []), ...(checkedOutRelease.rows || [])];
      for (const slot of allFreed) {
        io.emit('slot:status_changed', {
          branchId: slot.branch_id,
          floor: slot.floor,
          slot: slot.slot_code,
          status: 'available',
          reason: 'CHECKOUT_OR_EXPIRED'
        });
      }

      io.emit('slots:update', {
        timestamp: now.toISOString(),
        count: totalReleased
      });
    }

    // 4. Phát hiện các phương tiện đỗ quá giờ đặt trước và thông báo thời gian thực
    await detectAndNotifyOverstay(io);

    return {
      expiredBookingsCount: expiredBookings.rowCount || 0,
      releasedSlotsCount: releasedSlots.rowCount || 0
    };
  } catch (err) {
    console.error('❌ Lỗi trong syncAndExpireSlots:', err.message);
    return { error: err.message };
  }
}

/**
 * Đặt giữ chỗ ô đỗ trong cơ sở dữ liệu PostgreSQL
 */
export async function reserveSlotInDb({
  branchId = 'BR-01',
  floor = 'B1',
  slotCode = 'A-02',
  plate = '',
  bookingCode = '',
  durationSeconds = 7200,
  io = null
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationSeconds * 1000);
  const normalizedCode = normalizeSlotCode(floor, slotCode);
  const cleanSlotNum = slotCode.replace(/^Ô\s*/i, '').replace(/^[A-Za-z0-9]+-/, '').trim();

  try {
    // Cập nhật trạng thái ô đỗ thành 'reserved' (Đã đặt)
    const updateRes = await query(
      `UPDATE parking_slots
       SET status = 'reserved',
           occupied_by_plate = $1,
           occupied_by_booking = $2,
           expires_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE (branch_id = $4 OR $4 = 'all')
         AND (
           slot_code = $5
           OR slot_code = $6
           OR slot_code LIKE '%' || $7 || '%'
         )
       RETURNING *`,
      [plate, bookingCode, expiresAt, branchId, normalizedCode, slotCode, cleanSlotNum]
    );

    let updatedSlot = updateRes.rows[0];

    // Nếu chưa có dòng tương ứng trong parking_slots thì tạo mới
    if (!updatedSlot) {
      const insertRes = await query(
        `INSERT INTO parking_slots (id, branch_id, slot_code, floor, slot_type, status, occupied_by_plate, occupied_by_booking, expires_at, updated_at)
         VALUES ($1, $2, $3, $4, 'car', 'reserved', $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE
         SET status = 'reserved',
             occupied_by_plate = EXCLUDED.occupied_by_plate,
             occupied_by_booking = EXCLUDED.occupied_by_booking,
             expires_at = EXCLUDED.expires_at,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [`PS-${branchId}-${normalizedCode}`, branchId, normalizedCode, floor, plate, bookingCode, expiresAt]
      );
      updatedSlot = insertRes.rows[0];
    }

    // Phát sự kiện cập nhật thời gian thực qua Socket.IO tới toàn bộ Client (Admin & User)
    if (io) {
      io.emit('slot:status_changed', {
        branchId,
        floor,
        slot: normalizedCode,
        rawSlot: slotCode,
        status: 'reserved',
        plate,
        bookingCode,
        expiresAt: expiresAt.toISOString()
      });
      io.emit('slots:update', { branchId, floor });
    }

    return {
      success: true,
      slot: updatedSlot,
      normalizedCode,
      expiresAt
    };
  } catch (err) {
    console.error('❌ Lỗi đặt giữ chỗ ô đỗ:', err.message);
    throw err;
  }
}

/**
 * Tính toán đặc quyền hội viên dựa trên điểm tích lũy
 * Hạng Chuẩn (Đồng): 0 - 699 pts
 * Hạng Bạc (Silver): 700 - 2999 pts
 * Hạng Vàng (Gold): 3000 - 6499 pts
 * Hạng Kim Cương (Diamond): 6500+ pts
 */
export function calculateTierPrivileges(parkPoints = 0) {
  const pts = Number(parkPoints) || 0;
  if (pts >= 6500) {
    return {
      tier: 'diamond',
      nameVi: 'Hội Viên Kim Cương (Diamond)',
      nameEn: 'Diamond Member',
      multiplier: 2.0,
      discountPercent: 15,
      vipSurchargeWaived: true,
      holdTimeMinutes: 45
    };
  }
  if (pts >= 3000) {
    return {
      tier: 'gold',
      nameVi: 'Hội Viên Vàng (Gold)',
      nameEn: 'Gold Member',
      multiplier: 1.5,
      discountPercent: 10,
      vipSurchargeWaived: true,
      holdTimeMinutes: 30
    };
  }
  if (pts >= 700) {
    return {
      tier: 'silver',
      nameVi: 'Hội Viên Bạc (Silver)',
      nameEn: 'Silver Member',
      multiplier: 1.2,
      discountPercent: 5,
      vipSurchargeWaived: false,
      holdTimeMinutes: 25
    };
  }
  return {
    tier: 'bronze',
    nameVi: 'Hội Viên Chuẩn (Đồng)',
    nameEn: 'Bronze Member',
    multiplier: 1.0,
    discountPercent: 0,
    vipSurchargeWaived: false,
    holdTimeMinutes: 15
  };
}

// Lưu trữ timestamp lần gần nhất gửi thông báo quá giờ để tránh gửi liên tục
const lastNotifiedOverstayMap = new Map();

/**
 * Phát hiện các phương tiện đặt trước đỗ quá giờ và gửi thông báo thời gian thực về tài khoản khách hàng
 */
export async function detectAndNotifyOverstay(io) {
  try {
    const now = new Date();

    // 1. Tìm các lượt đỗ xe / đơn đặt chỗ đang trong bãi mà thời gian hiện tại đã vượt quá end_time
    const overstayRes = await query(
      `SELECT b.id as booking_id, b.booking_code, b.user_id, b.customer_name, b.plate, b.slot_code,
              b.branch_id, b.end_time, b.expiry_date, b.total_cost, b.phone,
              ps.id as session_id, ps.status as session_status, ps.checkin_time, ps.fee
       FROM bookings b
       LEFT JOIN parking_sessions ps ON ps.ticket_code = b.booking_code OR ps.plate = b.plate
       WHERE (
         b.payment_status IN ('Đã vào bãi', 'Đang giữ chỗ', 'Đã cọc', 'Đã vào bãi (Đến sớm)')
         OR (ps.status = 'Đang đỗ' AND ps.status IS NOT NULL)
       )
       AND (
         (b.end_time IS NOT NULL AND b.end_time < CURRENT_TIMESTAMP)
         OR (ps.expected_checkout IS NOT NULL AND ps.expected_checkout < CURRENT_TIMESTAMP)
       )`,
      []
    );

    if (overstayRes.rowCount === 0) return { overstayCount: 0 };

    for (const row of overstayRes.rows) {
      const scheduledEnd = row.end_time ? new Date(row.end_time) : new Date(now.getTime() - 60000);
      const overstayMs = Math.max(0, now.getTime() - scheduledEnd.getTime());
      const overstayMinutes = Math.max(1, Math.floor(overstayMs / 60000));
      const overstayHours = Math.ceil(overstayMinutes / 60);
      const surcharge = overstayHours * 15000; // 15.000đ/giờ quá hạn

      // Cập nhật số phút quá hạn và phụ phí vào bảng bookings và parking_sessions
      try {
        await query(
          `UPDATE bookings
           SET is_overstay = TRUE,
               overstay_minutes = $1,
               overstay_surcharge = $2
           WHERE id = $3`,
          [overstayMinutes, surcharge, row.booking_id]
        );

        if (row.session_id) {
          await query(
            `UPDATE parking_sessions
             SET is_overstay = TRUE,
                 overstay_minutes = $1,
                 overstay_surcharge = $2
             WHERE id = $3`,
            [overstayMinutes, surcharge, row.session_id]
          );
        }
      } catch (err) {
        console.warn('Lỗi cập nhật overstay DB:', err.message);
      }

      // Giới hạn gửi thông báo: chỉ gửi thông báo mới sau mỗi 10 phút để không làm phiền khách hàng
      const notifKey = `${row.booking_code || row.plate}`;
      const lastSent = lastNotifiedOverstayMap.get(notifKey) || 0;
      const shouldNotify = now.getTime() - lastSent > 10 * 60 * 1000; // 10 phút

      if (shouldNotify) {
        lastNotifiedOverstayMap.set(notifKey, now.getTime());

        const notifId = `NOTI-OVERSTAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const title = '⚠️ CẢNH BÁO: ĐÃ QUÁ THỜI GIAN ĐỖ XE ĐẶT TRƯỚC';
        const titleEn = '⚠️ WARNING: RESERVED PARKING TIME EXCEEDED';
        const message = `Phương tiện ${row.plate} tại vị trí ${row.slot_code || 'ô đỗ'} đã vượt quá khung giờ đặt chỗ ${overstayMinutes} phút. Hệ thống đang tính phụ phí quá giờ tạm tính: ${surcharge.toLocaleString('vi-VN')}đ (15.000đ/giờ). Vui lòng di chuyển xe ra cổng hoặc liên hệ nhân viên bốt để được hỗ trợ.`;
        const messageEn = `Vehicle ${row.plate} at ${row.slot_code || 'spot'} has exceeded the reserved booking window by ${overstayMinutes} minutes. An overtime surcharge of ${surcharge.toLocaleString('vi-VN')} VND (15,000 VND/hour) is being calculated. Please proceed to the exit gate or contact station staff.`;

        try {
          await query(
            `INSERT INTO notifications (id, type, title, title_en, message, message_en, audience, unread, created_at)
             VALUES ($1, 'warning', $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)`,
            [notifId, title, titleEn, message, messageEn, row.user_id || 'all']
          );
        } catch (notifErr) {
          console.warn('Lỗi ghi notification overstay vào DB:', notifErr.message);
        }

        if (io) {
          io.emit('notification:new', {
            id: notifId,
            type: 'warning',
            title,
            titleEn,
            message,
            messageEn,
            unread: true,
            time: 'Vừa xong',
            timeEn: 'Just now',
            userId: row.user_id
          });

          io.emit('booking:overstay', {
            bookingCode: row.booking_code,
            plate: row.plate,
            slot: row.slot_code,
            overstayMinutes,
            overstaySurcharge: surcharge,
            userId: row.user_id
          });
        }
      }
    }

    return { overstayCount: overstayRes.rowCount };
  } catch (err) {
    console.error('❌ Lỗi trong detectAndNotifyOverstay:', err.message);
    return { error: err.message };
  }
}

