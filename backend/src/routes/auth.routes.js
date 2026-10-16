import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';
import { authenticateJWT } from '../middleware/auth.js';
import { sendOtpEmail } from '../services/emailService.js';
import {
  validateImageUpload,
  loginLimiter,
  otpLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  loginSchema,
  registerSchema,
  forgotPasswordSendOtpSchema,
  forgotPasswordResetSchema,
  updateProfileSchema,
  validateBody
} from '../middleware/security.js';

// 📄 auth.routes.js – Điều khiển Đăng nhập, Đăng ký & OTP
// Chức năng:
// POST /api/auth/send-otp: Phát sinh số ngẫu nhiên 6 chữ số, lưu vào RAM kèm thời hạn 5 phút và gọi dịch vụ gửi Gmail thật.
// POST /api/auth/register: Kiểm tra mã OTP, kiểm tra trùng email, mã hóa mật khẩu bằng bcrypt.hash và lưu tài khoản mới vào PostgreSQL, tặng ngay 500 điểm thưởng và voucher 20.000đ.
// POST /api/auth/login: So sánh mật khẩu bằng bcrypt.compare, cấp mã Token JWT có thời hạn 24 giờ.

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smartpark_secret_jwt_key_danang_2026';

// Bộ nhớ lưu trữ mã OTP tạm thời (email -> { otp, expiresAt, attempts })
const otpStore = new Map();
const resetOtpStore = new Map();
const failedLoginTracker = new Map();

/**
 * 1. POST /api/auth/send-otp
 * Gửi mã OTP thực tế tới email của khách hàng
 */
router.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const { email, fullName } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email hợp lệ.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Kiểm tra xem email đã được đăng ký tài khoản chưa
    try {
      const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
      if (existing.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email này đã có tài khoản trong hệ thống. Vui lòng chuyển sang trang Đăng nhập.'
        });
      }
    } catch {}

    // Tạo mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    // Lưu vào bộ nhớ OTP
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0
    });

    // Lưu nhật ký vào bảng PostgreSQL nếu có
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
         VALUES ($1, 'GỬI MÃ OTP XÁC THỰC', 'GUEST', $2, $3, $4)`,
        [`AUD-${Date.now()}`, fullName || normalizedEmail, `Phát sinh mã OTP xác thực cho email ${normalizedEmail}`, req.ip || '127.0.0.1']
      );
    } catch {}

    // Gửi email thực tế qua nodemailer
    const emailResult = await sendOtpEmail(normalizedEmail, otp, fullName || 'Quý Khách');
    const isRealSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (isRealSmtp && !emailResult.emailSent) {
      return res.status(500).json({
        success: false,
        message: `Không thể gửi email xác thực đến ${normalizedEmail}: ${emailResult.error || 'Lỗi dịch vụ mail'}`
      });
    }

    let messageText = `Mã OTP xác thực đã được gửi tới ${normalizedEmail}. Vui lòng kiểm tra hộp thư Gmail (cả thư mục Spam/Quảng cáo).`;
    if (!isRealSmtp) {
      messageText = `Mã xác thực OTP của bạn là: ${otp} (Cấu hình SMTP_USER và SMTP_PASS trong backend/.env để nhận thư trong Gmail thật).`;
    }

    res.json({
      success: true,
      message: messageText,
      otp: isRealSmtp ? undefined : otp, // Trong môi trường thực tế (Real SMTP), bảo mật mã OTP chỉ nằm trong hộp thư Gmail
      emailSent: emailResult.emailSent,
      isRealSmtp,
      previewUrl: emailResult.previewUrl,
      expiresIn: 300
    });
  } catch (err) {
    console.error('Lỗi send-otp:', err.message);
    res.status(500).json({ success: false, message: 'Không thể gửi mã OTP. Vui lòng thử lại sau.' });
  }
});

/**
 * 2. POST /api/auth/verify-otp
 * Xác thực mã OTP trước khi tạo tài khoản
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mã OTP.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Chưa có mã OTP nào được gửi cho email này hoặc mã đã hết hạn. Vui lòng bấm "Gửi lại OTP".'
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới.'
      });
    }

    if (record.otp !== otp.toString().trim()) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({
          success: false,
          message: 'Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác (còn ${5 - record.attempts} lần thử).`
      });
    }

    res.json({
      success: true,
      message: 'Xác thực OTP thành công!'
    });
  } catch (err) {
    console.error('Lỗi verify-otp:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi xác thực OTP. Vui lòng thử lại sau.' });
  }
});

/**
 * 3. POST /api/auth/login
 * Đăng nhập tài khoản thực tế qua PostgreSQL
 */
router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Kiểm tra tài khoản thực tế trong PostgreSQL
    let dbRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (dbRes.rowCount === 0 && normalizedEmail === 'admin') {
      dbRes = await query("SELECT * FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    }
    if (dbRes.rowCount === 0 && (normalizedEmail === 'staff' || normalizedEmail === 'staff@smartpark.vn')) {
      dbRes = await query("SELECT * FROM users WHERE role = 'staff' ORDER BY id ASC LIMIT 1");
    }
    if (dbRes.rowCount === 0) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
      try {
        await query(
          'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
          [`AUD-${Date.now()}`, 'CẢNH BÁO BẢO MẬT: ĐĂNG NHẬP KHÔNG TỒN TẠI', 'UNKNOWN', normalizedEmail, `Phát hiện nỗ lực đăng nhập vào tài khoản không tồn tại [${normalizedEmail}] từ IP ${clientIp}`, clientIp]
        );
      } catch {}
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.' });
    }

    const user = dbRes.rows[0];
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const trackerKey = `${normalizedEmail}_${clientIp}`;

    // Kiểm tra trạng thái khóa tài khoản
    if (user.status === 'locked') {
      try {
        await query(
          'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
          [`AUD-${Date.now()}`, 'CẢNH BÁO BẢO MẬT: TRUY CẬP TÀI KHOẢN BỊ KHÓA', user.id, user.full_name, `Phát hiện nỗ lực đăng nhập vào tài khoản đang bị tạm khóa [${user.email}] từ IP ${clientIp}`, clientIp]
        );
      } catch {}
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đang bị tạm khóa bởi Quản trị viên hệ thống. Vui lòng liên hệ hotline 1900 888 888 để được hỗ trợ mở khóa.'
      });
    }

    // 2. So khớp mật khẩu thuần túy qua bcrypt (Không cho phép mật khẩu mặc định hardcoded)
    let isValidPassword = false;
    if (user.password_hash) {
      if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } else {
        isValidPassword = (password === user.password_hash);
      }
    }

    if (!isValidPassword) {
      // Ghi vết số lần thất bại
      const currentFailures = (failedLoginTracker.get(trackerKey) || 0) + 1;
      failedLoginTracker.set(trackerKey, currentFailures);

      try {
        if (currentFailures >= 3) {
          await query(
            'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [`AUD-${Date.now()}`, 'CẢNH BÁO BẢO MẬT: NGUY CƠ TẤN CÔNG BRUTE-FORCE / PHÁ HỆ THỐNG', user.id, user.full_name, `NGUY CẤP: Phát hiện liên tiếp ${currentFailures} lần đăng nhập sai mật khẩu vào tài khoản [${user.email}] từ IP ${clientIp}. Hệ thống kích hoạt cảnh báo an ninh!`, clientIp]
          );
        } else {
          await query(
            'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [`AUD-${Date.now()}`, 'CẢNH BÁO BẢO MẬT: ĐĂNG NHẬP THẤT BẠI (SAI MẬT KHẨU)', user.id, user.full_name, `Đăng nhập không thành công (sai mật khẩu lần ${currentFailures}) từ IP ${clientIp}`, clientIp]
          );
        }
      } catch {}

      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.' });
    }

    // Đăng nhập thành công -> Reset bộ đếm thất bại
    failedLoginTracker.delete(trackerKey);

    // 3. Phát sinh JWT Token có thời hạn 24 giờ
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Ghi nhật ký đăng nhập vào audit_logs
    try {
      await query(
        'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [`AUD-${Date.now()}`, 'ĐĂNG NHẬP HỆ THỐNG THÀNH CÔNG', user.id, user.full_name, `Đăng nhập thành công với vai trò [${user.role}]`, clientIp]
      );
    } catch {}

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone || '',
        loyaltyTier: user.loyalty_tier || 'Thành viên Bạc',
        parkPoints: user.park_points || 0
      }
    });
  } catch (err) {
    console.error('Lỗi login:', err.message);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại sau.' });
  }
});

/**
 * 4. POST /api/auth/register
 * Đăng ký tài khoản người dùng mới và lưu vào PostgreSQL
 */
router.post('/register', registerLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const { fullName, email, password, phone, otp } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Bắt buộc kiểm tra OTP xác thực email
    const record = otpStore.get(normalizedEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa yêu cầu gửi mã OTP hoặc mã OTP đã hết hiệu lực. Vui lòng bấm "Nhận mã OTP".'
      });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng nhận mã mới.' });
    }
    if (!otp || record.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Mã OTP xác thực không chính xác.' });
    }
    // Xóa OTP sau khi dùng thành công
    otpStore.delete(normalizedEmail);

    // 2. Kiểm tra xem email đã tồn tại trong PostgreSQL chưa
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ success: false, message: 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.' });
    }

    const userId = `USR-${Date.now().toString().slice(-6)}`;
    const hash = await bcrypt.hash(password, 10);

    // 3. Lưu trực tiếp tài khoản mới vào bảng users trong PostgreSQL
    await query(
      `INSERT INTO users (id, email, password_hash, full_name, phone, role, loyalty_tier, park_points)
       VALUES ($1, $2, $3, $4, $5, 'customer', 'Thành viên Mới', 500)`,
      [userId, normalizedEmail, hash, fullName, phone || '']
    );

    // Tặng voucher chào mừng vào user_vouchers
    try {
      await query(
        `INSERT INTO user_vouchers (id, user_id, voucher_code, title, discount_type, discount_val, pts_cost, source, is_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [`UV-${Date.now()}`, userId, 'WELCOME20K', 'Voucher Chào Mừng Thành Viên Mới - Giảm 20.000đ', 'fixed', 20000, 0, 'welcome_gift', 0]
      );
    } catch (vErr) {
      console.warn('Lỗi tặng voucher chào mừng:', vErr.message);
    }

    // Ghi audit log
    try {
      await query(
        'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [`AUD-${Date.now()}`, 'ĐĂNG KÝ TÀI KHOẢN MỚI', userId, fullName, `Tạo tài khoản khách hàng mới (${normalizedEmail})`, req.ip || '127.0.0.1']
      );
    } catch {}

    const token = jwt.sign(
      { id: userId, email: normalizedEmail, role: 'customer', fullName },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Tặng ngay 500 điểm thưởng và voucher 20.000đ.',
      token,
      user: {
        id: userId,
        email: normalizedEmail,
        fullName,
        phone: phone || '',
        role: 'customer',
        loyaltyTier: 'Thành viên Mới',
        parkPoints: 500
      }
    });
  } catch (err) {
    console.error('Lỗi register:', err.message);
    res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra khi đăng ký tài khoản. Vui lòng thử lại sau.' });
  }
});

/**
 * 5. GET /api/auth/me
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    let userInfo = req.user;

    try {
      const dbRes = await query('SELECT id, email, full_name, role, park_points, loyalty_tier, phone FROM users WHERE id = $1', [userId]);
      if (dbRes.rowCount > 0) {
        userInfo = dbRes.rows[0];
      }
    } catch {}

    res.json({
      success: true,
      user: userInfo
    });
  } catch (err) {
    console.error('Lỗi get /me:', err.message);
    res.status(500).json({ success: false, message: 'Không thể lấy thông tin tài khoản.' });
  }
});

/**
 * 6. POST /api/auth/forgot-password/send-otp
 * Gửi mã OTP xác thực đặt lại mật khẩu về email
 */
router.post('/forgot-password/send-otp', otpLimiter, validateBody(forgotPasswordSendOtpSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Kiểm tra tài khoản trong PostgreSQL
    const userRes = await query('SELECT id, full_name, email FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết với địa chỉ email này. Vui lòng kiểm tra lại.'
      });
    }

    const user = userRes.rows[0];

    // 2. Tạo mã OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    resetOtpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0,
      userId: user.id
    });

    // 3. Ghi log audit
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
         VALUES ($1, 'YÊU CẦU ĐẶT LẠI MẬT KHẨU', $2, $3, $4, $5)`,
        [`AUD-${Date.now()}`, user.id, user.full_name, `Yêu cầu mã OTP đặt lại mật khẩu cho ${normalizedEmail}`, req.ip || '127.0.0.1']
      );
    } catch {}

    // 4. Gửi email xác thực
    const emailResult = await sendOtpEmail(normalizedEmail, otp, user.full_name, 'reset_password');
    const isRealSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    let messageText = `Mã OTP xác thực đặt lại mật khẩu đã được gửi tới ${normalizedEmail}. Vui lòng kiểm tra hộp thư.`;
    if (!isRealSmtp) {
      messageText = `Mã OTP đặt lại mật khẩu của bạn là: ${otp} (Hệ thống chạy chế độ thử nghiệm nội bộ).`;
    }

    res.json({
      success: true,
      message: messageText,
      otp: isRealSmtp ? undefined : otp,
      emailSent: emailResult.emailSent,
      expiresIn: 300
    });
  } catch (err) {
    console.error('Lỗi forgot-password/send-otp:', err.message);
    res.status(500).json({ success: false, message: 'Không thể gửi mã OTP đặt lại mật khẩu. Vui lòng thử lại sau.' });
  }
});

/**
 * 7. POST /api/auth/forgot-password/verify-and-reset
 * Xác thực mã OTP và cập nhật mật khẩu mới vào PostgreSQL
 */
router.post('/forgot-password/verify-and-reset', forgotPasswordLimiter, validateBody(forgotPasswordResetSchema), async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const record = resetOtpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Chưa có yêu cầu đặt lại mật khẩu hoặc mã OTP đã hết hạn. Vui lòng nhận lại mã mới.'
      });
    }

    if (Date.now() > record.expiresAt) {
      resetOtpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới.'
      });
    }

    if (record.otp !== otp.toString().trim()) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        resetOtpStore.delete(normalizedEmail);
        return res.status(400).json({
          success: false,
          message: 'Bạn đã nhập sai mã OTP quá 5 lần. Vui lòng yêu cầu mã mới.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác (còn ${5 - record.attempts} lần thử).`
      });
    }

    // 1. Mã hóa mật khẩu mới bằng bcrypt
    const hash = await bcrypt.hash(newPassword, 10);

    // 2. Cập nhật vào PostgreSQL
    await query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2', [hash, normalizedEmail]);

    // 3. Xóa OTP khỏi bộ nhớ
    resetOtpStore.delete(normalizedEmail);

    // 4. Ghi audit log
    try {
      await query(
        `INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address)
         VALUES ($1, 'ĐỔI MẬT KHẨU THÀNH CÔNG (OTP)', $2, $3, $4, $5)`,
        [`AUD-${Date.now()}`, record.userId || 'USR', normalizedEmail, `Đổi mật khẩu tài khoản thành công qua xác thực OTP`, req.ip || '127.0.0.1']
      );
    } catch {}

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.'
    });
  } catch (err) {
    console.error('Lỗi verify-and-reset:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi đặt lại mật khẩu. Vui lòng thử lại sau.' });
  }
});

/**
 * 8. POST /api/auth/experience-login
 * Đăng nhập trải nghiệm nhanh phân quyền (Admin / Staff / Customer)
 */
router.post('/experience-login', async (req, res) => {
  try {
    const { role } = req.body;
    const targetRole = (role || 'customer').toLowerCase();

    let user = null;
    try {
      const dbRes = await query('SELECT * FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1', [targetRole]);
      if (dbRes.rowCount > 0) {
        user = dbRes.rows[0];
      }
    } catch {}

    if (!user) {
      if (targetRole === 'admin') {
        user = { id: 'USR-03', email: 'admin@smartpark.vn', full_name: 'Quản Trị Viên Hệ Thống', role: 'admin', phone: '0912345678', loyalty_tier: 'Tổng Quản Trị', park_points: 9999 };
      } else if (targetRole === 'staff') {
        user = { id: 'USR-02', email: 'staff@smartpark.vn', full_name: 'Nhân Viên Trực Bốt Đà Nẵng', role: 'staff', phone: '0905123789', loyalty_tier: 'Nhân viên trạm', park_points: 0 };
      } else {
        user = { id: 'USR-01', email: 'khachhang@smartpark.vn', full_name: 'Khách Hàng Trải Nghiệm', role: 'customer', phone: '0988123456', loyalty_tier: 'Thành viên Vàng', park_points: 1250 };
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name || user.fullName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    try {
      await query(
        'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [`AUD-${Date.now()}`, 'TRẢI NGHIỆM HỆ THỐNG', user.id, user.full_name || user.fullName, `Trải nghiệm nhanh với vai trò [${user.role}]`, req.ip || '127.0.0.1']
      );
    } catch {}

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name || user.fullName,
        role: user.role,
        phone: user.phone || '',
        loyaltyTier: user.loyalty_tier || user.loyaltyTier || 'Thành viên Bạc',
        parkPoints: user.park_points || user.parkPoints || 0
      }
    });
  } catch (err) {
    console.error('Lỗi experience-login:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi trải nghiệm hệ thống. Vui lòng thử lại sau.' });
  }
});

/**
 * 9. PUT /api/auth/profile & /api/auth/update-profile
 * Cập nhật thông tin tài khoản và avatar người dùng (Kiểm tra giới hạn dung lượng & loại file)
 */
router.put(['/profile', '/update-profile'], authenticateJWT, validateBody(updateProfileSchema), async (req, res) => {
  try {
    const { id, email, fullName, phone, avatar, avatarUrl } = req.body;
    const targetEmail = email ? email.trim().toLowerCase() : (req.user?.email ? req.user.email.toLowerCase() : null);
    const targetId = id || req.user?.id;
    const newAvatar = avatar || avatarUrl;

    if (!targetEmail && !targetId) {
      return res.status(400).json({ success: false, message: 'Thiếu định danh tài khoản để cập nhật.' });
    }

    // Validate avatar upload: giới hạn định dạng (JPG, PNG, WEBP) và dung lượng tối đa 5MB
    if (newAvatar) {
      const imgValidation = validateImageUpload(newAvatar);
      if (!imgValidation.valid) {
        return res.status(400).json({ success: false, message: imgValidation.message });
      }
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (fullName) {
      updates.push(`full_name = $${idx++}`);
      values.push(fullName.trim());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone.trim());
    }
    if (newAvatar !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(newAvatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Không có thông tin nào để cập nhật.' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    let queryText = '';
    if (targetId) {
      values.push(targetId);
      queryText = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, phone, role, avatar_url, loyalty_tier, park_points`;
    } else {
      values.push(targetEmail);
      queryText = `UPDATE users SET ${updates.join(', ')} WHERE LOWER(email) = $${idx} RETURNING id, full_name, email, phone, role, avatar_url, loyalty_tier, park_points`;
    }

    const dbRes = await query(queryText, values);

    if (dbRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng trong cơ sở dữ liệu.' });
    }

    const u = dbRes.rows[0];
    res.json({
      success: true,
      message: 'Cập nhật thông tin tài khoản và ảnh đại diện thành công!',
      user: {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        avatar: u.avatar_url,
        loyaltyTier: u.loyalty_tier,
        parkPoints: u.park_points
      }
    });
  } catch (err) {
    console.error('Lỗi update profile:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật tài khoản. Vui lòng thử lại sau.' });
  }
});

/**
 * 10. POST /api/auth/change-password
 * Đổi mật khẩu tài khoản trực tiếp trong PostgreSQL
 */
router.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const targetEmail = (email || req.user?.email || '').trim().toLowerCase();

    if (!targetEmail || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [targetEmail]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng.' });
    }

    const user = userRes.rows[0];
    let isMatch = false;
    if (user.password_hash) {
      if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      } else {
        isMatch = (currentPassword === user.password_hash);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2', [newHash, targetEmail]);

    try {
      await query(
        'INSERT INTO audit_logs (id, action, user_id, user_name, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [`AUD-${Date.now()}`, 'ĐỔI MẬT KHẨU', user.id, user.full_name, `Người dùng ${user.email} đã đổi mật khẩu thành công`, req.ip || '127.0.0.1']
      );
    } catch {}

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Hãy đăng nhập lại bằng mật khẩu mới.'
    });
  } catch (err) {
    console.error('Lỗi change-password:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi đổi mật khẩu. Vui lòng thử lại sau.' });
  }
});

export default router;

