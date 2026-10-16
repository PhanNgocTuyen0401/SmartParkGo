// RoleExperienceModal.jsx – Hộp thoại "Trải nghiệm 1-Chạm" 3 Vai trò
// Chức năng: Giúp giảng viên hoặc khách dùng thử click 1 nút là đăng nhập ngay vào vai Admin, 
// Staff hoặc Customer mà không cần gõ mật khẩu.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Monitor,
  Car,
  ArrowRight,
  X,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Zap
} from 'lucide-react';

export default function RoleExperienceModal({ show, onClose }) {
  const navigate = useNavigate();
  const [loadingRole, setLoadingRole] = useState(null);

  if (!show) return null;

  const applyFallbackUser = (role) => {
    let mockUser;
    if (role === 'admin') {
      mockUser = {
        id: 'USR-03',
        email: 'admin@smartpark.vn',
        fullName: 'Quản Trị Viên Hệ Thống',
        role: 'admin',
        phone: '0912345678',
        loyaltyTier: 'Tổng Quản Trị',
        parkPoints: 9999
      };
    } else if (role === 'staff') {
      mockUser = {
        id: 'USR-02',
        email: 'staff@smartpark.vn',
        fullName: 'Nhân Viên Trực Bốt Đà Nẵng',
        role: 'staff',
        phone: '0905123789',
        loyaltyTier: 'Nhân viên trạm',
        parkPoints: 0
      };
    } else {
      mockUser = {
        id: 'USR-01',
        email: 'khachhang@smartpark.vn',
        fullName: 'Khách Hàng Trải Nghiệm',
        role: 'customer',
        phone: '0988123456',
        loyaltyTier: 'Thành viên Vàng',
        parkPoints: 1250
      };
    }
    localStorage.setItem('token', `exp_token_${role}_${Date.now()}`);
    localStorage.setItem('pf_current_user', JSON.stringify(mockUser));
  };

  const handleSelectRole = async (role) => {
    setLoadingRole(role);
    try {
      const res = await fetch('http://localhost:5000/api/auth/experience-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('pf_current_user', JSON.stringify(data.user));
      } else {
        applyFallbackUser(role);
      }
    } catch {
      applyFallbackUser(role);
    }

    setLoadingRole(null);
    onClose();

    if (role === 'admin') {
      navigate('/admin');
    } else if (role === 'staff') {
      navigate('/staff');
    } else {
      navigate('/home');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '980px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          color: '#f8fafc',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
              }}
            >
              <Zap size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                  Trải Nghiệm Hệ Thống SmartPark
                </h2>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  3 Phân Quyền
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Chọn 1 trong 3 vai trò bên dưới để trải nghiệm ngay mọi tính năng mà không cần nhập mật khẩu:
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.6rem',
              color: '#94a3b8',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Roles 3-Card Grid */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {/* CARD 1: ADMIN */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '1rem',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(14, 165, 233, 0.15)',
                    border: '1px solid rgba(14, 165, 233, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8'
                  }}
                >
                  <ShieldCheck size={24} />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.4rem',
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.25)'
                  }}
                >
                  Quản Trị Tối Cao
                </span>
              </div>

              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                Quản Trị Viên (Admin)
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45 }}>
                Bảng điều khiển trung tâm kiểm soát toàn bộ 5 chi nhánh SmartPark Đà Nẵng.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
                {[
                  'Báo cáo doanh thu & hóa đơn VAT điện tử',
                  'Phát hành Voucher ưu đãi & thông báo real-time',
                  'Cấu hình giá cước & giám sát barrier AI',
                  'Quản lý danh sách nhân viên trực trạm bốt'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <CheckCircle2 size={14} color="#38bdf8" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={loadingRole !== null}
              onClick={() => handleSelectRole('admin')}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.65rem',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
              }}
            >
              {loadingRole === 'admin' ? (
                <>Đang vào Admin...</>
              ) : (
                <>Trải nghiệm vai Admin <ArrowRight size={16} /></>
              )}
            </button>
          </div>

          {/* CARD 2: STAFF */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '1rem',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24'
                  }}
                >
                  <Monitor size={24} />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.4rem',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.25)'
                  }}
                >
                  Vận Hành Bốt Trực
                </span>
              </div>

              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                Nhân Viên Trực Bốt (Staff)
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45 }}>
                Trạm kiểm soát làn xe vào/ra, quét nhận diện biển số ANPR camera AI.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
                {[
                  'Camera AI quét biển số tự động 99.4%',
                  'Điều khiển thanh chắn barrier tự động',
                  'Xử lý xe ưu tiên khẩn cấp & tra cứu xe',
                  'Kiểm tra mã QR Barrier Pass nhanh chóng'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <CheckCircle2 size={14} color="#fbbf24" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={loadingRole !== null}
              onClick={() => handleSelectRole('staff')}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.65rem',
                border: 'none',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
              }}
            >
              {loadingRole === 'staff' ? (
                <>Đang vào Staff...</>
              ) : (
                <>Trải nghiệm vai Staff <ArrowRight size={16} /></>
              )}
            </button>
          </div>

          {/* CARD 3: CUSTOMER */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '1rem',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34d399'
                  }}
                >
                  <Car size={24} />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.4rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}
                >
                  Người Dùng App
                </span>
              </div>

              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                Khách Hàng (Customer)
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.45 }}>
                Ứng dụng đặt chỗ đỗ xe thông minh, thanh toán VietQR & nhận vé điện tử.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
                {[
                  'Tìm bãi đỗ còn chỗ & đặt trước theo giờ/tuần/tháng',
                  'Tự động gửi Hóa đơn điện tử VAT về Gmail',
                  'Nhận thông báo ưu đãi Voucher thời gian thực',
                  'Quét vé QR Barrier Pass tự động mở cổng'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <CheckCircle2 size={14} color="#34d399" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={loadingRole !== null}
              onClick={() => handleSelectRole('customer')}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.65rem',
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              {loadingRole === 'customer' ? (
                <>Đang vào Khách Hàng...</>
              ) : (
                <>Trải nghiệm vai Khách Hàng <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '1rem 1.75rem',
            background: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748b'
          }}
        >
          <span>💡 Bạn có thể chuyển đổi qua lại giữa các vai trò bất kỳ lúc nào từ thanh Menu trên cùng.</span>
          <span style={{ color: '#94a3b8' }}>SmartPark Đà Nẵng • 2026</span>
        </div>
      </div>
    </div>
  );
}
