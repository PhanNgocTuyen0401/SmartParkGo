import express from 'express';
import { query } from '../database/db.js';
import { authenticateJWT } from '../middleware/auth.js';


// Quản lý đổi điểm thưởng ParkPoints lấy mã giảm giá và trung tâm thông báo đẩy của người dùng.

const router = express.Router();

/**
 * 1. GET /api/vouchers/catalog - Lấy toàn bộ voucher khuyến mãi & danh mục đổi điểm do Admin tạo
 * (Lưu ý: Không hiển thị WELCOME20K ở catalog chung vì đây là voucher tặng riêng ví cá nhân khi mở tài khoản)
 */
router.get(['/', '/catalog'], async (req, res) => {
  try {
    let vouchers = [];
    try {
      const dbRes = await query(
        "SELECT * FROM vouchers WHERE status = 'Kích hoạt' ORDER BY pts_cost ASC"
      );
      vouchers = dbRes.rows.map(v => ({
        id: v.id,
        code: v.code,
        title: v.title,
        description: v.conditions || v.title,
        discountType: v.discount_type === 'percent' ? 'percentage' : 'fixed',
        discountValue: parseInt(v.discount_val, 10) || 0,
        pointsRequired: v.pts_cost || 0,
        validUntil: v.expiry_date || '31/12/2026',
        minSpend: v.min_order_val || 0,
        ...v
      }));
    } catch {
      vouchers = [];
    }

    res.json({
      success: true,
      data: vouchers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 2. GET /api/vouchers/my-vouchers - Lấy danh sách voucher đã lưu trong ví của người dùng
 */
router.get('/my-vouchers', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || 'USR-01';
    let myVouchers = [];

    try {
      const dbRes = await query(
        'SELECT * FROM user_vouchers WHERE user_id = $1 ORDER BY claimed_at DESC',
        [userId]
      );
      myVouchers = dbRes.rows;
    } catch {
      myVouchers = [];
    }

    res.json({
      success: true,
      data: myVouchers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. POST /api/vouchers/redeem - Đổi điểm thưởng lấy voucher (đã có trong DB)
 */
router.post('/redeem', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || 'USR-01';
    const { code, cost } = req.body;

    if (!code || cost === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu mã voucher hoặc số điểm quy đổi.' });
    }

    const upperCode = code.toUpperCase().trim();

    // 1. Kiểm tra voucher trong DB
    const vRes = await query("SELECT * FROM vouchers WHERE code = $1 AND status = 'Kích hoạt'", [upperCode]);
    if (vRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: `Voucher ${upperCode} không tồn tại hoặc đã bị đóng.` });
    }
    const vInfo = vRes.rows[0];

    // 2. Kiểm tra người dùng đã sở hữu voucher này và chưa dùng chưa
    const checkRes = await query(
      'SELECT 1 FROM user_vouchers WHERE user_id = $1 AND voucher_code = $2 AND is_used = 0',
      [userId, upperCode]
    );
    if (checkRes.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Bạn đã đổi mã ${upperCode} rồi và đang có trong ví! Hãy sử dụng trước khi đổi tiếp.`
      });
    }

    // 3. Kiểm tra số dư điểm
    const userRes = await query('SELECT park_points FROM users WHERE id = $1', [userId]);
    const currentPts = userRes.rows[0]?.park_points || 0;
    if (currentPts < cost) {
      return res.status(400).json({
        success: false,
        message: `Số điểm ParkPoints hiện tại (${currentPts}) không đủ để đổi ưu đãi này (${cost} pts).`
      });
    }

    // 4. Trừ điểm
    const newPts = currentPts - cost;
    await query('UPDATE users SET park_points = $1 WHERE id = $2', [newPts, userId]);

    // 5. Thêm vào ví
    const newVoucherId = `UV-${Date.now()}`;
    const numVal = parseInt(String(vInfo.discount_val).replace(/\D/g, ''), 10) || 20000;

    await query(
      `INSERT INTO user_vouchers (id, user_id, voucher_code, title, discount_type, discount_val, pts_cost, source, is_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'redeemed', 0)`,
      [newVoucherId, userId, upperCode, vInfo.title, vInfo.discount_type || 'fixed', numVal, cost]
    );

    return res.json({
      success: true,
      message: `Đổi thành công voucher ${upperCode}! -${cost} ParkPoints.`,
      data: {
        id: newVoucherId,
        code: upperCode,
        remainingPoints: newPts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 4. POST /api/vouchers/claim - Thu thập mã khuyến mãi miễn phí (0 pts)
 */
router.post('/claim', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || 'USR-01';
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Thiếu mã voucher.' });
    }

    const upperCode = code.toUpperCase().trim();

    // Tra cứu voucher từ DB
    const vRes = await query("SELECT * FROM vouchers WHERE code = $1 AND status = 'Kích hoạt'", [upperCode]);
    if (vRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: `Mã ${upperCode} không tồn tại hoặc đã hết hạn.` });
    }
    const vInfo = vRes.rows[0];

    const checkRes = await query(
      'SELECT 1 FROM user_vouchers WHERE user_id = $1 AND voucher_code = $2 AND is_used = 0',
      [userId, upperCode]
    );
    if (checkRes.rowCount > 0) {
      return res.status(400).json({ success: false, message: `Mã ${upperCode} đã có trong ví của bạn.` });
    }

    const newId = `UV-${Date.now()}`;
    const numVal = parseInt(String(vInfo.discount_val).replace(/\D/g, ''), 10) || 20000;

    await query(
      `INSERT INTO user_vouchers (id, user_id, voucher_code, title, discount_type, discount_val, source, is_used)
       VALUES ($1, $2, $3, $4, $5, $6, 'claimed', 0)`,
      [newId, userId, upperCode, vInfo.title, vInfo.discount_type || 'fixed', numVal]
    );

    res.json({
      success: true,
      message: `Đã lưu thành công mã ${upperCode} vào ví của bạn!`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 5. POST /api/vouchers/apply-code - Nhập mã ưu đãi từ PostgreSQL
 */
router.post('/apply-code', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || 'USR-01';
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã ưu đãi.' });
    }

    const upperCode = code.trim().toUpperCase();

    // Tra cứu mã thực tế từ PostgreSQL
    const vRes = await query("SELECT * FROM vouchers WHERE UPPER(code) = $1 AND status = 'Kích hoạt'", [upperCode]);
    if (vRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Mã ưu đãi "${upperCode}" không tồn tại hoặc đã hết hạn.`
      });
    }

    const voucherData = vRes.rows[0];

    const checkRes = await query(
      'SELECT 1 FROM user_vouchers WHERE user_id = $1 AND voucher_code = $2 AND is_used = 0',
      [userId, upperCode]
    );
    if (checkRes.rowCount > 0) {
      return res.status(400).json({ success: false, message: `Mã ${upperCode} đã có trong ví của bạn!` });
    }

    const newId = `UV-${Date.now()}`;
    const numVal = parseInt(String(voucherData.discount_val).replace(/\D/g, ''), 10) || 20000;

    await query(
      `INSERT INTO user_vouchers (id, user_id, voucher_code, title, discount_type, discount_val, source, is_used)
       VALUES ($1, $2, $3, $4, $5, $6, 'code', 0)`,
      [newId, userId, upperCode, voucherData.title, voucherData.discount_type || 'fixed', numVal]
    );

    res.json({
      success: true,
      message: `Nhận thành công ưu đãi: ${voucherData.title}!`,
      data: {
        code: upperCode,
        title: voucherData.title,
        discount_val: numVal,
        discount_type: voucherData.discount_type,
        min_order_val: voucherData.min_order_val || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 6. POST /api/vouchers/use - Đánh dấu voucher đã dùng
 */
router.post('/use', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id || 'USR-01';
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Thiếu mã voucher.' });
    }

    await query(
      `UPDATE user_vouchers SET is_used = 1, used_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND voucher_code = $2 AND is_used = 0`,
      [userId, code.trim().toUpperCase()]
    );

    res.json({ success: true, message: `Voucher ${code} đã được áp dụng thành công.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 7. POST /api/vouchers/claim-tier-perks - Thực thi nhận voucher đặc quyền hội viên
 */
router.post('/claim-tier-perks', authenticateJWT, async (req, res) => {
  try {
    let userId = req.body?.userId || req.user?.id;
    if (userId) {
      const check = await query('SELECT id FROM users WHERE id = $1', [userId]);
      if (check.rowCount === 0) userId = null;
    }
    if (!userId) {
      const firstUser = await query('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
      userId = firstUser.rows[0]?.id;
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy thông tin tài khoản người dùng.' });
    }

    // Lấy thông tin điểm và hạng hội viên hiện tại
    const userRes = await query('SELECT park_points, loyalty_tier, full_name FROM users WHERE id = $1', [userId]);
    const userData = userRes.rows[0] || { park_points: 0, loyalty_tier: 'bronze' };
    const parkPoints = userData.park_points || 0;

    let tier = 'bronze';
    let tierName = 'Hội Viên Chuẩn (Đồng)';
    let grantedVouchers = [];

    if (parkPoints >= 6500) {
      tier = 'diamond';
      tierName = 'Hội Viên Kim Cương (Diamond)';
      grantedVouchers = [
        { code: `DIAMOND40-A`, title: 'Đặc quyền Kim Cương - Giảm 40% Đỗ Xe #1', type: 'percent', val: 40, minVal: 0 },
        { code: `DIAMOND40-B`, title: 'Đặc quyền Kim Cương - Giảm 40% Đỗ Xe #2', type: 'percent', val: 40, minVal: 0 },
        { code: `DIAMOND40-C`, title: 'Đặc quyền Kim Cương - Giảm 40% Đỗ Xe #3', type: 'percent', val: 40, minVal: 0 },
        { code: `DIAMOND40-D`, title: 'Đặc quyền Kim Cương - Giảm 40% Đỗ Xe #4', type: 'percent', val: 40, minVal: 0 },
        { code: `DIAMOND-FREE`, title: 'Đặc quyền Kim Cương - Miễn Phí 1 Ngày Đỗ Xe (150K)', type: 'fixed', val: 150000, minVal: 0 }
      ];
    } else if (parkPoints >= 3000) {
      tier = 'gold';
      tierName = 'Hội Viên Vàng (Gold)';
      grantedVouchers = [
        { code: `GOLD25-A`, title: 'Đặc quyền Hội Viên Vàng - Giảm 25% Đỗ Xe #1', type: 'percent', val: 25, minVal: 0 },
        { code: `GOLD25-B`, title: 'Đặc quyền Hội Viên Vàng - Giảm 25% Đỗ Xe #2', type: 'percent', val: 25, minVal: 0 }
      ];
    } else if (parkPoints >= 700) {
      tier = 'silver';
      tierName = 'Hội Viên Bạc (Silver)';
      grantedVouchers = [
        { code: `SILVER15`, title: 'Đặc quyền Hội Viên Bạc - Giảm 15% Đỗ Xe', type: 'percent', val: 15, minVal: 0 }
      ];
    } else {
      grantedVouchers = [
        { code: `WELCOME20K`, title: 'Quà Chào Mừng Hội Viên Chuẩn - Giảm 20.000đ', type: 'fixed', val: 20000, minVal: 20000 }
      ];
    }

    let newlyAddedCount = 0;
    for (const v of grantedVouchers) {
      // Đảm bảo voucher tồn tại trong bảng vouchers
      try {
        await query(
          `INSERT INTO vouchers (code, title, discount_type, discount_val, min_order_val, pts_cost, status, is_hidden)
           VALUES ($1, $2, $3, $4, $5, 0, 'Kích hoạt', TRUE)
           ON CONFLICT (code) DO NOTHING`,
          [v.code, v.title, v.type, v.val, v.minVal || 0]
        );
      } catch {}

      // Kiểm tra xem đã có mã chưa dùng trong ví chưa
      const exist = await query(
        'SELECT 1 FROM user_vouchers WHERE user_id = $1 AND voucher_code = $2 AND is_used = 0',
        [userId, v.code]
      );
      if (exist.rowCount === 0) {
        await query(
          `INSERT INTO user_vouchers (id, user_id, voucher_code, title, discount_type, discount_val, source, is_used)
           VALUES ($1, $2, $3, $4, $5, $6, 'tier_perk', 0)`,
          [`UV-TIER-${Date.now()}-${Math.floor(Math.random() * 1000)}`, userId, v.code, v.title, v.type, v.val]
        );
        newlyAddedCount++;
      }
    }

    // Ghi nhật ký hệ thống
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details)
         VALUES ($1, 'KÍCH HOẠT ĐẶC QUYỀN HỘI VIÊN', $2, $3, $4)`,
        [
          `AUD-${Date.now()}`,
          userId,
          userData.full_name || 'Khách hàng',
          `Kích hoạt đặc quyền hạng ${tierName} (${parkPoints} pts). Cấp mới ${newlyAddedCount} voucher đặc quyền vào ví.`
        ]
      );
    } catch {}

    res.json({
      success: true,
      message: newlyAddedCount > 0
        ? `Chúc mừng bạn! Đã kích hoạt và thêm ${newlyAddedCount} voucher đặc quyền hạng ${tierName} vào ví cá nhân.`
        : `Tất cả voucher đặc quyền của hạng ${tierName} đã có sẵn trong ví của bạn!`,
      data: {
        tier,
        tierName,
        parkPoints,
        newlyAddedCount,
        vouchers: grantedVouchers
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
