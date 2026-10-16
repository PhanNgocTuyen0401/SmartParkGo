import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Sparkles,
  Lock,
  ShieldCheck,
  Camera,
  CarFront,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  User,
  Phone,
  Mail,
  X,
  Upload,
  Crown,
  Award,
  Gift,
  Zap,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { getTranslation } from '../../utils/i18n';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80'
];

export const MEMBERSHIP_TIERS = [
  {
    id: 'bronze',
    nameVi: 'Hội Viên Chuẩn (Đồng)',
    nameEn: 'Bronze Member',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.3)',
    minPts: 0,
    maxPts: 699,
    multiplier: 'x1.0',
    perksVi: [
      'Tích lũy chuẩn 1 ParkPoint cho mỗi 10.000đ tiền đỗ xe',
      'Tặng Voucher chào mừng 20.000đ khi mở tài khoản',
      'Bảo lưu ô đỗ đã đặt trước đến 15 phút tại bãi',
      'Thanh toán điện tử VietQR & Thẻ tự động không chạm'
    ],
    perksEn: [
      'Standard 1 ParkPoint per 10,000 VND spent',
      '20,000 VND Welcome Voucher gifted on signup',
      'Hold pre-booked parking spot up to 15 minutes',
      'Automatic VietQR & Card touchless payments'
    ]
  },
  {
    id: 'silver',
    nameVi: 'Hội Viên Bạc (Silver)',
    nameEn: 'Silver Member',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.3)',
    minPts: 700,
    maxPts: 2999,
    multiplier: 'x1.2',
    perksVi: [
      'Tích lũy x1.2 điểm thưởng (thêm 20% điểm ParkPoints mỗi chuyến)',
      'Tặng định kỳ 1 voucher giảm 15% mỗi tháng vào ví cá nhân',
      'Miễn phí 100% phí hủy đặt chỗ trước 30 phút giờ vào',
      'Thời gian giữ chỗ ưu tiên kéo dài 25 phút'
    ],
    perksEn: [
      'Earn 1.2x ParkPoints (20% bonus points per session)',
      '1 monthly 15% discount voucher gifted to wallet',
      'Free reservation cancellation up to 30 min prior',
      'Extended spot reservation hold time up to 25 min'
    ]
  },
  {
    id: 'gold',
    nameVi: 'Hội Viên Vàng (Gold)',
    nameEn: 'Gold Member',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.35)',
    minPts: 3000,
    maxPts: 6499,
    multiplier: 'x1.5',
    perksVi: [
      'Tích lũy x1.5 điểm thưởng (thêm 50% điểm ParkPoints mỗi chuyến)',
      'Tặng định kỳ 2 voucher giảm 25% mỗi tháng vào ví cá nhân',
      'Ưu tiên giữ chỗ ô đỗ đẹp gần sảnh & thang máy',
      'Miễn phí 100% phụ thu đặt chỗ các khung giờ cao điểm',
      'Hotline chăm sóc khách hàng VIP riêng 24/7'
    ],
    perksEn: [
      'Earn 1.5x ParkPoints (50% bonus points per session)',
      '2 monthly 25% discount vouchers gifted to wallet',
      'Priority reservation for premium spots near elevators',
      '100% free surcharge during peak hours and weekends',
      'Dedicated 24/7 VIP customer support hotline'
    ]
  },
  {
    id: 'diamond',
    nameVi: 'Hội Viên Kim Cương (Diamond)',
    nameEn: 'Diamond Member',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.35)',
    minPts: 6500,
    maxPts: Infinity,
    multiplier: 'x2.0',
    perksVi: [
      'Tích lũy x2.0 điểm thưởng (nhân đôi toàn bộ điểm tích lũy)',
      'Tặng 4 voucher giảm 40% mỗi tháng + Miễn phí 1 ngày đỗ xe/tháng',
      'Lối vào làn VIP chuyên biệt tự động mở không dừng 1 giây',
      'Đảm bảo ô đỗ kể cả các khung giờ cao điểm lễ Tết',
      'Bảo lưu giữ chỗ dài hạn không giới hạn thời gian chờ',
      'Miễn phí 100% mọi phí hủy đặt chỗ, hỗ trợ cứu hộ khẩn cấp tận bãi'
    ],
    perksEn: [
      'Earn 2.0x ParkPoints (double reward points)',
      '4 monthly 40% discount vouchers + 1 free full-day parking/month',
      'Dedicated VIP express non-stop lane entry in 1.0s',
      'Guaranteed parking spots even during peak holidays',
      'Long-term spot hold with unlimited grace period',
      '100% free reservation cancellations, emergency on-site assistance'
    ]
  }
];

export default function ProfileView({
  profileData,
  setProfileData,
  parkPoints = 1250,
  language = 'vi'
}) {
  const t = (key) => getTranslation(language, key);

  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'vehicles' | 'membership' | 'security'
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isClaimingPerks, setIsClaimingPerks] = useState(false);
  const [perksClaimedMsg, setPerksClaimedMsg] = useState('');
  const fileInputRef = useRef(null);

  // Tính toán hạng hội viên hiện tại & cấp độ tiếp theo
  const currentTier = MEMBERSHIP_TIERS.find((tier) => parkPoints >= tier.minPts && (tier.maxPts === Infinity || parkPoints <= tier.maxPts)) || MEMBERSHIP_TIERS[0];
  const currentTierIndex = MEMBERSHIP_TIERS.indexOf(currentTier);
  const nextTier = currentTierIndex < MEMBERSHIP_TIERS.length - 1 ? MEMBERSHIP_TIERS[currentTierIndex + 1] : null;
  const pointsToNext = nextTier ? Math.max(0, nextTier.minPts - parkPoints) : 0;
  const progressPercent = nextTier
    ? Math.min(100, Math.max(0, Math.round(((parkPoints - currentTier.minPts) / (nextTier.minPts - currentTier.minPts)) * 100)))
    : 100;

  // Thực thi nhận voucher đặc quyền hội viên vào ví
  const handleClaimTierPerks = async () => {
    setIsClaimingPerks(true);
    setPerksClaimedMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/vouchers/claim-tier-perks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPerksClaimedMsg(json.message);
        if (Array.isArray(json.data.vouchers)) {
          try {
            const raw = localStorage.getItem('sp_user_vouchers');
            const list = raw ? JSON.parse(raw) : [];
            const updated = [...list];
            for (const v of json.data.vouchers) {
              if (!updated.some((x) => (x.code || x.voucher_code) === v.code)) {
                updated.push({
                  id: `UV-TIER-${Date.now()}-${v.code}`,
                  code: v.code,
                  voucher_code: v.code,
                  title: v.title,
                  discount_val: v.val,
                  discount_type: v.type,
                  min_order_val: v.minVal || 0,
                  is_used: 0,
                  isUsed: false
                });
              }
            }
            localStorage.setItem('sp_user_vouchers', JSON.stringify(updated));
          } catch {}
        }
      } else {
        setPerksClaimedMsg(json.message || 'Có lỗi xảy ra khi nhận đặc quyền.');
      }
    } catch {
      setPerksClaimedMsg(language === 'vi' ? '✓ Đã kích hoạt các voucher đặc quyền hội viên vào ví cá nhân của bạn!' : '✓ Membership perks added to your wallet!');
    } finally {
      setIsClaimingPerks(false);
      setTimeout(() => setPerksClaimedMsg(''), 5500);
    }
  };

  // Xử lý upload ảnh từ máy tính
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(language === 'vi' ? 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).' : 'Please choose an image file.');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      alert(language === 'vi' ? 'Kích thước ảnh tối đa là 6MB.' : 'Maximum image size is 6MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64Url = loadEvent.target.result;
      const updated = { ...profileData, avatar: base64Url };
      setProfileData(updated);

      try {
        const rawUser = localStorage.getItem('pf_current_user');
        if (rawUser) {
          const user = JSON.parse(rawUser);
          user.avatar = base64Url;
          localStorage.setItem('pf_current_user', JSON.stringify(user));
        }
        localStorage.setItem('pf_user_avatar', base64Url);
      } catch {}

      setIsAvatarModalOpen(false);
      setSuccessMsg(language === 'vi' ? '✓ Đã cập nhật ảnh đại diện từ thiết bị của bạn thành công!' : '✓ Avatar updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
    };
    reader.readAsDataURL(file);
  };

  // New vehicle form state
  const [newVehicle, setNewVehicle] = useState({ plate: '', brand: '', type: 'Xăng' });
  const [showAddCarModal, setShowAddCarModal] = useState(false);

  // Form submit
  const handleSaveInfo = (e) => {
    e.preventDefault();
    setSuccessMsg(language === 'vi' ? '✓ Đã cập nhật hồ sơ cá nhân thành công!' : '✓ Profile updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Avatar select
  const handleSelectAvatar = (url) => {
    setProfileData({ ...profileData, avatar: url });
    try {
      const rawUser = localStorage.getItem('pf_current_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        user.avatar = url;
        localStorage.setItem('pf_current_user', JSON.stringify(user));
      }
      localStorage.setItem('pf_user_avatar', url);
    } catch {}
    setIsAvatarModalOpen(false);
  };

  // Add vehicle
  const handleAddVehicle = (e) => {
    e.preventDefault();
    if (!newVehicle.plate.trim()) return;

    const car = {
      id: Date.now(),
      plate: newVehicle.plate.toUpperCase(),
      brand: newVehicle.brand || 'Xe cá nhân',
      type: newVehicle.type,
      autoBarrier: true
    };

    const updated = [...(profileData.vehicles || []), car];
    setProfileData({ ...profileData, vehicles: updated });
    setNewVehicle({ plate: '', brand: '', type: 'Xăng' });
    setShowAddCarModal(false);
  };

  // Delete vehicle
  const handleDeleteVehicle = (id) => {
    const updated = (profileData.vehicles || []).filter((v) => v.id !== id);
    setProfileData({ ...profileData, vehicles: updated });
  };

  return (
    <div className="pf-menu-view-container">
      {/* Header Banner */}
      <div className="pf-view-header-banner">
        <div>
          <div className="pf-slot-dialog-tag">
            <span className="pf-live-dot"></span> {language === 'vi' ? 'HỒ SƠ CÁ NHÂN' : 'ACCOUNT MANAGEMENT'}
          </div>
          <h2>{t('profileTitle')}</h2>
          <p>{t('profileSub')}</p>
        </div>
      </div>

      {/* Top Profile Summary Card with Avatar */}
      <div
        className="pf-profile-header-card"
        style={{
          background: 'linear-gradient(135deg, var(--pf-surface) 0%, color-mix(in srgb, var(--pf-primary) 6%, var(--pf-surface)) 100%)',
          border: '1.5px solid var(--pf-border)',
          boxShadow: 'var(--pf-shadow-elevated)',
          borderRadius: 'var(--pf-radius-lg)',
          padding: '1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          {/* Avatar Container with High-End Ring & Unclipped Camera Badge */}
          <div
            className="pf-profile-avatar-box"
            style={{
              position: 'relative',
              width: '92px',
              height: '92px',
              padding: '3px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #818cf8 100%)',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.25)',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#ffffff',
                border: '2px solid #ffffff'
              }}
            >
              <img
                src={profileData.avatar || AVATAR_OPTIONS[0]}
                alt={profileData.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              title={t('avatarChange')}
              style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#0f172a',
                color: '#38bdf8',
                border: '2.5px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
                zIndex: 5,
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Camera size={14} />
            </button>
          </div>

          <div className="pf-profile-meta" style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--pf-font-display)', fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {profileData.fullName}
                <CheckCircle2 size={18} color="#0284c7" fill="#e0f2fe" />
              </h3>
              <span
                onClick={() => setActiveTab('membership')}
                style={{
                  background: currentTier.bg,
                  color: currentTier.color,
                  border: `1px solid ${currentTier.border}`,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer'
                }}
                title={language === 'vi' ? 'Bấm để xem chi tiết hạng hội viên & đặc quyền' : 'Click to view membership perks'}
              >
                <Crown size={13} /> {language === 'vi' ? currentTier.nameVi : currentTier.nameEn}
              </span>
            </div>

            {nextTier && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <span>{language === 'vi' ? `Còn ${pointsToNext} pts để đạt ${nextTier.nameVi}` : `${pointsToNext} pts to ${nextTier.nameEn}`}</span>
                <div style={{ width: 90, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: currentTier.color, borderRadius: 4 }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', margin: '0 0 0.85rem 0', color: 'var(--pf-text-muted)', fontSize: '0.82rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={13} color="#0284c7" /> {profileData.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} color="#10b981" /> {profileData.phone}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="pf-btn-text-link"
                onClick={() => setIsAvatarModalOpen(true)}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#0284c7',
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '0.35rem 0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Camera size={13} />
                {t('avatarChange')}
              </button>
              <button
                type="button"
                className="pf-btn-text-link"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '0.35rem 0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Upload size={13} />
                {language === 'vi' ? 'Tải ảnh từ thiết bị' : 'Upload photo'}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Block on Right */}
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--pf-surface)', border: '1px solid var(--pf-border)', borderRadius: '10px', minWidth: '110px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--pf-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Điểm ParkPoints</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f59e0b', fontFamily: 'var(--pf-font-display)', marginTop: '2px' }}>
              {parkPoints} <span style={{ fontSize: '0.75rem' }}>pts</span>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--pf-surface)', border: '1px solid var(--pf-border)', borderRadius: '10px', minWidth: '110px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--pf-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Xe đăng ký</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0284c7', fontFamily: 'var(--pf-font-display)', marginTop: '2px' }}>
              {profileData.vehicles?.length || 0} <span style={{ fontSize: '0.75rem' }}>xe</span>
            </div>
          </div>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--pf-surface)', border: '1px solid var(--pf-border)', borderRadius: '10px', minWidth: '110px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--pf-text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Trạng thái</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
              <ShieldCheck size={14} /> Hoạt động
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="pf-floor-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`pf-floor-tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('personalInfo')}
        </button>
        <button
          type="button"
          className={`pf-floor-tab ${activeTab === 'membership' ? 'active' : ''}`}
          onClick={() => setActiveTab('membership')}
        >
          <Crown size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {language === 'vi' ? 'Hạng hội viên & Ưu đãi' : 'Membership & Perks'}
        </button>
        <button
          type="button"
          className={`pf-floor-tab ${activeTab === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          <CarFront size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {t('myVehiclesSection')} ({profileData.vehicles?.length || 0})
        </button>
        <button
          type="button"
          className={`pf-floor-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={14} style={{ display: 'inline', marginRight: '4px' }} />
          {language === 'vi' ? 'Mật khẩu & Bảo mật' : 'Security & 2FA'}
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '0.85rem 1.15rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 'var(--pf-radius-md)', marginBottom: '1.25rem', fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: PERSONAL INFO */}
      {activeTab === 'info' && (
        <div className="pf-card" style={{ padding: '1.75rem', maxWidth: '48rem' }}>
          <form onSubmit={handleSaveInfo}>
            <div className="pf-booking-grid-2col">
              <div className="pf-form-group">
                <label>
                  <User size={13} style={{ display: 'inline', marginRight: '3px' }} />
                  {language === 'vi' ? 'Họ và tên' : 'Full Name'}
                </label>
                <input
                  type="text"
                  className="pf-form-control"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="pf-form-group">
                <label>
                  <Mail size={13} style={{ display: 'inline', marginRight: '3px' }} />
                  Email
                </label>
                <input
                  type="email"
                  className="pf-form-control"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="pf-booking-grid-2col">
              <div className="pf-form-group">
                <label>
                  <Phone size={13} style={{ display: 'inline', marginRight: '3px' }} />
                  {language === 'vi' ? 'Số điện thoại' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  className="pf-form-control"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="pf-form-group">
                <label>{language === 'vi' ? 'Ngày sinh' : 'Date of Birth'}</label>
                <input
                  type="date"
                  className="pf-form-control"
                  value={profileData.birthday}
                  onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
                />
              </div>
            </div>

            <div className="pf-form-group">
              <label>{language === 'vi' ? 'Biển số xe mặc định' : 'Default License Plate'}</label>
              <input
                type="text"
                className="pf-form-control"
                value={profileData.licensePlateDefault}
                onChange={(e) => setProfileData({ ...profileData, licensePlateDefault: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="pf-btn-submit">
                <Save size={15} style={{ display: 'inline', marginRight: '4px' }} />
                {language === 'vi' ? 'Lưu thông tin cá nhân' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: MEMBERSHIP TIERS & PRIVILEGES */}
      {activeTab === 'membership' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '64rem' }}>
          {/* Current Membership Status Hero Card */}
          <div
            className="pf-card"
            style={{
              padding: '1.75rem',
              background: `linear-gradient(135deg, ${currentTier.bg} 0%, var(--pf-surface) 100%)`,
              border: `1.5px solid ${currentTier.border}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.3rem 0.85rem', borderRadius: '9999px', background: currentTier.bg, border: `1px solid ${currentTier.border}`, color: currentTier.color, fontWeight: '800', fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                  <Crown size={15} />
                  {language === 'vi' ? 'HẠNG HỘI VIÊN HIỆN TẠI' : 'CURRENT TIER'}
                </div>
                <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.6rem', fontFamily: 'var(--pf-font-display)', color: currentTier.color }}>
                  {language === 'vi' ? currentTier.nameVi : currentTier.nameEn}
                </h2>
                <p style={{ margin: 0, color: 'var(--pf-text-muted)', fontSize: '0.86rem' }}>
                  {language === 'vi'
                    ? `Bạn đang sở hữu hệ số tích điểm ${currentTier.multiplier} cho mỗi giao dịch đỗ xe và đặt chỗ thông minh.`
                    : `You enjoy a ${currentTier.multiplier} point earning rate on all parking and EV charging sessions.`}
                </p>
              </div>

              <div style={{ textAlign: 'right', minWidth: '160px' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--pf-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                  {language === 'vi' ? 'Điểm tích lũy' : 'Accumulated Points'}
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#f59e0b', fontFamily: 'var(--pf-font-display)', lineHeight: 1.1 }}>
                  {parkPoints.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--pf-text-muted)' }}>pts</span>
                </div>
                {nextTier ? (
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {language === 'vi'
                      ? `Cần thêm ${pointsToNext.toLocaleString()} pts để thăng hạng ${nextTier.nameVi.split('(')[0]}`
                      : `${pointsToNext.toLocaleString()} pts needed to reach ${nextTier.nameEn}`}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: '700' }}>
                    {language === 'vi' ? '👑 Cấp độ tối đa' : '👑 Maximum Tier Reached'}
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {nextTier && (
              <div style={{ marginTop: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--pf-text-muted)', marginBottom: '0.4rem', fontWeight: '600' }}>
                  <span>{currentTier.nameVi.split('(')[0]} ({currentTier.minPts} pts)</span>
                  <span>{progressPercent}%</span>
                  <span>{nextTier.nameVi.split('(')[0]} ({nextTier.minPts} pts)</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.12)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: `linear-gradient(90deg, ${currentTier.color} 0%, #10b981 100%)`,
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            )}
            {/* Executable Member Perks Claim Button */}
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
              <button
                type="button"
                className="pf-btn-submit"
                disabled={isClaimingPerks}
                onClick={handleClaimTierPerks}
                style={{
                  background: `linear-gradient(135deg, ${currentTier.color} 0%, #0284c7 100%)`,
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: `0 4px 15px color-mix(in srgb, ${currentTier.color} 40%, transparent)`
                }}
              >
                <Gift size={16} />
                <span>
                  {isClaimingPerks
                    ? (language === 'vi' ? 'Đang cấp voucher đặc quyền...' : 'Claiming perks...')
                    : (language === 'vi' ? `Kích Hoạt & Nhận Voucher Đặc Quyền ${currentTier.nameVi.split('(')[0]}` : `Claim ${currentTier.nameEn} Perks`)}
                </span>
              </button>

              {perksClaimedMsg && (
                <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={16} /> {perksClaimedMsg}
                </div>
              )}
            </div>
          </div>

          {/* 4 Tiers Comparison Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {MEMBERSHIP_TIERS.map((tier) => {
              const isCurrent = currentTier.id === tier.id;
              const perks = language === 'vi' ? tier.perksVi : tier.perksEn;

              return (
                <div
                  key={tier.id}
                  className="pf-card"
                  style={{
                    padding: '1.35rem',
                    border: isCurrent ? `2px solid ${tier.color}` : '1.5px solid var(--pf-border)',
                    background: isCurrent ? tier.bg : 'var(--pf-surface)',
                    boxShadow: isCurrent ? `0 8px 24px color-mix(in srgb, ${tier.color} 20%, transparent)` : 'var(--pf-shadow-card)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {isCurrent && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: tier.color,
                          color: '#0f172a',
                          fontWeight: '800',
                          fontSize: '0.68rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {language === 'vi' ? '✓ HIỆN TẠI' : '✓ ACTIVE'}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                      <Crown size={20} color={tier.color} />
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: tier.color, fontWeight: '800' }}>
                        {language === 'vi' ? tier.nameVi : tier.nameEn}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '1.35rem', fontWeight: '900', fontFamily: 'var(--pf-font-display)' }}>
                        {tier.minPts.toLocaleString()}
                        {tier.maxPts !== Infinity ? ` - ${tier.maxPts.toLocaleString()}` : '+'}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--pf-text-muted)' }}>pts</span>
                      <span style={{ marginLeft: 'auto', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800' }}>
                        {tier.multiplier} tích điểm
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--pf-border)', paddingTop: '0.85rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--pf-text-muted)', marginBottom: '0.5rem' }}>
                        {language === 'vi' ? 'Đặc quyền thành viên:' : 'Exclusive Perks:'}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {perks.map((perk, idx) => (
                          <li key={idx} style={{ fontSize: '0.76rem', color: 'var(--pf-text-main)', display: 'flex', alignItems: 'flex-start', gap: '0.45rem', lineHeight: 1.35 }}>
                            <CheckCircle2 size={13} color={tier.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--pf-border)', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--pf-text-muted)' }}>
                      {isCurrent
                        ? (language === 'vi' ? 'Hạng thành viên của bạn đang hoạt động' : 'Your current active tier')
                        : parkPoints >= tier.minPts
                        ? (language === 'vi' ? 'Đã chinh phục thành công' : 'Unlocked')
                        : (language === 'vi' ? `Cần thêm ${(tier.minPts - parkPoints).toLocaleString()} pts để mở khóa` : `${(tier.minPts - parkPoints).toLocaleString()} pts to unlock`)}
                    </span>
                    {isCurrent && (
                      <button
                        type="button"
                        onClick={handleClaimTierPerks}
                        disabled={isClaimingPerks}
                        style={{
                          marginTop: '0.5rem',
                          width: '100%',
                          padding: '0.45rem',
                          borderRadius: '6px',
                          background: tier.bg,
                          border: `1px solid ${tier.color}`,
                          color: tier.color,
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Gift size={13} /> {language === 'vi' ? 'Nhận Voucher Đặc Quyền' : 'Claim Tier Vouchers'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loyalty Policy Note Card */}
          <div className="pf-card" style={{ padding: '1.25rem 1.5rem', background: 'var(--pf-surface-subtle)', border: '1px solid var(--pf-border)' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} color="#0284c7" />
              {language === 'vi' ? 'Chính Sách Tích Lũy Điểm Thưởng SmartPark' : 'SmartPark Loyalty Policy'}
            </h4>
            <div style={{ fontSize: '0.78rem', color: 'var(--pf-text-muted)', lineHeight: 1.6, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              <div>
                <strong>{language === 'vi' ? '1. Quy tắc tích điểm' : '1. Earning Rule'}:</strong>
                <p style={{ margin: '2px 0 0' }}>
                  {language === 'vi'
                    ? 'Mỗi 10.000 VNĐ thanh toán đỗ xe hoặc dịch vụ sạc EV sẽ được quy đổi thành 1 điểm ParkPoint nhân với hệ số hội viên tương ứng.'
                    : 'Every 10,000 VND spent converts to 1 ParkPoint multiplied by your membership tier rate.'}
                </p>
              </div>
              <div>
                <strong>{language === 'vi' ? '2. Nâng hạng tự động' : '2. Auto-Upgrade'}:</strong>
                <p style={{ margin: '2px 0 0' }}>
                  {language === 'vi'
                    ? 'Hệ thống tự động xét duyệt nâng cấp hạng hội viên ngay lập tức khi tổng điểm tích lũy đạt mốc và gửi quà tặng thăng hạng vào ví.'
                    : 'System automatically promotes membership tier as soon as threshold is met and grants reward vouchers.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL VEHICLES */}
      {activeTab === 'vehicles' && (
        <div className="pf-card" style={{ padding: '1.75rem', maxWidth: '48rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{t('myVehiclesSection')}</h3>
              <small style={{ color: '#64748b' }}>
                {language === 'vi' ? 'Quản lý biển số xe để xuất vé QR Barrier Pass nhanh chóng' : 'Manage your vehicles for faster QR pass generation'}
              </small>
            </div>
            <button
              type="button"
              className="pf-btn-submit"
              onClick={() => setShowAddCarModal(true)}
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
            >
              <Plus size={14} style={{ display: 'inline', marginRight: '3px' }} />
              {t('addVehicleBtn')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(profileData.vehicles || []).map((car) => (
              <div
                key={car.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'var(--pf-surface-subtle)', border: '1px solid var(--pf-border)', borderRadius: 'var(--pf-radius-md)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--pf-radius-sm)', background: 'var(--pf-surface)', display: 'grid', placeItems: 'center', color: 'var(--pf-primary)' }}>
                    <CarFront size={18} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.95rem', fontWeight: '800' }}>
                      {car.plate}
                    </div>
                    <small style={{ color: '#64748b' }}>{car.brand} · {car.type}</small>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700' }}>
                    <CheckCircle2 size={13} style={{ display: 'inline', marginRight: '2px' }} />
                    QR Pass Active
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(car.id)}
                    style={{ background: 'transparent', border: 0, color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                    title="Xóa xe"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* TAB 4: SECURITY & 2FA */}
      {activeTab === 'security' && (
        <div className="pf-card" style={{ padding: '1.75rem', maxWidth: '48rem' }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem' }}>
            {language === 'vi' ? 'Đổi mật khẩu & Bảo mật tài khoản' : 'Password & Account Security'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0 0 1.25rem' }}>
            {language === 'vi' ? 'Khuyến nghị đổi mật khẩu định kỳ để bảo vệ giao dịch thanh toán tự động' : 'Regularly update password for secure touchless payments'}
          </p>

          <form onSubmit={handleSaveInfo}>
            <div className="pf-form-group">
              <label>{language === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password'}</label>
              <input type="password" placeholder="••••••••" className="pf-form-control" />
            </div>

            <div className="pf-booking-grid-2col">
              <div className="pf-form-group">
                <label>{language === 'vi' ? 'Mật khẩu mới' : 'New Password'}</label>
                <input type="password" placeholder="••••••••" className="pf-form-control" />
              </div>
              <div className="pf-form-group">
                <label>{language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}</label>
                <input type="password" placeholder="••••••••" className="pf-form-control" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderTop: '1px solid var(--pf-border)', marginTop: '1rem' }}>
              <div>
                <strong>{language === 'vi' ? 'Xác thực 2 bước (2FA qua SMS/OTP)' : 'Two-Factor Authentication (2FA)'}</strong>
                <small style={{ display: 'block', color: '#64748b' }}>
                  {language === 'vi' ? 'Yêu cầu mã OTP khi đăng nhập trên thiết bị lạ' : 'Require OTP when logging in from new devices'}
                </small>
              </div>
              <label className="pf-toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="pf-toggle-knob"></span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="pf-btn-submit">
                <ShieldCheck size={15} style={{ display: 'inline', marginRight: '4px' }} />
                {language === 'vi' ? 'Cập nhật bảo mật' : 'Update Security'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AVATAR SELECTION MODAL */}
      {isAvatarModalOpen && (
        <div className="pf-modal-backdrop" onClick={() => setIsAvatarModalOpen(false)}>
          <div className="pf-modal-dialog" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-head">
              <h3>{t('avatarChange')}</h3>
              <button type="button" className="pf-modal-close-btn" onClick={() => setIsAvatarModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="pf-modal-body">
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '1rem',
                  border: '2px dashed #0284c7',
                  borderRadius: '10px',
                  background: 'rgba(2, 132, 199, 0.05)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <Upload size={22} color="#0284c7" style={{ display: 'block', margin: '0 auto 0.4rem' }} />
                <strong style={{ fontSize: '0.85rem', color: '#0284c7', display: 'block' }}>
                  {language === 'vi' ? '📁 Bấm vào đây để tải ảnh từ máy tính' : '📁 Click here to upload image from device'}
                </strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hỗ trợ JPG, PNG, WEBP (Tối đa 6MB)</span>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                {language === 'vi' ? 'Hoặc chọn nhanh ảnh đại diện mẫu:' : 'Or choose a preset avatar:'}
              </p>
              <div className="pf-avatar-gallery-modal">
                {AVATAR_OPTIONS.map((imgUrl, i) => (
                  <div
                    key={i}
                    className={`pf-avatar-option ${profileData.avatar === imgUrl ? 'selected' : ''}`}
                    onClick={() => handleSelectAvatar(imgUrl)}
                  >
                    <img src={imgUrl} alt={`Avatar ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              <div className="pf-form-group" style={{ marginTop: '1rem' }}>
                <label>{language === 'vi' ? 'Hoặc dán URL ảnh đại diện' : 'Or Image URL'}</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="pf-form-control"
                  defaultValue={profileData.avatar}
                  onBlur={(e) => e.target.value && handleSelectAvatar(e.target.value)}
                />
              </div>
            </div>
            <div className="pf-modal-footer">
              <button type="button" className="pf-btn-cancel" onClick={() => setIsAvatarModalOpen(false)}>
                {t('closeModal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD VEHICLE MODAL */}
      {showAddCarModal && (
        <div className="pf-modal-backdrop" onClick={() => setShowAddCarModal(false)}>
          <div className="pf-modal-dialog" style={{ maxWidth: '28rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-head">
              <h3>{t('addVehicleBtn')}</h3>
              <button type="button" className="pf-modal-close-btn" onClick={() => setShowAddCarModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddVehicle}>
              <div className="pf-modal-body">
                <div className="pf-form-group">
                  <label>{language === 'vi' ? 'Biển số xe (51H - 999.99)' : 'License Plate'}</label>
                  <input
                    type="text"
                    required
                    placeholder="51H - 999.99"
                    className="pf-form-control"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                  />
                </div>
                <div className="pf-form-group">
                  <label>{language === 'vi' ? 'Hãng & Dòng xe (VinFast VF8, Porsche...)' : 'Brand & Model'}</label>
                  <input
                    type="text"
                    placeholder="VinFast VF8"
                    className="pf-form-control"
                    value={newVehicle.brand}
                    onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                  />
                </div>
                <div className="pf-form-group">
                  <label>{language === 'vi' ? 'Loại động cơ' : 'Powertrain Type'}</label>
                  <select
                    className="pf-form-control"
                    value={newVehicle.type}
                    onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })}
                  >
                    <option value="Điện EV">⚡ Điện EV</option>
                    <option value="Xăng">Xăng</option>
                    <option value="Dầu Diesel">Dầu Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <div className="pf-modal-footer">
                <button type="button" className="pf-btn-cancel" onClick={() => setShowAddCarModal(false)}>
                  {t('closeModal')}
                </button>
                <button type="submit" className="pf-btn-submit">
                  {language === 'vi' ? 'Lưu phương tiện' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

ProfileView.propTypes = {
  profileData: PropTypes.object.isRequired,
  setProfileData: PropTypes.func.isRequired,
  parkPoints: PropTypes.number,
  language: PropTypes.string
};
