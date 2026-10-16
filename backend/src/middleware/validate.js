/**
 * SmartPark Backend – Middleware Validation (Zod)
 * Validate request body/params/query với schema Zod trước khi vào route handler
 */
import { z } from 'zod';

/**
 * Tạo middleware validate request.body theo Zod schema
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đầu vào không hợp lệ.',
      errors
    });
  }
  req.validatedBody = result.data;
  next();
};

/**
 * Tạo middleware validate request.params
 */
export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Tham số URL không hợp lệ.',
      errors: result.error.errors
    });
  }
  req.validatedParams = result.data;
  next();
};

/**
 * Tạo middleware validate request.query
 */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Query parameters không hợp lệ.',
      errors: result.error.errors
    });
  }
  req.validatedQuery = result.data;
  next();
};

// ── Schemas dùng chung ────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().min(1, 'Email/username không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống')
});

export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(100),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  phone: z.string().optional()
});

export const BookingSchema = z.object({
  branchId: z.string().min(1, 'Chi nhánh không được để trống'),
  slotCode: z.string().min(1, 'Mã ô đỗ không được để trống'),
  plate: z.string().min(1, 'Biển số xe không được để trống'),
  startTime: z.string().datetime({ message: 'Thời gian vào không hợp lệ' }).optional(),
  endTime: z.string().datetime({ message: 'Thời gian ra không hợp lệ' }).optional(),
  duration: z.string().optional(),
  totalCost: z.number().min(0).optional(),
  paymentMethod: z.string().optional()
});

export const VoucherSchema = z.object({
  code: z.string().min(3, 'Mã voucher tối thiểu 3 ký tự').max(50),
  title: z.string().min(3).max(200),
  discountType: z.enum(['fixed', 'percent']),
  discountVal: z.number().positive('Mức giảm phải lớn hơn 0'),
  minOrderVal: z.number().min(0).default(0),
  ptsCost: z.number().min(0).default(0),
  maxUse: z.number().positive().default(500),
  expiry: z.string().min(1),
  applyFor: z.enum(['booking', 'all']).default('booking'),
  conditions: z.string().optional()
});

export const ChangePinSchema = z.object({
  newPin: z.string().length(6, 'Mã PIN phải đúng 6 chữ số').regex(/^\d+$/, 'PIN chỉ gồm chữ số')
});
