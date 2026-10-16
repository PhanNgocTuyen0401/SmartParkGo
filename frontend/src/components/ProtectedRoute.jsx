import { Navigate } from 'react-router-dom';

/**
 * Component bảo vệ phân quyền tuyến đường (Role-Based Access Control)
 * - Admin: Chỉ tài khoản có role === 'admin'
 * - Staff: Chỉ tài khoản có role === 'staff' hoặc 'admin'
 * - Customer: Tài khoản khách hàng đăng nhập hoặc khách đang trải nghiệm
 */

// ProtectedRoute.jsx – Cổng Gác Bảo vệ Phân quyền Tuyến đường
// Chức năng: Nhận danh sách vai trò cho phép allowedRoles. Kiểm tra Token và thông tin User trong localStorage. Nếu chưa đăng nhập 
// →
// → chuyển hướng về /login. Nếu vai trò không khớp 
// →
// → đẩy về đúng trang quyền hạn của họ.


export default function ProtectedRoute({ allowedRoles = [], children }) {
  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('pf_current_user');

  if (!token || !rawUser) {
    return <Navigate to="/login" replace />;
  }

  let user = null;
  try {
    user = JSON.parse(rawUser);
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('pf_current_user');
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.role || 'customer').toLowerCase();

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Nếu là admin cố tình vào trang khác thì vẫn cho phép, nhưng khách hàng không được vào admin/staff
    if (userRole === 'admin') {
      return children;
    }
    if (userRole === 'staff') {
      return <Navigate to="/staff" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}
