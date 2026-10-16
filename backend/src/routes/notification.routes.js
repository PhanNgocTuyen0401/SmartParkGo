import express from 'express';
import { query } from '../database/db.js';

const router = express.Router();

/**
 * 1. GET /api/notifications - Lấy danh sách thông báo từ hệ thống
 */
router.get('/', async (req, res) => {
  try {
    const dbRes = await query(`
      SELECT 
        id, 
        type, 
        title, 
        title_en as "titleEn", 
        message, 
        message_en as "messageEn", 
        audience, 
        voucher_code as "voucherCode", 
        voucher_data as "voucherData", 
        sender, 
        unread, 
        created_at as "createdAt",
        TO_CHAR(created_at, 'HH24:MI DD/MM') as "time"
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const list = dbRes.rows.map((row) => {
      let voucher = null;
      if (row.voucherData) {
        try {
          voucher = typeof row.voucherData === 'string' ? JSON.parse(row.voucherData) : row.voucherData;
        } catch {}
      }
      return {
        ...row,
        voucher,
        time: row.time || 'Vừa xong',
        timeEn: row.time || 'Just now'
      };
    });

    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 2. PATCH /api/notifications/:id/read - Đánh dấu thông báo đã đọc
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE notifications SET unread = FALSE WHERE id = $1', [id]);
    res.json({ success: true, message: 'Đã đánh dấu thông báo đã đọc' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. POST /api/notifications/mark-all-read - Đánh dấu tất cả thông báo đã đọc
 */
router.post('/mark-all-read', async (req, res) => {
  try {
    await query('UPDATE notifications SET unread = FALSE');
    res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo đã đọc' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 4. DELETE /api/notifications/:id - Xóa 1 thông báo
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ success: true, message: 'Đã xóa thông báo' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 5. DELETE /api/notifications - Xóa tất cả thông báo
 */
router.delete('/', async (req, res) => {
  try {
    await query('DELETE FROM notifications');
    res.json({ success: true, message: 'Đã xóa toàn bộ thông báo' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
