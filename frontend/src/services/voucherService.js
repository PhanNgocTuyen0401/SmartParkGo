/**
 * SMARTPARK DANANG - VOUCHER & REWARD SERVICE
 * Quản lý kho voucher, đổi điểm thưởng, nhập mã ưu đãi và ví voucher người dùng
 * (Toàn bộ dữ liệu demo đã được xóa bỏ; chỉ giữ voucher WELCOME20K cho khách hàng mới)
 */

// chức năng
// voucherService.js – Quản lý Kho Voucher & Khuyến Mãi
// Chức năng: Quản lý việc nạp mã giảm giá, kiểm tra điều kiện đơn hàng tối thiểu (min_order_val), 
// tính toán số tiền được giảm theo % hoặc số tiền cố định (fixed) và trừ điểm tích lũy ParkPoints.


export const INITIAL_REWARD_CATALOG = [];
export const INITIAL_PROMO_VOUCHERS = [];
export const SPECIAL_GIFT_CODES = {};

const STORAGE_KEY_VOUCHERS = 'sp_user_saved_vouchers';

const DEMO_VOUCHER_CODES = [
  'PARK25WEEKEND',
  'PARKFLOW15K',
  'MOMOPASS5',
  'ZALOPAY20K',
  'SMARTPARK2026',
  'DANANGVIP',
  'CHAOBANMOI',
  'VIETQR20',
  'POINT20K',
  'POINT50K',
  'DAYFREEPASS',
  'VIPFAST30'
];

/**
 * Chuẩn hóa đối tượng voucher thành cấu trúc thống nhất, an toàn, chống NaN & null pointer
 */
export function normalizeVoucher(v) {
  if (!v) return null;
  const rawCode = String(v.code || v.voucher_code || '').trim().toUpperCase();
  if (!rawCode) return null;

  const rawType = String(v.type || v.discount_type || v.discountType || '').toLowerCase();
  const rawValStr = String(v.value !== undefined ? v.value : (v.discount_val !== undefined ? v.discount_val : (v.discountVal !== undefined ? v.discountVal : 0)));
  const isPercent = rawType === 'percent' || rawValStr.includes('%');
  const numVal = parseInt(rawValStr.replace(/\D/g, ''), 10) || 0;

  const rawMinStr = String(v.minOrderVal !== undefined ? v.minOrderVal : (v.min_order_val !== undefined ? v.min_order_val : 0));
  const minOrderVal = parseInt(rawMinStr.replace(/\D/g, ''), 10) || 0;

  const isUsed = Boolean(v.isUsed || v.is_used || v.usedAt || v.used_at);

  return {
    id: v.id || `v-${rawCode}`,
    code: rawCode,
    voucher_code: rawCode,
    title: v.title || v.name || rawCode,
    titleEn: v.titleEn || v.title_en || v.title || rawCode,
    desc: v.desc || v.description || v.conditions || (isPercent ? `Giảm ${numVal}% cước đỗ xe` : `Giảm ${numVal.toLocaleString('vi-VN')}đ cước đỗ xe`),
    descEn: v.descEn || v.desc_en || (isPercent ? `${numVal}% discount` : `${numVal.toLocaleString('vi-VN')}đ discount`),
    type: isPercent ? 'percent' : 'fixed',
    discount_type: isPercent ? 'percent' : 'fixed',
    discountType: isPercent ? 'percent' : 'fixed',
    value: numVal,
    discount_val: numVal,
    discountVal: numVal,
    minOrderVal,
    min_order_val: minOrderVal,
    expiry: v.expiry || v.exp || v.expiry_date || '31/12/2027',
    stations: v.stations || 'Tất cả chi nhánh SmartPark Đà Nẵng',
    conditions: v.conditions || (minOrderVal > 0 ? `Áp dụng cho đơn từ ${minOrderVal.toLocaleString('vi-VN')}đ` : 'Áp dụng cho mọi đơn'),
    claimedAt: v.claimedAt || v.claimed_at || new Date().toISOString(),
    isUsed,
    is_used: isUsed,
    source: v.source || 'wallet'
  };
}

/**
 * Lấy danh sách voucher người dùng đã lưu trong ví
 * Tự động lọc bỏ các mã demo cũ nếu còn sót trong localStorage
 */
export function getSavedUserVouchers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOUCHERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Chuẩn hóa và lọc bỏ demo voucher cũ
        const normalizedList = parsed.map(normalizeVoucher).filter(Boolean);
        const cleaned = normalizedList.filter(
          (v) => !DEMO_VOUCHER_CODES.includes(v.code)
        );

        // Đảm bảo voucher WELCOME20K luôn sẵn sàng cho khách hàng mới nếu chưa có
        const hasWelcome = cleaned.some((v) => v.code === 'WELCOME20K');
        if (!hasWelcome) {
          cleaned.push(getDefaultWelcomeVoucher());
        }

        saveUserVouchers(cleaned);
        return cleaned;
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc ví voucher:', e);
  }

  // Mặc định khách hàng tạo tài khoản mới nhận DUY NHẤT 1 voucher WELCOME20K giảm 20.000đ cho đơn từ 50.000đ
  const initialVouchers = [getDefaultWelcomeVoucher()];
  saveUserVouchers(initialVouchers);
  return initialVouchers;
}

export function getDefaultWelcomeVoucher() {
  return normalizeVoucher({
    id: 'init-welcome-20k',
    code: 'WELCOME20K',
    title: 'Voucher Chào Mừng Thành Viên Mới',
    titleEn: 'New Member Welcome Voucher',
    desc: 'Giảm 20.000đ cho đơn đặt chỗ trước từ 50.000đ trở lên.',
    descEn: '20,000đ off advance reservation from 50,000đ.',
    type: 'fixed',
    value: 20000,
    minOrderVal: 50000,
    min_order_val: 50000,
    expiry: '31/12/2027',
    stations: 'Toàn bộ chi nhánh SmartPark Đà Nẵng',
    conditions: 'Áp dụng cho đơn đặt chỗ trước từ 50.000đ trở lên.',
    claimedAt: new Date().toISOString(),
    isUsed: false,
    source: 'welcome_gift'
  });
}

/**
 * Lưu danh sách voucher vào localStorage
 */
export function saveUserVouchers(vouchers) {
  try {
    const safeList = (Array.isArray(vouchers) ? vouchers : []).map(normalizeVoucher).filter(Boolean);
    localStorage.setItem(STORAGE_KEY_VOUCHERS, JSON.stringify(safeList));
  } catch (e) {
    console.error('Lỗi lưu ví voucher:', e);
  }
}

/**
 * Kiểm tra mã đã có trong ví chưa (chưa sử dụng)
 */
export function isVoucherInWallet(code, vouchersList = null) {
  if (!code) return false;
  const upper = String(code).trim().toUpperCase();
  const list = vouchersList || getSavedUserVouchers();
  return list.some((v) => {
    const vCode = String(v?.code || v?.voucher_code || '').trim().toUpperCase();
    return vCode === upper && !v?.isUsed && !v?.is_used;
  });
}

/**
 * Thêm voucher vào ví
 */
export function addVoucherToWallet(voucherData, source = 'claimed') {
  if (!voucherData) return { success: false, message: 'Dữ liệu voucher không hợp lệ' };
  const normalized = normalizeVoucher({ ...voucherData, source });
  if (!normalized) return { success: false, message: 'Mã voucher không hợp lệ' };

  const current = getSavedUserVouchers();
  if (isVoucherInWallet(normalized.code, current)) {
    return { success: false, message: `Mã ${normalized.code} đã có trong ví của bạn!` };
  }

  const updated = [normalized, ...current.filter((x) => x.code !== normalized.code)];
  saveUserVouchers(updated);
  return { success: true, voucher: normalized, message: `Đã lưu thành công mã ${normalized.code} vào ví!` };
}

/**
 * Đánh dấu voucher đã dùng sau khi đặt chỗ
 */
export function markVoucherAsUsed(code) {
  if (!code) return false;
  const current = getSavedUserVouchers();
  const normalizedCode = String(code).trim().toUpperCase();
  let found = false;

  const updated = current.map((v) => {
    const vCode = String(v?.code || v?.voucher_code || '').trim().toUpperCase();
    if (!found && vCode === normalizedCode && !v?.isUsed && !v?.is_used) {
      found = true;
      return { ...v, isUsed: true, is_used: true, usedAt: new Date().toISOString() };
    }
    return v;
  });

  saveUserVouchers(updated);
  return found;
}

/**
 * Tra cứu mã ưu đãi trong ví hoặc mã welcome
 */
export function lookupVoucherCode(code) {
  if (!code) return null;
  const upper = String(code).trim().toUpperCase();

  if (upper === 'WELCOME20K') {
    return getDefaultWelcomeVoucher();
  }

  const inWallet = getSavedUserVouchers().find((v) => {
    const vCode = String(v?.code || v?.voucher_code || '').trim().toUpperCase();
    return vCode === upper && !v?.isUsed && !v?.is_used;
  });
  if (inWallet) return normalizeVoucher(inWallet);

  return null;
}
