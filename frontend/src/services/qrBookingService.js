/**
 * Cơ sở dữ liệu danh sách mã QR Barrier Pass đã đặt trước thực tế
 */

// Chức năng
// qrBookingService.js – Quản lý Vé Điện tử QR Barrier Pass
// Chức năng: Tính toán thời hạn vé (20 ngày cho vé lượt, 7 ngày cho vé tuần, 30 ngày cho vé tháng), 
// sinh chuỗi mã vé định dạng SP-PASS-[Mã]-[BiểnSố] và lưu trữ vé vào localStorage.


export const INITIAL_PREBOOKED_PASSES = [];

// Danh sách mã vé demo cần dọn sạch khỏi bộ nhớ
const DEMO_CODE_PATTERNS = ['SP-PASS-9842', 'SP-PASS-4412', 'SP-PASS-3301', '43B89632', '51H89632', '59A34567', '60B88991'];

export function getStoredPasses() {
  try {
    const raw = localStorage.getItem('sp_prebooked_passes');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Tự động lọc bỏ các vé demo cũ
    const cleanList = parsed.filter((p) => {
      if (!p || !p.code) return false;
      return !DEMO_CODE_PATTERNS.some((pat) => p.code.includes(pat));
    });
    if (cleanList.length !== parsed.length) {
      localStorage.setItem('sp_prebooked_passes', JSON.stringify(cleanList));
    }
    return cleanList;
  } catch {
    return [];
  }
}

export function registerNewBooking(bookingData) {
  const passes = getStoredPasses();
  const rawPlate = bookingData.plate || '';
  const cleanPlate = (rawPlate || 'PASS').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const code = `SP-PASS-${randomNum}-${cleanPlate || 'AUTO'}`;

  // Thời hạn vé: 20 ngày mặc định hoặc theo gói Tuần (7 ngày) / Tháng (30 ngày)
  const validUntilDate = new Date();
  let validityDisplay = 'Có giá trị 20 ngày';
  let packageType = 'Vé lượt đặt trước';

  if (bookingData.duration && (bookingData.duration.includes('Tháng') || bookingData.duration.includes('tháng'))) {
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    validityDisplay = 'Vé tháng (Có giá trị 30 ngày)';
    packageType = 'Gói Vé Tháng Cố Định';
  } else if (bookingData.duration && (bookingData.duration.includes('Tuần') || bookingData.duration.includes('tuần'))) {
    validUntilDate.setDate(validUntilDate.getDate() + 7);
    validityDisplay = 'Vé tuần (Có giá trị 7 ngày)';
    packageType = 'Gói Vé Tuần';
  } else {
    validUntilDate.setDate(validUntilDate.getDate() + 20);
    validityDisplay = 'Có giá trị 20 ngày';
    packageType = 'Vé giữ chỗ (20 ngày)';
  }

  const newPass = {
    code,
    plate: bookingData.plate || 'Chưa đăng ký',
    customer: bookingData.customer || 'Khách hàng SmartPark',
    phone: bookingData.phone || '',
    model: bookingData.model || 'Phương tiện cá nhân',
    branch: bookingData.branch || 'SmartPark - Aeon Mall Thanh Khê 1 (Đà Nẵng)',
    slot: bookingData.slot || 'Tầng B2 · Ô B-08',
    bookingTime: `${bookingData.startTime || '19:00'} (${bookingData.duration || '2 giờ'})`,
    validUntil: validUntilDate.toISOString(),
    validityDisplay,
    packageType,
    status: 'ACTIVE',
    fee: bookingData.totalCost ? `${bookingData.totalCost.toLocaleString('vi-VN')}đ` : '45.000đ',
    paymentStatus: `Đã thanh toán qua ${bookingData.paymentMethod ? bookingData.paymentMethod.toUpperCase() : 'Ví điện tử'}`,
    depositPaid: true,
    createdAt: new Date().toISOString()
  };

  const updatedPasses = [newPass, ...passes];
  try {
    localStorage.setItem('sp_prebooked_passes', JSON.stringify(updatedPasses));
  } catch (err) {
    console.warn('Cannot save to localStorage:', err);
  }

  // Đồng bộ lưu vào cơ sở dữ liệu PostgreSQL Backend
  try {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        code,
        vehicle: newPass.plate,
        customer: newPass.customer,
        email: bookingData.email || localStorage.getItem('sp_user_email') || '',
        phone: newPass.phone,
        branch: newPass.branch,
        floor: bookingData.floor || (bookingData.slot?.includes('Tầng') ? bookingData.slot.split('Tầng ')[1]?.split(' ')[0] : 'B1'),
        slot: bookingData.rawSlot || (bookingData.slot?.includes('Ô ') ? bookingData.slot.split('Ô ')[1] : bookingData.slot || 'A-02'),
        duration: bookingData.duration || '2 giờ',
        totalCost: bookingData.totalCost || 45000,
        paymentMethod: bookingData.paymentMethod || 'VietQR',
        startTime: bookingData.startTime || '19:00',
        date: bookingData.date || new Date().toISOString().split('T')[0]
      })
    }).catch(() => {});
  } catch {}

  return newPass;
}

const STORAGE_KEY_USED_PASSES = 'sp_used_qr_passes';

/**
 * Bản đồ lưu trữ các mã QR đã được quét thông quan tại trạm (chống quét lặp lại)
 */
export function getUsedPassesMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USED_PASSES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Kiểm tra xem mã QR đã từng được quét thông quan trước đó hay chưa
 */
export function isPassAlreadyUsedLocally(code) {
  if (!code) return false;
  const clean = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const map = getUsedPassesMap();
  if (map[clean]) return true;

  const passes = getStoredPasses();
  const found = passes.find(p => {
    const pCode = (p.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const pBk = (p.booking_code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return pCode === clean || pBk === clean;
  });
  return Boolean(found && (found.isUsed || found.status === 'USED' || (found.scanCount && found.scanCount > 0)));
}

/**
 * Đánh dấu mã QR đã quét thông quan (Vĩnh viễn vô hiệu hóa lần quét thứ 2)
 */
export function markPassAsUsedLocally(code, extraData = {}) {
  if (!code) return;
  const clean = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const map = getUsedPassesMap();
  map[clean] = {
    usedAt: new Date().toISOString(),
    plate: extraData.plate || '---',
    slot: extraData.slot || '---',
    ...extraData
  };
  try {
    localStorage.setItem(STORAGE_KEY_USED_PASSES, JSON.stringify(map));
  } catch {}

  // Cập nhật trạng thái trực tiếp trong danh sách vé đã lưu
  try {
    const passes = getStoredPasses();
    const updated = passes.map(p => {
      const pCode = (p.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pBk = (p.booking_code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (pCode === clean || pBk === clean) {
        return {
          ...p,
          isUsed: true,
          status: 'USED',
          scanCount: (p.scanCount || 0) + 1,
          usedAt: new Date().toISOString()
        };
      }
      return p;
    });
    localStorage.setItem('sp_prebooked_passes', JSON.stringify(updated));
  } catch {}
}

export async function verifyQrCodeAsync(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') {
    return { success: false, error: 'Không tìm thấy dữ liệu mã QR.' };
  }

  const trimmed = rawCode.trim();
  let searchCode = trimmed;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.code) searchCode = parsed.code;
    } catch {}
  }

  // 1. Chỉ chấp nhận các mã mang định dạng vé chính thức của hệ thống SmartPark
  const isSystemFormat = /^(SP-PASS-|BK-|SP-VL-|SMARTPARK-)/i.test(searchCode) || 
    (trimmed.startsWith('{') && (trimmed.includes('SP-PASS-') || trimmed.includes('SmartPark') || trimmed.includes('booking_code')));

  if (!isSystemFormat) {
    return {
      success: false,
      error: 'Mã QR không hợp lệ! Hệ thống SmartPark chỉ chấp nhận vé QR chính thức do hệ thống phát hành.'
    };
  }

  // 2. Kiểm tra nhanh trong bộ nhớ LocalStorage xem vé đã từng được quét chưa
  if (isPassAlreadyUsedLocally(searchCode)) {
    const clean = searchCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const usedInfo = getUsedPassesMap()[clean] || {};
    const usedTimeStr = usedInfo.usedAt ? new Date(usedInfo.usedAt).toLocaleTimeString('vi-VN') : 'trước đó';
    return {
      success: false,
      alreadyUsed: true,
      error: `Vé QR này đã được quét sử dụng lúc ${usedTimeStr}! Mỗi mã QR của hệ thống chỉ được phép quét duy nhất một lần.`,
      data: {
        code: searchCode,
        plate: usedInfo.plate || '---',
        customer: 'Khách hàng SmartPark',
        slot: usedInfo.slot || '---',
        bookingTime: 'Vé đã qua sử dụng',
        usedAt: usedTimeStr,
        status: 'ALREADY_USED',
        canOpenBarrier: false
      }
    };
  }

  // 3. Kiểm tra xác thực trực tiếp qua PostgreSQL Backend
  try {
    const res = await fetch('http://localhost:5000/api/parking/verify-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: searchCode })
    });
    const result = await res.json();

    // Nếu Backend báo vé đã từng được quét trước đó (Mã HTTP 409 hoặc alreadyUsed)
    if (res.status === 409 || result.alreadyUsed || result.data?.status === 'ALREADY_USED') {
      markPassAsUsedLocally(searchCode, result.data || {});
      return {
        success: false,
        alreadyUsed: true,
        error: result.error || 'Vé QR này đã được quét sử dụng trước đó! Mỗi mã QR chỉ quét được 1 lần.',
        data: result.data || { status: 'ALREADY_USED', canOpenBarrier: false }
      };
    }

    if (res.ok && result.success && result.data) {
      // Đánh dấu vé đã quét thành công vào bộ nhớ cục bộ
      markPassAsUsedLocally(result.data.code, result.data);

      const passes = getStoredPasses();
      if (!passes.some(p => p.code === result.data.code)) {
        try {
          localStorage.setItem('sp_prebooked_passes', JSON.stringify([result.data, ...passes]));
        } catch {}
      }
      return { success: true, data: result.data };
    }

    if (!result.success) {
      return {
        success: false,
        alreadyUsed: Boolean(result.alreadyUsed),
        error: result.error || 'Mã QR không tồn tại trong hệ thống SmartPark.',
        data: result.data
      };
    }
  } catch (err) {
    console.warn('Backend QR verify query failed, using local matching:', err);
  }

  // 4. Fallback kiểm tra vé đã tạo trong bộ nhớ LocalStorage (nếu backend ngoại tuyến)
  return verifyQrCode(searchCode);
}

export function verifyQrCode(rawCode) {
  if (!rawCode || typeof rawCode !== 'string') {
    return { success: false, error: 'Không tìm thấy dữ liệu mã QR.' };
  }

  const trimmed = rawCode.trim();
  let searchCode = trimmed;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.code) searchCode = parsed.code;
    } catch {}
  }

  // Chỉ chấp nhận định dạng mã hệ thống
  const isSystemFormat = /^(SP-PASS-|BK-|SP-VL-|SMARTPARK-)/i.test(searchCode) ||
    (trimmed.startsWith('{') && (trimmed.includes('SP-PASS-') || trimmed.includes('SmartPark')));

  if (!isSystemFormat) {
    return {
      success: false,
      error: 'Mã QR không hợp lệ! Hệ thống SmartPark chỉ chấp nhận vé QR chính thức do hệ thống phát hành.'
    };
  }

  // 1. Kiểm tra xem mã đã từng được quét trước đó hay chưa
  if (isPassAlreadyUsedLocally(searchCode)) {
    const clean = searchCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const usedInfo = getUsedPassesMap()[clean] || {};
    const usedTimeStr = usedInfo.usedAt ? new Date(usedInfo.usedAt).toLocaleTimeString('vi-VN') : 'trước đó';
    return {
      success: false,
      alreadyUsed: true,
      error: `Vé QR này đã được quét sử dụng lúc ${usedTimeStr}! Mỗi mã QR của hệ thống chỉ được phép quét duy nhất một lần.`,
      data: {
        code: searchCode,
        plate: usedInfo.plate || '---',
        customer: 'Khách hàng SmartPark',
        slot: usedInfo.slot || '---',
        bookingTime: 'Vé đã qua sử dụng',
        usedAt: usedTimeStr,
        status: 'ALREADY_USED',
        canOpenBarrier: false
      }
    };
  }

  // 2. Đối chiếu chính xác với danh sách vé đã đặt/cấp trong hệ thống
  const passes = getStoredPasses();
  const cleanSearch = searchCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const matched = passes.find((item) => {
    const itemCodeClean = (item.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const itemBkClean = (item.booking_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return itemCodeClean === cleanSearch || itemBkClean === cleanSearch;
  });

  if (matched) {
    if (matched.isUsed || matched.status === 'USED' || (matched.scanCount && matched.scanCount > 0)) {
      const usedTimeStr = matched.usedAt ? new Date(matched.usedAt).toLocaleTimeString('vi-VN') : 'trước đó';
      markPassAsUsedLocally(matched.code, matched);
      return {
        success: false,
        alreadyUsed: true,
        error: `Vé QR này đã được quét sử dụng lúc ${usedTimeStr}! Mỗi mã QR của hệ thống chỉ được phép quét duy nhất một lần.`,
        data: {
          ...matched,
          status: 'ALREADY_USED',
          usedAt: usedTimeStr,
          canOpenBarrier: false
        }
      };
    }

    const isExpired = matched.status === 'EXPIRED' || (matched.validUntil && new Date(matched.validUntil) < new Date());
    if (isExpired) {
      return {
        success: false,
        error: 'Vé QR đã hết thời hạn hiệu lực!',
        data: { ...matched, status: 'EXPIRED', canOpenBarrier: false }
      };
    }

    // Đánh dấu vé đã quét thông quan lần đầu (Khóa vĩnh viễn không cho quét lần 2)
    markPassAsUsedLocally(matched.code, matched);

    const now = new Date();
    let isEarlyArrival = false;
    let earlyMinutes = 0;
    if (matched.startTime && typeof matched.startTime === 'string' && matched.startTime.includes(':')) {
      const [h, m] = matched.startTime.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const sched = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
        if (now.getTime() < (sched.getTime() - 10 * 60 * 1000)) {
          isEarlyArrival = true;
          earlyMinutes = Math.round((sched.getTime() - now.getTime()) / 60000);
        }
      }
    }

    return {
      success: true,
      data: {
        ...matched,
        status: 'ACTIVE',
        isPrebooked: !isEarlyArrival,
        isEarlyArrival,
        earlyMinutes,
        ticketType: isEarlyArrival ? 'Vé vãng lai (Đến sớm)' : 'Vé đặt trước app',
        paymentStatus: isEarlyArrival ? 'Chuyển vé vãng lai (Đến sớm)' : (matched.paymentStatus || 'Đã vào bãi'),
        canOpenBarrier: true,
        isUsed: true,
        usedAt: new Date().toLocaleTimeString('vi-VN')
      }
    };
  }

  // Tuyệt đối không tạo vé giả nếu không tìm thấy trong cơ sở dữ liệu hệ thống
  return {
    success: false,
    error: 'Mã QR không tồn tại trong hệ thống dữ liệu SmartPark.'
  };
}
