import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Calendar,
  Clock,
  CarFront,
  MapPin,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Sparkles,
  LogIn,
  LogOut,
  Calculator,
  Layers,
  Crown
} from 'lucide-react';
import SlotSelectionDialog from './SlotSelectionDialog';
import { getTranslation } from '../../utils/i18n';

// BookingView.jsx (Giao diện Đặt chỗ Trước):
// Nhiệm vụ: Chọn chi nhánh, loại phương tiện (Ô tô, SUV, Xe điện, Xe máy), 
// gói thời gian (2 giờ, ngày, tuần, tháng), chọn áp dụng voucher và tính tổng tiền thanh toán.

const BRANCH_LIST = [
  { id: 'smartpark-aeon-thanh-khe', name: 'SmartPark - Aeon Mall Thanh Khê 1', addr: 'Thanh Khê · Đà Nẵng' },
  { id: 'smartpark-vincom-ngo-quyen', name: 'SmartPark - Vincom Plaza Ngô Quyền', addr: 'Sơn Trà · Đà Nẵng' },
  { id: 'smartpark-san-bay-da-nang', name: 'SmartPark - Sân Bay Quốc Tế Đà Nẵng', addr: 'Hải Châu · Đà Nẵng' },
  { id: 'smartpark-lotte-mart', name: 'SmartPark - Lotte Mart Đà Nẵng', addr: 'Hải Châu · Đà Nẵng' },
  { id: 'smartpark-indochina-riverside', name: 'SmartPark - Indochina Riverside Mall', addr: 'Hải Châu · Đà Nẵng' }
];

// Biểu phí chuẩn (đồng bộ với backend tariffs)
export const TARIFF = {
  first2Hours: 25000,   // 2 giờ đầu
  nextHour: 10000,      // mỗi giờ tiếp theo
  dayRate: 150000,      // vé ngày 24h
  weekRate: 650000,     // vé tuần 7 ngày
  monthRate: 1800000    // vé tháng 30 ngày
};

const PACKAGES = [
  {
    id: 'hourly',
    labelVi: 'Theo Giờ (Tự chỉnh)',
    labelEn: 'Hourly (Custom)',
    badgeVi: 'Linh hoạt',
    badgeEn: 'Flexible',
    descVi: '25.000đ/2h đầu + 10.000đ/h tiếp theo',
    descEn: '25,000đ/first 2h + 10,000đ/extra h'
  },
  {
    id: 'daily',
    labelVi: 'Vé Ngày 24h',
    labelEn: 'Day Pass (24h)',
    badgeVi: '150.000đ',
    badgeEn: '150,000đ',
    descVi: 'Ra vào không giới hạn trong 24 giờ',
    descEn: 'Unlimited access for 24 hours'
  },
  {
    id: 'weekly',
    labelVi: 'Thẻ Tuần 7 Ngày',
    labelEn: 'Weekly Pass (7D)',
    badgeVi: '650.000đ',
    badgeEn: '650,000đ',
    descVi: 'Tiết kiệm ~38% so với tính theo ngày',
    descEn: 'Save ~38% vs day rate'
  },
  {
    id: 'monthly',
    labelVi: 'Thẻ Tháng 30 Ngày',
    labelEn: 'Monthly Pass (30D)',
    badgeVi: '1.800.000đ',
    badgeEn: '1,800,000đ',
    descVi: 'Tiết kiệm ~60%, dành cho cư dân & văn phòng',
    descEn: 'Save ~60%, for residents & commuters'
  }
];

/**
 * Tính giá đỗ xe theo giờ vào và giờ ra dự kiến
 */
function calcHourlyFee(startTime, endTime, language = 'vi') {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;

  if (endMins <= startMins) endMins += 24 * 60; // qua ngày hôm sau

  const diffMins = endMins - startMins;
  const diffHours = diffMins / 60;

  if (diffHours < 0.1) return null;

  let fee;
  if (diffHours <= 2) {
    fee = TARIFF.first2Hours;
  } else {
    const extraHours = Math.ceil(diffHours - 2);
    fee = TARIFF.first2Hours + extraHours * TARIFF.nextHour;
  }

  const hours = Math.floor(diffHours);
  const mins = Math.round((diffHours - hours) * 60);
  const durationLabel = language === 'vi'
    ? (hours > 0 ? `${hours} giờ${mins > 0 ? ` ${mins} phút` : ''}` : `${mins} phút`)
    : (hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}` : `${mins} min`);

  return { fee, durationLabel, diffHours };
}

function formatCurrency(amount) {
  return (amount || 0).toLocaleString('vi-VN') + 'đ';
}

export default function BookingView({
  vehiclesList = [],
  initialBranch,
  userVouchers = [],
  setUserVouchers,
  onBookingSuccess,
  language = 'vi',
  initialVoucher = null
}) {
  const t = (key) => getTranslation(language, key);

  const getNowPlusMinutes = (addMins = 30) => {
    const d = new Date(Date.now() + addMins * 60 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [packageType, setPackageType] = useState('hourly'); // 'hourly' | 'daily' | 'weekly' | 'monthly'

  const [bookingForm, setBookingForm] = useState({
    branch: initialBranch || 'SmartPark - Aeon Mall Thanh Khê 1 (Đà Nẵng)',
    vehicle: (vehiclesList && vehiclesList[0]) ? `${vehiclesList[0].plate} (${vehiclesList[0].brand || 'Xe cá nhân'})` : '',
    date: new Date().toISOString().split('T')[0],
    startTime: getNowPlusMinutes(30),
    endTime: getNowPlusMinutes(150)
  });

  const [priceEstimate, setPriceEstimate] = useState({
    fee: 25000,
    durationLabel: language === 'vi' ? '2 giờ' : '2 hrs',
    diffHours: 2
  });

  // Tự động tính toán chi phí theo gói đã chọn
  useEffect(() => {
    if (packageType === 'hourly') {
      const result = calcHourlyFee(bookingForm.startTime, bookingForm.endTime, language);
      if (result) {
        setPriceEstimate(result);
      } else {
        setPriceEstimate({ fee: 25000, durationLabel: language === 'vi' ? '2 giờ' : '2 hrs', diffHours: 2 });
      }
    } else if (packageType === 'daily') {
      setPriceEstimate({
        fee: TARIFF.dayRate,
        durationLabel: language === 'vi' ? 'Vé ngày (24 giờ)' : 'Day Pass (24 hrs)',
        diffHours: 24
      });
    } else if (packageType === 'weekly') {
      setPriceEstimate({
        fee: TARIFF.weekRate,
        durationLabel: language === 'vi' ? 'Thẻ tuần (7 ngày)' : 'Weekly Pass (7 days)',
        diffHours: 24 * 7
      });
    } else if (packageType === 'monthly') {
      setPriceEstimate({
        fee: TARIFF.monthRate,
        durationLabel: language === 'vi' ? 'Thẻ tháng (30 ngày)' : 'Monthly Pass (30 days)',
        diffHours: 24 * 30
      });
    }
  }, [packageType, bookingForm.startTime, bookingForm.endTime, language]);

  useEffect(() => {
    if (initialBranch) {
      setBookingForm((prev) => ({ ...prev, branch: initialBranch }));
    }
  }, [initialBranch]);

  useEffect(() => {
    if (vehiclesList && vehiclesList.length > 0) {
      const v = vehiclesList[0];
      setBookingForm((prev) => ({
        ...prev,
        vehicle: `${v.plate} (${v.brand || 'Xe cá nhân'})`
      }));
    }
  }, [vehiclesList]);

  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSlotDialogOpen(true);
  };

  const handleBookingComplete = (finalData) => {
    setIsSlotDialogOpen(false);
    if (onBookingSuccess) onBookingSuccess(finalData);
  };

  // Tính ngày hết hạn cho gói dài ngày
  const getPackageEndDate = () => {
    if (!bookingForm.date) return '';
    const startDate = new Date(bookingForm.date);
    if (isNaN(startDate.getTime())) return '';
    if (packageType === 'weekly') {
      startDate.setDate(startDate.getDate() + 7);
      return startDate.toLocaleDateString('vi-VN');
    }
    if (packageType === 'monthly') {
      startDate.setDate(startDate.getDate() + 30);
      return startDate.toLocaleDateString('vi-VN');
    }
    if (packageType === 'daily') {
      startDate.setDate(startDate.getDate() + 1);
      return startDate.toLocaleDateString('vi-VN');
    }
    return '';
  };

  return (
    <div className="pf-menu-view-container">
      {/* Hero Header Box */}
      <div className="pf-booking-hero-box">
        <div className="pf-booking-hero-text">
          <span className="pf-slot-dialog-tag" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' }}>
            <span className="pf-live-dot" style={{ background: '#ffffff' }}></span>
            {language === 'vi' ? 'ĐẶT CHỖ TRỰC TUYẾN' : 'ONLINE RESERVATION'}
          </span>
          <h2>{t('bookingTitle')}</h2>
          <p>{t('bookingSubtitle')}</p>
        </div>
      </div>

      {/* Compact Booking Form Card */}
      <div className="pf-booking-compact-card">
        <form onSubmit={handleSubmit}>

          {/* Row 1: Chi nhánh + Xe */}
          <div className="pf-booking-grid-2col">
            <div className="pf-form-group">
              <label>
                <MapPin size={14} color="#0284c7" style={{ display: 'inline', marginRight: '4px' }} />
                {t('branchLabel')}
              </label>
              <select
                className="pf-form-control"
                value={bookingForm.branch}
                onChange={(e) => setBookingForm({ ...bookingForm, branch: e.target.value })}
              >
                {BRANCH_LIST.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name} ({b.addr})
                  </option>
                ))}
              </select>
            </div>

            <div className="pf-form-group">
              <label>
                <CarFront size={14} color="#0284c7" style={{ display: 'inline', marginRight: '4px' }} />
                {t('vehicleLabel')}
              </label>
              {vehiclesList.length > 0 ? (
                <select
                  className="pf-form-control"
                  value={bookingForm.vehicle}
                  onChange={(e) => setBookingForm({ ...bookingForm, vehicle: e.target.value })}
                >
                  {vehiclesList.map((v) => (
                    <option key={v.id} value={`${v.plate} (${v.brand || 'Xe cá nhân'})`}>
                      {v.plate} · {v.brand} ({v.type || 'Tiêu chuẩn'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder={language === 'vi' ? 'Nhập biển số xe (VD: 43A - 123.45)' : 'Enter license plate'}
                  className="pf-form-control"
                  value={bookingForm.vehicle}
                  onChange={(e) => setBookingForm({ ...bookingForm, vehicle: e.target.value })}
                />
              )}
            </div>
          </div>

          {/* Row 2: Chọn Gói Thời Lượng (Theo Giờ / Vé Ngày / Thẻ Tuần / Thẻ Tháng) */}
          <div className="pf-form-group" style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.45rem' }}>
              <Clock size={14} color="#0284c7" />
              <strong>{language === 'vi' ? 'Chọn khung giờ / Gói đỗ xe (*):' : 'Parking Package (*):'}</strong>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
              {PACKAGES.map((pkg) => {
                const isSelected = packageType === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setPackageType(pkg.id)}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '9px',
                      border: isSelected ? '2px solid #0284c7' : '1px solid var(--pf-border)',
                      background: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'var(--pf-card-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <strong style={{ fontSize: '0.84rem', color: isSelected ? '#0284c7' : 'var(--pf-text-main)' }}>
                        {language === 'vi' ? pkg.labelVi : pkg.labelEn}
                      </strong>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '0.12rem 0.45rem',
                        borderRadius: '999px',
                        background: isSelected ? '#0284c7' : 'rgba(255,255,255,0.06)',
                        color: isSelected ? '#ffffff' : 'var(--pf-text-muted)'
                      }}>
                        {language === 'vi' ? pkg.badgeVi : pkg.badgeEn}
                      </span>
                    </div>
                    <small style={{ fontSize: '0.7rem', color: 'var(--pf-text-muted)', display: 'block', lineHeight: 1.35 }}>
                      {language === 'vi' ? pkg.descVi : pkg.descEn}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Ngày Bắt Đầu */}
          <div className="pf-form-group">
            <label>
              <Calendar size={14} color="#0284c7" style={{ display: 'inline', marginRight: '4px' }} />
              {packageType === 'hourly'
                ? t('dateLabel')
                : (language === 'vi' ? 'Ngày bắt đầu áp dụng gói' : 'Effective Start Date')}
            </label>
            <input
              type="date"
              className="pf-form-control"
              value={bookingForm.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
              required
            />
          </div>

          {/* Row 4: Nếu chọn 'hourly' -> Hiện bộ đôi Giờ vào / Giờ ra tự chỉnh */}
          {packageType === 'hourly' ? (
            <div className="pf-booking-grid-2col">
              <div className="pf-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <LogIn size={14} color="#10b981" />
                  {language === 'vi' ? 'Giờ vào dự kiến' : 'Check-in Time'}
                </label>
                <input
                  type="time"
                  className="pf-form-control"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                  required
                />
              </div>

              <div className="pf-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <LogOut size={14} color="#f59e0b" />
                  {language === 'vi' ? 'Giờ ra dự kiến' : 'Check-out Time'}
                  <span style={{ fontSize: '0.68rem', color: '#0284c7', marginLeft: '4px', fontWeight: 600 }}>
                    ({language === 'vi' ? 'tự chỉnh' : 'self-select'})
                  </span>
                </label>
                <input
                  type="time"
                  className="pf-form-control"
                  value={bookingForm.endTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                  required
                />
              </div>
            </div>
          ) : (
            /* Thông tin thời hạn gói dài ngày */
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#047857',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldCheck size={16} color="#10b981" />
              <span>
                <strong>{priceEstimate.durationLabel}:</strong> Áp dụng từ ngày {bookingForm.date ? new Date(bookingForm.date).toLocaleDateString('vi-VN') : ''} đến hết ngày {getPackageEndDate()}. Ra vào tự động nhận diện biển số không giới hạn.
              </span>
            </div>
          )}

          {/* Price Estimate Card */}
          <div className="pf-booking-price-estimate">
            <div className="pf-price-estimate-inner">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calculator size={16} color="#0284c7" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--pf-text-muted)', fontWeight: '600' }}>
                    {language === 'vi' ? 'Cước phí giữ chỗ niêm yết:' : 'Standard Fee:'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>
                    · {priceEstimate.durationLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  <Crown size={12} />
                  <span>Khu VIP: +15.000đ khi chọn ô VIP</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.45rem' }}>
                <strong style={{ fontSize: '1.65rem', color: '#0284c7', fontWeight: '800', letterSpacing: '-0.02em' }}>
                  {formatCurrency(priceEstimate.fee)}
                </strong>
                {packageType === 'hourly' && priceEstimate.diffHours > 2 && (
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    (25.000đ 2h đầu + {formatCurrency((Math.ceil(priceEstimate.diffHours - 2)) * TARIFF.nextHour)} tiếp theo)
                  </span>
                )}
                {packageType !== 'hourly' && (
                  <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                    ✓ Trọn gói không phát sinh phí
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.45rem' }}>
              ⚡ Cước phí sẽ được giữ nguyên và áp dụng mã giảm giá voucher tại bước chọn ô đỗ tiếp theo.
            </div>
          </div>

          {/* CTA Button */}
          <button type="submit" className="pf-btn-checkout-flow" style={{ marginTop: '1.25rem' }}>
            <span>{t('btnContinueToSlots')}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Benefits Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.75rem', borderTop: '1px solid var(--pf-border)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--pf-text-muted)' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>{t('perk1')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--pf-text-muted)' }}>
            <CreditCard size={16} color="#0284c7" />
            <span>{t('perk2')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--pf-text-muted)' }}>
            <Sparkles size={16} color="#f59e0b" />
            <span>{t('perk3')}</span>
          </div>
        </div>
      </div>

      {/* SLOT & VOUCHER CHECKOUT DIALOG */}
      <SlotSelectionDialog
        isOpen={isSlotDialogOpen}
        onClose={() => setIsSlotDialogOpen(false)}
        bookingInfo={{
          ...bookingForm,
          packageType,
          duration: priceEstimate.durationLabel,
          estimatedFee: priceEstimate.fee,
          estimatedDuration: priceEstimate.durationLabel
        }}
        userVouchers={userVouchers}
        setUserVouchers={setUserVouchers}
        initialVoucher={initialVoucher}
        onConfirmBooking={handleBookingComplete}
        language={language}
      />
    </div>
  );
}

BookingView.propTypes = {
  vehiclesList: PropTypes.array,
  initialBranch: PropTypes.string,
  userVouchers: PropTypes.array,
  setUserVouchers: PropTypes.func,
  onBookingSuccess: PropTypes.func,
  language: PropTypes.string,
  initialVoucher: PropTypes.object
};
