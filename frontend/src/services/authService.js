/**
 * Service xác thực tài khoản SmartPark Đà Nẵng kết nối trực tiếp PostgreSQL Backend
 */

// Chức năng
// authService.js – Dịch vụ Xác thực & Người dùng
// Chức năng: Chứa toàn bộ các hàm gọi API REST tới máy chủ Backend: 
// loginUser, registerUser, sendOtp, sendForgotPasswordOtp, logoutUser.

const API_BASE_URL = 'http://localhost:5000/api/auth';

/**
 * Gửi mã OTP thực tế tới email của người dùng
 */
export async function sendOtp(email, fullName = '') {
  try {
    const response = await fetch(`${API_BASE_URL}/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, fullName })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại địa chỉ email.'
      };
    }

    return {
      success: true,
      message: data.message,
      otp: data.otp, // Mã OTP sinh ra từ backend
      emailSent: data.emailSent,
      isRealSmtp: data.isRealSmtp,
      previewUrl: data.previewUrl
    };
  } catch (err) {
    console.error('Lỗi sendOtp:', err);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ OTP SmartPark. Vui lòng kiểm tra cổng 5000.'
    };
  }
}

/**
 * Xác thực mã OTP nhập vào
 */
export async function verifyOtp(email, otp) {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, otp })
    });

    const data = await response.json();
    return {
      success: response.ok && data.success,
      message: data.message
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi kết nối máy chủ xác thực: ' + err.message
    };
  }
}

/**
 * Đăng nhập tài khoản bằng email và mật khẩu thực tế
 */
export async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      };
    }

    // Lưu phiên đăng nhập
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.user) {
      localStorage.setItem('pf_current_user', JSON.stringify(data.user));
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
      message: data.message || 'Đăng nhập thành công'
    };
  } catch (err) {
    console.error('Lỗi kết nối auth backend:', err);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ xác thực SmartPark (Port 5000). Vui lòng thử lại sau.'
    };
  }
}

/**
 * Đăng ký tài khoản người dùng mới lưu trực tiếp vào cơ sở dữ liệu PostgreSQL
 */
export async function registerUser({ fullName, email, password, phone, otp }) {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fullName, email, password, phone, otp })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Đăng ký tài khoản không thành công.'
      };
    }

    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.user) {
      localStorage.setItem('pf_current_user', JSON.stringify(data.user));
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
      message: data.message || 'Đăng ký thành công!'
    };
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ SmartPark. Vui lòng kiểm tra lại dịch vụ backend.'
    };
  }
}

/**
 * Lấy thông tin tài khoản hiện tại từ localStorage hoặc xác thực token
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('pf_current_user');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

/**
 * Đăng xuất
 */
export function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('pf_current_user');
}

/**
 * Gửi mã OTP xác thực đặt lại mật khẩu về email
 */
export async function sendForgotPasswordOtp(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Không tìm thấy tài khoản liên kết với địa chỉ email này.'
      };
    }

    return {
      success: true,
      message: data.message,
      otp: data.otp,
      emailSent: data.emailSent
    };
  } catch (err) {
    console.error('Lỗi sendForgotPasswordOtp:', err);
    return {
      success: false,
      message: 'Không thể kết nối đến máy chủ SmartPark. Vui lòng kiểm tra lại dịch vụ.'
    };
  }
}

/**
 * Xác thực mã OTP và đặt lại mật khẩu mới
 */
export async function resetPasswordWithOtp(email, otp, newPassword) {
  try {
    const response = await fetch(`${API_BASE_URL}/forgot-password/verify-and-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'
      };
    }

    return {
      success: true,
      message: data.message
    };
  } catch (err) {
    console.error('Lỗi resetPasswordWithOtp:', err);
    return {
      success: false,
      message: 'Lỗi kết nối máy chủ xác thực: ' + err.message
    };
  }
}

/**
 * Hàm tương thích ngược với code cũ
 */
export async function authenticateUser(email, password) {
  return await loginUser(email, password);
}
