import { z } from 'zod';
import rateLimit from 'express-rate-limit';


// security.js – Kiểm tra Định dạng Dữ liệu (Zod) & Chống Brute-force
// Chức năng:
// Giới hạn số lần thử (express-rate-limit): Chặn địa chỉ IP gửi request dồn dập (tối đa 5 lần thử đăng nhập/15 phút).
// Dùng thư viện Zod kiểm tra chặt chẽ cấu trúc JSON gửi lên: 
//     Email phải đúng định dạng @, mật khẩu tối thiểu 6-8 ký tự, OTP đủ 6 chữ số.


// ── 1. GIỚI HẠN LOẠI VÀ DUNG LƯỢNG FILE UPLOAD ───────────────────────
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Kiểm tra tính hợp lệ của ảnh tải lên (Base64 hoặc URL)
 * - Giới hạn loại file: image/jpeg, image/png, image/webp
 * - Giới hạn dung lượng: tối đa 5MB
 */
export function validateImageUpload(imageString) {
  if (!imageString || typeof imageString !== 'string') {
    return { valid: true }; // Bỏ qua nếu không truyền
  }

  const str = imageString.trim();

  // Trường hợp 1: Data URI Base64 (vd: data:image/jpeg;base64,/9j/4AAQSkZJRg...)
  if (str.startsWith('data:')) {
    const match = str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    if (!match) {
      return { valid: false, message: 'Định dạng ảnh tải lên không hợp lệ.' };
    }

    const mimeType = match[1].toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        valid: false,
        message: 'Loại tệp không được hỗ trợ. Chỉ chấp nhận định dạng ảnh JPG, PNG hoặc WEBP.'
      };
    }

    // Tính kích thước file từ chuỗi base64
    const base64Data = str.substring(match[0].length);
    const approximateSizeBytes = (base64Data.length * 3) / 4;

    if (approximateSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        message: 'Dung lượng ảnh vượt quá giới hạn cho phép (Tối đa 5MB).'
      };
    }

    return { valid: true };
  }

  // Trường hợp 2: Đường dẫn URL thông thường (https://...)
  if (str.startsWith('http://') || str.startsWith('https://')) {
    if (str.length > 2048) {
      return { valid: false, message: 'Đường dẫn ảnh quá dài (tối đa 2048 ký tự).' };
    }
    return { valid: true };
  }

  return { valid: false, message: 'Định dạng ảnh không hợp lệ (cần URL hoặc chuỗi Base64).' };
}

// ── 2. RATE LIMITERS CHỐNG BRUTE FORCE & SPAM ────────────────────────

// Giới hạn đăng nhập: Tối đa 5 lần thử trong 15 phút (môi trường production) hoặc 50 lần (development)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút để bảo vệ tài khoản.'
  }
});

// Giới hạn gửi OTP: Tối đa 5 lần trong 10 phút (production) hoặc 30 lần (development)
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng chờ 10 phút trước khi thử lại.'
  }
});

// Giới hạn đăng ký tài khoản: Tối đa 5 lần trong 15 phút (production) hoặc 30 lần (development)
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu tạo tài khoản từ thiết bị này. Vui lòng chờ 15 phút.'
  }
});

// Giới hạn đổi mật khẩu: Tối đa 5 lần trong 15 phút (production) hoặc 30 lần (development)
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thực hiện quá nhiều yêu cầu đổi mật khẩu. Vui lòng chờ 15 phút.'
  }
});

// ── 3. VALIDATION SCHEMAS (ZOD) ───────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().min(3, 'Tài khoản hoặc email phải có ít nhất 3 ký tự.').max(100, 'Tài khoản quá dài.'),
  password: z.string().min(6, 'Mật khẩu phải có tối thiểu 6 ký tự.').max(100, 'Mật khẩu quá dài.')
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có tối thiểu 2 ký tự.')
    .max(70, 'Họ và tên tối đa 70 ký tự.'),
  email: z.string().trim().email('Địa chỉ email không đúng định dạng.').max(100, 'Email quá dài.'),
  password: z.string().min(6, 'Mật khẩu phải có tối thiểu 6 ký tự.').max(100, 'Mật khẩu quá dài.'),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ (cần 10 chữ số).')
    .optional()
    .or(z.literal('')),
  otp: z.string().trim().length(6, 'Mã OTP phải có đúng 6 chữ số.')
});

export const forgotPasswordSendOtpSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không đúng định dạng.').max(100, 'Email quá dài.')
});

export const forgotPasswordResetSchema = z.object({
  email: z.string().trim().email('Địa chỉ email không đúng định dạng.').max(100, 'Email quá dài.'),
  otp: z.string().trim().length(6, 'Mã OTP phải có đúng 6 chữ số.'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có tối thiểu 6 ký tự.').max(100, 'Mật khẩu quá dài.')
});

export const updateProfileSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(2, 'Họ và tên tối thiểu 2 ký tự.').max(70, 'Họ và tên tối đa 70 ký tự.').optional(),
  email: z.string().trim().email('Email không hợp lệ.').max(100).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ.')
    .optional()
    .or(z.literal('')),
  avatar: z.string().optional(),
  avatarUrl: z.string().optional()
});

/**
 * Middleware kiểm tra dữ liệu đầu vào dựa trên Zod Schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const message = firstIssue?.message || 'Dữ liệu gửi lên không hợp lệ.';
      return res.status(400).json({
        success: false,
        message
      });
    }

    req.body = result.data;
    next();
  };
}
