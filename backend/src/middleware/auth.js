import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// auth.js – Middleware Xác thực JWT (JSON Web Token)
// Chức năng: Chặn các request gửi lên các API riêng tư. 
// Lấy chuỗi token từ Header Authorization: Bearer <token>, giải mã và gắn thông tin người dùng vào req.user. 
// Nếu token hết hạn hoặc sai chữ ký, lập tức trả về mã 401 Unauthorized.

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'smartpark_secret_jwt_key_danang_2026';

/**
 * Middleware xác thực token JWT
 * - Bắt buộc có token
 * - Xử lý phiên hết hạn (TokenExpiredError)
 * - Ngăn chặn hoàn toàn backdoor giả lập tài khoản
 */
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Vui lòng đăng nhập để tiếp tục.'
    });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Token xác thực không được để trống.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        });
      }
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Phiên đăng nhập không hợp lệ hoặc đã bị chỉnh sửa.'
      });
    }
    req.user = decoded;
    next();
  });
};

/**
 * Middleware phân quyền RBAC (Role-Based Access Control)
 */
export const requireRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Tài khoản quyền [${req.user.role}] không có quyền thực hiện hành động này.`
      });
    }

    next();
  };
};
