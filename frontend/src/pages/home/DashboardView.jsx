// DashboardView.jsx (Bảng điều khiển Tổng quan): 
// Nhiệm vụ: Hiển thị thẻ xe đang đỗ trong bãi (thời gian đỗ thực tế chạy từng giây, 
//   số tiền tạm tính hiện tại, nút mở nhanh mã QR vé và chỉ đường ra xe).

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';
import {
  CarFront,
  MapPin,
  QrCode,
  ParkingSquare,
  CreditCard,
  Headphones,
  ChevronRight,
  ChevronLeft,
  Clock,
  Plus,
  Layers,
  Sparkles,
  Navigation,
  Bot,
  Tag,
  ShieldCheck
} from 'lucide-react';
import { getTranslation } from '../../utils/i18n';

const HERO_SLIDES = [
  {
    tag: '✦ HỆ THỐNG ĐỖ XE THÔNG MINH 2026',
    tagEn: '✦ SMART PARKING SYSTEM 2026',
    title: 'Đặt chỗ trước giờ cao điểm – Không còn nỗi lo hết chỗ đỗ',
    titleEn: 'Reserve Ahead of Peak Hours – Never Worry About Full Garages',
    desc: 'Bảo lưu vị trí đỗ bạn chọn đến 60 phút. Cổng tự động nâng hạ với thẻ vé số QR Barrier Pass không cần dừng xe.',
    descEn: 'Hold your preferred spot for up to 60 minutes. Touchless QR Barrier Pass grants smooth gate access.',
    ctaPrimary: 'Khám phá sơ đồ bãi xe',
    ctaPrimaryEn: 'Explore Garage Layout',
    ctaSecondary: 'Xem chi nhánh gần nhất',
    ctaSecondaryEn: 'Nearest Facilities',
    badgeText: 'Giữ chỗ 60 phút',
    badgeTextEn: '60-min Hold',
    badgeSub: 'Bảo đảm 100% có chỗ',
    badgeSubEn: '100% Guaranteed',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 60%, #0f172a 100%)',
    accentColor: '#38bdf8'
  },
  {
    tag: '⚡ VÉ ĐIỆN TỬ QR BARRIER PASS',
    tagEn: '⚡ DIGITAL QR BARRIER PASS',
    title: 'Vào ra cổng không dừng – Quét mã QR Pass chỉ trong 0.28 giây',
    titleEn: 'Touchless Entry & Exit – Scan QR Barrier Pass in 0.28 seconds',
    desc: 'Không cần bấm lấy thẻ nhựa, không sợ mất thẻ vé. Vé điện tử tích hợp ngay trên màn hình điện thoại của bạn.',
    descEn: 'Zero paper tickets, zero plastic cards. Your digital pass is always accessible on your mobile phone.',
    ctaPrimary: 'Xem vé QR Pass của tôi',
    ctaPrimaryEn: 'View My QR Pass',
    ctaSecondary: 'Xem hướng dẫn vào cổng',
    ctaSecondaryEn: 'Gate Entry Guide',
    badgeText: 'Phản hồi 0.28s',
    badgeTextEn: '0.28s Speed',
    badgeSub: 'Không chạm · Tiện lợi',
    badgeSubEn: 'Touchless · Instant',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0284c7 100%)',
    accentColor: '#10b981'
  },
  {
    tag: '💳 THANH TOÁN ĐIỆN TỬ TIỆN LỢI',
    tagEn: '💳 DIGITAL CASHLESS PAYMENTS',
    title: 'Thanh toán trực tuyến qua MoMo, ZaloPay & Ngân hàng',
    titleEn: 'Easy Online Payment with MoMo, ZaloPay & Banks',
    desc: 'Thanh toán tiện lợi qua ví điện tử hoặc chuyển khoản VietQR khi ra cổng. Không cần chuẩn bị tiền mặt, nhận hóa đơn điện tử VAT tức thì.',
    descEn: 'Link your e-wallet or bank account for seamless barrier payments upon exit. Instant electronic VAT invoices.',
    ctaPrimary: 'Liên kết phương thức thanh toán',
    ctaPrimaryEn: 'Manage Linked Wallets',
    ctaSecondary: 'Chính sách hoàn tiền',
    ctaSecondaryEn: 'Cashback Policy',
    badgeText: 'Hoàn tiền 10%',
    badgeSub: 'Áp dụng mọi chi nhánh',
    badgeSubEn: 'All Facilities',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 60%, #0f172a 100%)',
    accentColor: '#38bdf8'
  }
];

const FLOOR_DATA = {
  B1: {
    spots: [
      { id: 'A-01', status: 'available' },
      { id: 'A-02', status: 'available' },
      { id: 'A-03', status: 'available' },
      { id: 'A-04', status: 'available' },
      { id: 'A-05', status: 'available' },
      { id: 'A-06', status: 'available' },
      { id: 'A-07', status: 'available' },
      { id: 'A-08', status: 'available' },
      { id: 'A-09', status: 'available' },
      { id: 'A-10', status: 'available' },
      { id: 'A-11', status: 'available' },
      { id: 'A-12', status: 'available' },
    ]
  },
  B2: {
    spots: [
      { id: 'B-01', status: 'available' },
      { id: 'B-02', status: 'available' },
      { id: 'B-03', status: 'available' },
      { id: 'B-04', status: 'available' },
      { id: 'B-05', status: 'available' },
      { id: 'B-06', status: 'available' },
      { id: 'B-07', status: 'available' },
      { id: 'B-08', status: 'available' },
      { id: 'B-09', status: 'available' },
      { id: 'B-10', status: 'available' },
      { id: 'B-11', status: 'available' },
      { id: 'B-12', status: 'available' },
    ]
  },
  B3: {
    spots: [
      { id: 'V-01', status: 'available', isVip: true },
      { id: 'V-02', status: 'available', isVip: true },
      { id: 'V-03', status: 'available', isVip: true },
      { id: 'V-04', status: 'available', isVip: true },
      { id: 'V-05', status: 'available', isVip: true },
      { id: 'V-06', status: 'available', isVip: true },
      { id: 'V-07', status: 'available', isVip: true },
      { id: 'V-08', status: 'available', isVip: true },
      { id: 'V-09', status: 'available', isVip: true },
      { id: 'V-10', status: 'available', isVip: true },
      { id: 'V-11', status: 'available', isVip: true },
      { id: 'V-12', status: 'available', isVip: true },
    ]
  }
};

function getBranchKey(branchName) {
  if (!branchName) return 'Aeon Mall';
  if (branchName.includes('Aeon')) return 'Aeon Mall';
  if (branchName.includes('Vincom')) return 'Vincom';
  if (branchName.includes('Sân Bay') || branchName.includes('Airport')) return 'Sân Bay';
  if (branchName.includes('Lotte')) return 'Lotte';
  if (branchName.includes('Indochina')) return 'Indochina';
  return 'Aeon Mall';
}

function getBranchId(branchName = '') {
  if (branchName.includes('Aeon')) return 'BR-01';
  if (branchName.includes('Vincom')) return 'BR-02';
  if (branchName.includes('Sân Bay') || branchName.includes('Airport')) return 'BR-03';
  if (branchName.includes('Lotte')) return 'BR-04';
  if (branchName.includes('Indochina')) return 'BR-05';
  return 'BR-01';
}

export default function DashboardView({
  onNavigateMenu,
  onOpenQrModal,
  onOpenBookingModal,
  onOpenSupport,
  onOpenAi,
  elapsedSeconds,
  formatTimer,
  estimatedFee,
  activeSession,
  selectedBranch,
  language = 'vi'
}) {
  const t = (key) => getTranslation(language, key);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideTransition, setSlideTransition] = useState(true);
  const [activeFloor, setActiveFloor] = useState('B2');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [liveSpots, setLiveSpots] = useState(null);

  const branchKey = getBranchKey(selectedBranch);
  const availableFloors = branchKey === 'Sân Bay' ? ['G', 'T1', 'T2'] : branchKey === 'Lotte' ? ['G', 'B1'] : branchKey === 'Vincom' || branchKey === 'Indochina' ? ['B1', 'B2'] : ['B1', 'B2', 'B3'];

  // Đồng bộ tầng khi đổi chi nhánh
  useEffect(() => {
    if (!availableFloors.includes(activeFloor)) {
      setActiveFloor(availableFloors[0] || 'B1');
    }
  }, [selectedBranch]);

  // Tải ô đỗ thời gian thực từ PostgreSQL Server & Socket.IO
  useEffect(() => {
    const branchId = getBranchId(selectedBranch);
    const fetchSlots = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/parking/slots/${branchId}/${activeFloor}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setLiveSpots(json.data);
        }
      } catch (err) {
        console.warn('Lỗi tải slots dashboard:', err);
      }
    };
    fetchSlots();
    const interval = setInterval(fetchSlots, 4000);

    let socket;
    try {
      socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
      socket.on('slot:status_changed', (data) => {
        if (!data) return;
        const curBranch = getBranchId(selectedBranch);
        if (!data.branchId || data.branchId === curBranch) {
          fetchSlots();
        }
      });
      socket.on('slots:update', (data) => {
        fetchSlots();
      });
    } catch {}

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [selectedBranch, activeFloor]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideTransition(false);
      setTimeout(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
        setSlideTransition(true);
      }, 150);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (idx) => {
    setSlideTransition(false);
    setTimeout(() => {
      setCurrentSlideIndex(idx);
      setSlideTransition(true);
    }, 150);
  };

  const currentSlide = HERO_SLIDES[currentSlideIndex] || HERO_SLIDES[0];
  const fallbackSpots = FLOOR_DATA[activeFloor]?.spots || FLOOR_DATA.B1.spots;
  const currentFloorSpots = liveSpots && liveSpots.length > 0 ? liveSpots : fallbackSpots;
  const availableCount = currentFloorSpots.filter((s) => s.status === 'available').length;
  const reservedCount = currentFloorSpots.filter((s) => s.status === 'reserved').length;
  const occupiedCount = currentFloorSpots.filter((s) => s.status === 'occupied').length;

  return (
    <div className="pf-menu-view-container">

      {/* ── 1. HERO SLIDESHOW (ON TOP) ── */}
      <section className="pf-hero-slider">
        <div
          className={`pf-slide-box ${slideTransition ? 'visible' : 'hidden'}`}
          style={{ background: currentSlide.gradient }}
        >
          <div className="pf-slide-orb pf-slide-orb-1" style={{ '--orb-color': currentSlide.accentColor }}></div>
          <div className="pf-slide-orb pf-slide-orb-2"></div>
          <div className="pf-slide-grid-overlay"></div>

          <div className="pf-slide-content">
            <span className="pf-slide-tag" style={{ '--tag-color': currentSlide.accentColor }}>
              {language === 'vi' ? currentSlide.tag : currentSlide.tagEn}
            </span>
            <h2 className="pf-slide-title">
              {language === 'vi' ? currentSlide.title : currentSlide.titleEn}
            </h2>
            <p className="pf-slide-desc">
              {language === 'vi' ? currentSlide.desc : currentSlide.descEn}
            </p>

            <div className="pf-slide-actions">
              <button
                className="pf-slide-cta-primary"
                style={{ '--btn-accent': currentSlide.accentColor }}
                onClick={() => {
                  if (currentSlideIndex === 2) {
                    onNavigateMenu('Thanh toán & Liên kết');
                  } else {
                    onOpenBookingModal();
                  }
                }}
              >
                <Plus size={16} />
                <span>{language === 'vi' ? currentSlide.ctaPrimary : currentSlide.ctaPrimaryEn}</span>
              </button>
              <button
                className="pf-slide-cta-secondary"
                onClick={() => onNavigateMenu('Bản đồ trực tiếp')}
              >
                <span>{language === 'vi' ? currentSlide.ctaSecondary : currentSlide.ctaSecondaryEn}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="pf-slide-visual">
            <div className="pf-slide-badge-card" style={{ '--badge-accent': currentSlide.accentColor }}>
              <div className="pf-slide-badge-icon">
                <ShieldCheck size={24} style={{ color: '#ffffff' }} />
              </div>
              <strong className="pf-slide-badge-text">
                {language === 'vi' ? currentSlide.badgeText : (currentSlide.badgeTextEn || currentSlide.badgeText)}
              </strong>
              <small className="pf-slide-badge-sub">
                {language === 'vi' ? currentSlide.badgeSub : (currentSlide.badgeSubEn || currentSlide.badgeSub)}
              </small>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="pf-slider-footer">
          <div className="pf-slider-dots">
            {HERO_SLIDES.map((_, sIdx) => (
              <button
                key={sIdx}
                className={`pf-slide-dot ${sIdx === currentSlideIndex ? 'active' : ''}`}
                onClick={() => goToSlide(sIdx)}
                aria-label={`Slide ${sIdx + 1}`}
              />
            ))}
          </div>
          <div className="pf-slider-nav-btns">
            <button
              className="pf-slider-arrow"
              onClick={() => goToSlide(currentSlideIndex === 0 ? HERO_SLIDES.length - 1 : currentSlideIndex - 1)}
              aria-label="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="pf-slider-arrow"
              onClick={() => goToSlide((currentSlideIndex + 1) % HERO_SLIDES.length)}
              aria-label="Next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. GỢI Ý TRỢ LÝ AI & QUẢNG CÁO ƯU ĐÃI VOUCHER (DIRECTLY UNDER SLIDE) ── */}
      <div className="pf-ai-suggestions-panel">
        <div className="pf-ai-suggestions-head">
          <div className="pf-ai-head-title">
            <Bot size={18} color="#0284c7" />
            <span>{t('aiSuggestionsTitle')}</span>
          </div>
          <button
            className="pf-btn-text-link"
            onClick={() => onNavigateMenu('Vouchers')}
            style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0284c7' }}
          >
            {language === 'vi' ? 'Xem kho voucher →' : 'View vouchers →'}
          </button>
        </div>

        <div className="pf-ai-suggestions-grid">
          {/* Card 1 */}
          <div
            className="pf-suggestion-card"
            onClick={() => onOpenBookingModal()}
          >
            <div className="pf-suggestion-icon-wrap">
              <Sparkles size={16} />
            </div>
            <div className="pf-suggestion-body">
              <strong>{language === 'vi' ? 'Gợi ý giờ đỗ xe thông minh' : 'Smart Parking Advice'}</strong>
              <p>{t('aiSuggest1')}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="pf-suggestion-card"
            onClick={() => onNavigateMenu('Vouchers')}
          >
            <div className="pf-suggestion-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Tag size={16} />
            </div>
            <div className="pf-suggestion-body">
              <strong>{language === 'vi' ? 'Ưu đãi cuối tuần 25%' : 'Weekend 25% Off'}</strong>
              <p>{t('aiSuggest2')}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div
            className="pf-suggestion-card"
            onClick={() => onOpenBookingModal()}
          >
            <div className="pf-suggestion-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <ParkingSquare size={16} />
            </div>
            <div className="pf-suggestion-body">
              <strong>{language === 'vi' ? 'Không gian tầng B2 rộng rãi' : 'Spacious Level B2'}</strong>
              <p>{t('aiSuggest3')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. BENTO GRID ──────────────────────────────────────────── */}
      <div className="pf-section-header">
        <div className="pf-section-header-left">
          <h2 className="pf-section-title">
            {language === 'vi' ? 'Hệ thống điều hành bãi đỗ xe' : 'Parking Operations Hub'}
          </h2>
          <span className="pf-section-live-chip">
            <span className="pf-live-dot"></span> {t('liveSystem')}
          </span>
        </div>
        <p className="pf-section-desc">
          {language === 'vi'
            ? 'Theo dõi phiên đỗ xe thực tế và kiểm soát ra vào qua mã QR Barrier Pass'
            : 'Monitor active sessions and touchless gate access via QR Barrier Pass'}
        </p>
      </div>

      <div className="pf-bento-grid">

        {/* CARD 1: PHIÊN GỬI XE ĐANG HOẠT ĐỘNG (Span 7) HOẶC EMPTY STATE */}
        {activeSession && activeSession.isActive ? (
          <article className="pf-card pf-card-active-session">
            <div className="pf-card-active-header">
              <div className="pf-card-active-tag">
                <span className="pf-live-dot"></span>
                <span>{t('activeSession')}</span>
              </div>
              <div className="pf-card-active-location">
                <MapPin size={14} color="#0284c7" />
                <span>{activeSession.branch ? `${activeSession.branch} · ${activeSession.slot}` : (activeSession.slot || 'Bãi đỗ xe')}</span>
              </div>
            </div>

            <div className="pf-active-session-body">
              {/* License plate */}
              <div className="pf-plate-display">
                <div className="pf-plate-inner">
                  <CarFront size={20} color="#0284c7" />
                  <span className="pf-plate-number">{activeSession.plate}</span>
                </div>
                <div className="pf-plate-model">{activeSession.model || 'Xe cá nhân'} · {activeSession.slotDetails || 'Ô đỗ chỉ định'}</div>
              </div>

              {/* Timer */}
              <div className="pf-timer-block">
                <div className="pf-timer-label">
                  <Clock size={13} /> {t('realtimeDuration')}
                </div>
                <div className="pf-timer-digit">{formatTimer(elapsedSeconds)}</div>
                <div className="pf-fee-row">
                  <span>{t('estFee')}</span>
                  <strong>{(estimatedFee || 0).toLocaleString('vi-VN')}đ</strong>
                </div>
              </div>
            </div>

            <div className="pf-active-session-actions">
              <button className="pf-btn-qr-active" onClick={onOpenQrModal}>
                <QrCode size={15} />
                <span>{t('openQrPass')}</span>
              </button>
              <button className="pf-btn-extend" onClick={() => alert(language === 'vi' ? 'Đã gia hạn đỗ xe thêm 2 giờ!' : 'Extended stay by 2 hours!')}>
                {t('extendStay')}
              </button>
              <button className="pf-btn-extend" onClick={() => onOpenAi()}>
                <Navigation size={13} /> {t('findMyCar')}
              </button>
            </div>
          </article>
        ) : (
          <article className="pf-card pf-card-active-session" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2.5rem 1.5rem', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.04) 0%, rgba(15, 23, 42, 0.02) 100%)', border: '1.5px dashed var(--pf-border)' }}>
            <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'grid', placeItems: 'center', marginBottom: '1rem' }}>
              <ParkingSquare size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: '0 0 0.4rem', color: 'var(--pf-text-main)' }}>
              {language === 'vi' ? 'Chưa có phiên đỗ xe nào đang hoạt động' : 'No Active Parking Session'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--pf-text-muted)', margin: '0 0 1.25rem', maxWidth: '24rem', lineHeight: 1.5 }}>
              {language === 'vi'
                ? 'Bạn hiện không có xe nào đang lưu bãi. Hãy đặt chỗ trước ngay bây giờ để được giữ chỗ và qua cổng barrier tự động!'
                : 'You have no vehicles currently parked. Book a spot ahead of time to secure your bay and enjoy touchless entry!'}
            </p>
            <button
              className="pf-btn-qr-active"
              onClick={onOpenBookingModal}
              style={{ width: 'auto', padding: '0.65rem 1.5rem', borderRadius: '9999px' }}
            >
              <Plus size={16} />
              <span>{language === 'vi' ? 'Đặt chỗ giữ ô ngay' : 'Book a Spot Now'}</span>
            </button>
          </article>
        )}

        {/* CARD 2: TIỆN ÍCH THAO TÁC NHANH (Span 5) */}
        <article className="pf-card pf-card-quick-actions">
          <div className="pf-card-head">
            <div>
              <span className="pf-card-overline">{language === 'vi' ? 'TIỆN ÍCH NHANH' : 'SMART ACTIONS'}</span>
              <h3 className="pf-card-title">{t('quickOps')}</h3>
            </div>
          </div>

          <div className="pf-quick-action-list">
            {[
              {
                icon: ParkingSquare,
                title: t('bookAhead'),
                sub: t('bookAheadSub'),
                action: onOpenBookingModal,
                badge: null,
                color: '#0284c7'
              },
              {
                icon: QrCode,
                title: t('barrierPassTitle'),
                sub: t('barrierPassSub'),
                action: onOpenQrModal,
                badge: null,
                color: '#0284c7'
              },
              {
                icon: CreditCard,
                title: t('linkWallets'),
                sub: t('linkWalletsSub'),
                action: () => onNavigateMenu('Thanh toán & Liên kết'),
                badge: '10% CB',
                color: '#0284c7'
              },
              {
                icon: Headphones,
                title: t('hotlineSupport'),
                sub: t('hotlineSupportSub'),
                action: onOpenSupport,
                badge: '24/7',
                color: '#10b981'
              }
            ].map((item, i) => (
              <button key={i} className="pf-quick-action-btn" onClick={item.action}>
                <div className="pf-qa-icon" style={{ '--qa-color': item.color }}>
                  <item.icon size={18} style={{ color: item.color }} />
                </div>
                <div className="pf-qa-text">
                  <strong>{item.title}</strong>
                  <small>{item.sub}</small>
                </div>
                <div className="pf-qa-right">
                  {item.badge && <span className="pf-qa-badge">{item.badge}</span>}
                  <ChevronRight size={15} color="#94a3b8" />
                </div>
              </button>
            ))}
          </div>
        </article>

        {/* CARD 3: SƠ ĐỒ BÃI ĐỖ TRỰC QUAN (Span 8) */}
        <article className="pf-card pf-card-live-map">
          <div className="pf-card-head">
            <div>
              <span className="pf-card-overline">
                <Layers size={13} style={{ display: 'inline', marginRight: '4px' }} />
                {t('floorMapTitle')}
              </span>
              <h3 className="pf-card-title">
                {language === 'vi' ? 'Chọn ô đỗ xe trực quan' : 'Interactive Spot Matrix'}
              </h3>
            </div>
            <div className="pf-floor-tabs">
              {availableFloors.map((fl) => (
                <button
                  key={fl}
                  className={`pf-floor-tab ${activeFloor === fl ? 'active' : ''}`}
                  onClick={() => setActiveFloor(fl)}
                >
                  {language === 'vi' ? `Tầng ${fl}` : `Level ${fl}`}
                  {fl === 'B3' && <span className="pf-floor-tab-badge vip">VIP</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-map-controls">
            <div className="pf-map-legend">
              <div className="pf-legend-item">
                <div className="pf-legend-dot available"></div>
                <span>{language === 'vi' ? `Trống (${availableCount})` : `Free (${availableCount})`}</span>
              </div>
              <div className="pf-legend-item">
                <div className="pf-legend-dot reserved"></div>
                <span>{language === 'vi' ? `Đã đặt (${reservedCount})` : `Reserved (${reservedCount})`}</span>
              </div>
              <div className="pf-legend-item">
                <div className="pf-legend-dot occupied"></div>
                <span>{language === 'vi' ? `Đang đỗ (${occupiedCount})` : `Busy (${occupiedCount})`}</span>
              </div>
            </div>
          </div>

          <div className="pf-floor-matrix-container">
            <div className="pf-slots-row">
              {currentFloorSpots.slice(0, 6).map((slot) => (
                <div
                  key={slot.id}
                  className={`pf-slot-item ${slot.status} ${selectedSlot === slot.id ? 'selected' : ''}`}
                  onClick={() => slot.status === 'available' && setSelectedSlot(slot.id)}
                >
                  <span className="pf-slot-code">{slot.id}</span>
                  <div className="pf-slot-icon">
                    {slot.status === 'occupied' && <CarFront size={20} color="#9ca3af" />}
                    {slot.status === 'reserved' && <Clock size={17} color="#f59e0b" />}
                    {slot.status === 'available' && <Plus size={18} color="#10b981" />}
                    {slot.status === 'selected' && <CarFront size={20} color="#0284c7" />}
                  </div>
                  <span className="pf-slot-tag">
                    {slot.status === 'reserved'
                      ? (language === 'vi' ? 'Đã đặt' : 'Reserved')
                      : slot.status === 'occupied'
                        ? (language === 'vi' ? 'Đang đỗ' : 'Busy')
                        : slot.isVip
                          ? '✦ VIP'
                          : slot.isEv
                            ? '⚡ EV'
                            : (language === 'vi' ? 'Trống' : 'Free')}
                  </span>
                </div>
              ))}
            </div>
            <div className="pf-aisle-lane">
              ▲ {language === 'vi' ? 'LÀN XE LƯU THÔNG HẦM – 15 KM/H' : 'GARAGE LANE – MAX SPEED 15 KM/H'} ▼
            </div>
            <div className="pf-slots-row">
              {currentFloorSpots.slice(6, 12).map((slot) => (
                <div
                  key={slot.id}
                  className={`pf-slot-item ${slot.status} ${selectedSlot === slot.id ? 'selected' : ''}`}
                  onClick={() => slot.status === 'available' && setSelectedSlot(slot.id)}
                >
                  <span className="pf-slot-code">{slot.id}</span>
                  <div className="pf-slot-icon">
                    {slot.status === 'occupied' && <CarFront size={20} color="#9ca3af" />}
                    {slot.status === 'reserved' && <Clock size={17} color="#f59e0b" />}
                    {slot.status === 'available' && <Plus size={18} color="#10b981" />}
                    {slot.status === 'selected' && <CarFront size={20} color="#0284c7" />}
                  </div>
                  <span className="pf-slot-tag">
                    {slot.status === 'reserved'
                      ? (language === 'vi' ? 'Đã đặt' : 'Reserved')
                      : slot.status === 'occupied'
                        ? (language === 'vi' ? 'Đang đỗ' : 'Busy')
                        : slot.isVip
                          ? '✦ VIP'
                          : slot.isEv
                            ? '⚡ EV'
                            : (language === 'vi' ? 'Trống' : 'Free')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pf-map-footer-summary">
            <div className="pf-slot-selected-info">
              <div className="pf-slot-selected-badge">{selectedSlot}</div>
              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block' }}>
                  {t('spotSelected')} {selectedSlot} · {language === 'vi' ? `Tầng ${activeFloor}` : `Level ${activeFloor}`}
                </strong>
                <small style={{ color: '#6b7280', fontSize: '0.72rem' }}>
                  {language === 'vi' ? 'Cảm biến siêu âm 24/7 & Barrier Pass điện tử' : 'In-ground Sensors & QR Barrier Pass 24/7'}
                </small>
              </div>
            </div>
            <button className="pf-btn-reserve-slot" onClick={onOpenBookingModal}>
              {t('reserveNow')}
            </button>
          </div>
        </article>

        {/* CARD 4: LỊCH SỬ GẦN ĐÂY (Span 4) */}
        <article className="pf-card pf-card-quick-tools" style={{ gridColumn: 'span 4' }}>
          <div className="pf-card-head" style={{ padding: 0, marginBottom: '0.85rem' }}>
            <div>
              <span className="pf-card-overline">{language === 'vi' ? 'LỊCH SỬ GẦN ĐÂY' : 'RECENT HISTORY'}</span>
              <h3 className="pf-card-title">{t('recentHistory')}</h3>
            </div>
            <button
              className="pf-btn-text-link"
              onClick={() => onNavigateMenu('Lịch sử đỗ xe')}
            >
              {t('seeAll')}
            </button>
          </div>

          <div className="pf-history-list" style={{ padding: 0 }}>
            {(() => {
              let items = [];
              try {
                const saved = localStorage.getItem('sp_prebooked_passes');
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    items = parsed.slice(0, 3).map((p) => ({
                      place: `${p.branch?.split('-')?.[1]?.trim() || p.branch || 'Aeon Mall'} · ${p.slot || 'Ô đỗ'}`,
                      time: p.bookingTime || 'Mới đặt gần đây',
                      cost: p.fee || '45.000đ',
                      method: (p.paymentStatus || 'VietQR').replace('Đã thanh toán qua ', ''),
                      ok: true
                    }));
                  }
                }
              } catch (err) {
                console.debug('Failed to parse recent passes:', err);
              }

              if (items.length === 0) {
                return (
                  <div style={{ padding: '1.75rem 1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                    <p style={{ margin: '0 0 0.5rem' }}>{language === 'vi' ? 'Chưa có lịch sử giao dịch đỗ xe nào.' : 'No recent parking history.'}</p>
                    <button
                      className="pf-btn-text-link"
                      onClick={onOpenBookingModal}
                      style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '700' }}
                    >
                      {language === 'vi' ? '+ Đặt chỗ đầu tiên ngay' : '+ Make first reservation'}
                    </button>
                  </div>
                );
              }

              return items.map((item, idx) => (
                <div key={idx} className="pf-history-item">
                  <div className="pf-history-meta">
                    <strong style={{ fontSize: '0.82rem' }}>{item.place}</strong>
                    <small>{item.time}</small>
                  </div>
                  <div className="pf-history-amount">
                    <strong>{item.cost}</strong>
                    <span style={{ color: '#059669' }}>{item.method} ✓</span>
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="pf-gold-perk-card">
            <div className="pf-gold-perk-header">
              <Sparkles size={14} color="#0284c7" />
              <strong>{t('goldPerkTitle')}</strong>
            </div>
            <p>{t('goldPerkDesc')}</p>
          </div>
        </article>
      </div>
    </div>
  );
}

DashboardView.propTypes = {
  onNavigateMenu: PropTypes.func.isRequired,
  onOpenQrModal: PropTypes.func.isRequired,
  onOpenBookingModal: PropTypes.func.isRequired,
  onOpenSupport: PropTypes.func.isRequired,
  onOpenAi: PropTypes.func.isRequired,
  elapsedSeconds: PropTypes.number.isRequired,
  formatTimer: PropTypes.func.isRequired,
  estimatedFee: PropTypes.number.isRequired,
  activeSession: PropTypes.object,
  language: PropTypes.string
};
