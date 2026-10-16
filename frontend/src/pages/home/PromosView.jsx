import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Copy,
  Check,
  Sparkles,
  Info,
  Gift,
  Tag,
  Coins,
  X,
  CheckCircle2,
  Ticket,
  ArrowRight,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getTranslation } from '../../utils/i18n';
import {
  INITIAL_REWARD_CATALOG,
  INITIAL_PROMO_VOUCHERS,
  lookupVoucherCode,
  addVoucherToWallet,
  isVoucherInWallet
} from '../../services/voucherService';

export default function PromosView({
  parkPoints = 1250,
  setParkPoints,
  userVouchers = [],
  setUserVouchers,
  onNavigateBooking,
  language = 'vi'
}) {
  const t = (key) => getTranslation(language, key);

  // Active Tab: 'catalog' (Kho ưu đãi & Đổi điểm) | 'wallet' (Ví voucher của tôi)
  const [activeTab, setActiveTab] = useState('catalog');

  // Input mã thưởng state
  const [inputCode, setInputCode] = useState('');
  const [inputError, setInputError] = useState('');
  const [inputSuccess, setInputSuccess] = useState('');

  // Trạng thái sao chép và modal chi tiết
  const [copiedCode, setCopiedCode] = useState('');
  const [detailModalVoucher, setDetailModalVoucher] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  // Bộ lọc cho tab Ví voucher
  const [walletFilter, setWalletFilter] = useState('all'); // 'all' | 'available' | 'used'

  // Catalog vouchers từ API (promo miễn phí)
  const [catalogVouchers, setCatalogVouchers] = useState({ rewards: INITIAL_REWARD_CATALOG, promos: [] });
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/vouchers/catalog', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const normalized = json.data.map((v) => {
            const isPercent = v.discount_type === 'percent' || String(v.discount_val).includes('%');
            const numericVal = parseInt(String(v.discount_val).replace(/\D/g, ''), 10) || 0;
            const ptsCost = parseInt(v.pts_cost || 0, 10);
            return {
              id: v.id || `v-${v.code}`,
              code: v.code,
              title: v.title || v.code,
              titleEn: v.title_en || v.title || v.code,
              desc: v.conditions || v.desc || (isPercent ? `Giảm ${numericVal}% phí gửi xe` : `Giảm ${numericVal.toLocaleString('vi-VN')}đ đơn đặt chỗ`),
              descEn: v.conditions_en || v.descEn || (isPercent ? `${numericVal}% off parking` : `${numericVal.toLocaleString('vi-VN')}đ off reservation`),
              type: isPercent ? 'percent' : 'fixed',
              value: numericVal,
              cost: ptsCost,
              pts_cost: ptsCost,
              exp: v.expiry_date || v.exp || '31/12/2026',
              expiry: v.expiry_date || v.expiry || v.exp || '31/12/2026',
              tag: ptsCost > 0 ? 'ĐỔI ĐIỂM' : (isPercent ? `${numericVal}% OFF` : `GIẢM ${Math.round(numericVal / 1000)}K`),
              badge: ptsCost > 0 ? 'ĐỔI ĐIỂM' : (isPercent ? `${numericVal}% OFF` : 'ƯU ĐÃI'),
              min_order_val: v.min_order_val || 0,
              minOrderVal: v.min_order_val || 0,
              conditions: v.conditions || `Áp dụng cho đơn từ ${(v.min_order_val || 0).toLocaleString('vi-VN')}đ`,
              stations: v.stations || 'Tất cả chi nhánh SmartPark Đà Nẵng'
            };
          });

          const rewards = normalized.filter((v) => v.pts_cost > 0);
          const promos = normalized.filter((v) => v.pts_cost === 0);
          setCatalogVouchers({
            rewards: rewards.length > 0 ? rewards : INITIAL_REWARD_CATALOG,
            promos
          });
        } else {
          setCatalogVouchers({ rewards: INITIAL_REWARD_CATALOG, promos: [] });
        }
      } catch {
        setCatalogVouchers({ rewards: INITIAL_REWARD_CATALOG, promos: [] });
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
    showToast(language === 'vi' ? `✓ Đã sao chép mã ${code}` : `✓ Copied code ${code}`);
  };

  // Thu thập mã khuyến mãi vào ví
  const handleClaim = (voucher) => {
    if (isVoucherInWallet(voucher.code, userVouchers)) {
      showToast(language === 'vi' ? `⚠️ Mã ${voucher.code} đã có trong ví của bạn!` : `⚠️ Voucher ${voucher.code} is already in your wallet!`);
      return;
    }

    const result = addVoucherToWallet(voucher, 'claimed');
    if (result.success) {
      if (setUserVouchers) {
        setUserVouchers((prev) => [result.voucher, ...prev.filter((v) => v.code !== result.voucher.code)]);
      }
      showToast(language === 'vi' ? `🎉 Đã lưu mã ${voucher.code} vào ví voucher của bạn!` : `🎉 Saved voucher ${voucher.code} to your wallet!`);
    } else {
      showToast(result.message);
    }
  };

  // Đổi điểm lấy voucher thưởng (FIXED: Không cho phép đổi lặp lại làm mất điểm)
  const handleRedeemReward = (reward) => {
    // 1. Kiểm tra đã có mã này chưa dùng trong ví chưa
    const alreadyOwned = isVoucherInWallet(reward.code, userVouchers);
    if (alreadyOwned) {
      showToast(language === 'vi' ? `⚠️ Bạn đã đổi mã ${reward.code} rồi! Hãy dùng mã trong ví trước khi đổi tiếp.` : `⚠️ You already redeemed ${reward.code}! Please use it first.`);
      return;
    }

    // 2. Kiểm tra số dư điểm
    if (parkPoints < reward.cost) {
      alert(language === 'vi' ? 'Bạn không đủ điểm ParkPoints để đổi ưu đãi này!' : 'Insufficient ParkPoints balance!');
      return;
    }

    // 3. Trừ điểm duy nhất 1 lần
    if (setParkPoints) {
      setParkPoints((prev) => Math.max(0, prev - reward.cost));
    }

    // 4. Thêm vào ví voucher
    const result = addVoucherToWallet(reward, 'redeemed');
    if (result.success && setUserVouchers) {
      setUserVouchers((prev) => [result.voucher, ...prev.filter((v) => v.code !== result.voucher.code)]);
    }

    showToast(language === 'vi' ? `🎉 Đã đổi thành công mã ${reward.code}! -${reward.cost} ParkPoints đã lưu vào ví.` : `🎉 Successfully redeemed ${reward.code}! -${reward.cost} points.`);
  };

  // Xử lý nạp / nhập mã ưu đãi thủ công từ PostgreSQL
  const handleApplyInputCode = async (e) => {
    e.preventDefault();
    setInputError('');
    setInputSuccess('');

    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      setInputError(language === 'vi' ? 'Vui lòng nhập mã ưu đãi hoặc mã quà tặng.' : 'Please enter a voucher code.');
      return;
    }

    if (isVoucherInWallet(trimmed, userVouchers)) {
      setInputError(language === 'vi' ? `Mã ${trimmed} đã có sẵn trong ví của bạn!` : `Voucher ${trimmed} is already in your wallet!`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/vouchers/apply-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ code: trimmed })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const v = data.data;
        const newV = {
          id: `uv-${Date.now()}`,
          code: v.code || trimmed,
          title: v.title || trimmed,
          desc: v.conditions || `Giảm ${v.discount_val}đ`,
          type: v.discount_type || 'fixed',
          value: typeof v.discount_val === 'number' ? v.discount_val : parseInt(String(v.discount_val).replace(/\D/g, ''), 10) || 20000,
          minOrderVal: v.min_order_val || 0,
          min_order_val: v.min_order_val || 0,
          expiry: v.expiry_date || '31/12/2027',
          stations: 'Toàn bộ chi nhánh SmartPark Đà Nẵng',
          claimedAt: new Date().toISOString(),
          isUsed: false,
          source: 'code'
        };
        addVoucherToWallet(newV, 'code');
        if (setUserVouchers) {
          setUserVouchers((prev) => [newV, ...prev.filter((x) => x.code !== newV.code)]);
        }
        setInputSuccess(language === 'vi' ? `✓ Áp dụng thành công mã ${trimmed}! Mã đã được thêm vào ví của bạn.` : `✓ Successfully added ${trimmed} to your wallet!`);
        setInputCode('');
        showToast(language === 'vi' ? `🎉 Nhận thành công voucher: ${newV.title}!` : `🎉 Successfully claimed: ${newV.title}!`);
      } else {
        const local = lookupVoucherCode(trimmed);
        if (local) {
          addVoucherToWallet(local, 'code');
          if (setUserVouchers) {
            setUserVouchers((prev) => [local, ...prev.filter((x) => x.code !== local.code)]);
          }
          setInputSuccess(language === 'vi' ? `✓ Áp dụng thành công mã ${trimmed}!` : `✓ Successfully added ${trimmed}!`);
          setInputCode('');
        } else {
          setInputError(data.message || (language === 'vi' ? `Mã "${trimmed}" không tồn tại hoặc đã hết hạn.` : `Invalid code "${trimmed}".`));
        }
      }
    } catch {
      setInputError(language === 'vi' ? 'Lỗi kết nối máy chủ xác thực mã.' : 'Connection error.');
    }
  };

  // Danh sách voucher khả dụng trong ví (loại bỏ hoàn toàn voucher đã sử dụng)
  const safeUserVouchers = Array.isArray(userVouchers) ? userVouchers : [];
  const filteredUserVouchers = safeUserVouchers.filter((v) => !v?.isUsed);
  const availableVoucherCount = filteredUserVouchers.length;

  return (
    <div className="pf-menu-view-container">
      {/* Header Banner */}
      <div className="pf-view-header-banner">
        <div>
          <div className="pf-slot-dialog-tag">
            <span className="pf-live-dot"></span> {language === 'vi' ? 'ĐẶC QUYỀN THÀNH VIÊN' : 'MEMBER PRIVILEGES'}
          </div>
          <h2>{language === 'vi' ? 'KHO ƯU ĐÃI & ĐỔI ĐIỂM TÍCH LŨY' : 'VOUCHERS & POINT REDEMPTION'}</h2>
          <p>{language === 'vi' ? 'Thu thập voucher giảm giá, nhập mã quà tặng và dùng điểm ParkPoints để đổi đặc quyền' : 'Claim discount vouchers, enter gift codes and redeem your reward points'}</p>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: '5rem', right: '2rem', background: '#0f172a', color: '#ffffff', padding: '0.85rem 1.4rem', borderRadius: 'var(--pf-radius-md)', zIndex: 12000, boxShadow: '0 12px 30px rgba(0,0,0,0.3)', fontSize: '0.86rem', fontWeight: '700', borderLeft: '4px solid #38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} color="#38bdf8" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── USER POINTS SUMMARY CARD ── */}
      <div className="pf-points-summary-card">
        <div>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>
            <Coins size={14} style={{ display: 'inline', marginRight: '4px' }} />
            {t('pointsBalance')}
          </span>
          <div className="pf-points-digit">{(parkPoints ?? 0).toLocaleString('vi-VN')} pts</div>
          <small style={{ opacity: 0.9 }}>
            {language === 'vi' ? 'Tích lũy từ các phiên gửi xe & đặt chỗ thành công (+15 đến +500 pts)' : 'Accumulated from completed parking sessions'}
          </small>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', padding: '0.85rem 1.25rem', borderRadius: 'var(--pf-radius-md)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: '800', fontSize: '0.85rem' }}>
              <Sparkles size={16} /> {t('goldMember')}
            </div>
            <small style={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
              {language === 'vi' ? 'Nhận gấp 2x điểm thưởng mỗi chuyến đỗ' : 'Earn 2x reward points per session'}
            </small>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            style={{
              background: activeTab === 'wallet' ? '#ffffff' : 'rgba(255,255,255,0.18)',
              color: activeTab === 'wallet' ? '#0284c7' : '#ffffff',
              border: 'none',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--pf-radius-md)',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Ticket size={18} />
            <span>Ví Của Tôi ({availableVoucherCount} khả dụng)</span>
          </button>
        </div>
      </div>

      {/* ── KHU VỰC NHẬP MÃ THƯỞNG / MÃ QUÀ TẶNG (NEW FEATURE) ── */}
      <div className="pf-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--pf-surface) 0%, var(--pf-surface-subtle) 100%)', border: '1px solid var(--pf-border-strong)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pf-primary)' }}>
              <Tag size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--pf-text-main)' }}>
                {language === 'vi' ? 'Nhập Mã Thưởng & Quà Tặng' : 'Enter Promo / Gift Code'}
              </h4>
              <small style={{ color: 'var(--pf-text-muted)', fontSize: '0.75rem' }}>
                {language === 'vi' ? 'Nhập mã đối tác, mã tri ân sự kiện hoặc ưu đãi đặc biệt để lưu trực tiếp vào ví' : 'Enter promo or gift code to save directly into your wallet'}
              </small>
            </div>
          </div>
        </div>

        <form onSubmit={handleApplyInputCode} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              className="pf-form-control"
              placeholder={language === 'vi' ? 'Nhập mã ưu đãi của bạn (WELCOME20K)...' : 'Enter voucher code...'}
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setInputError('');
                setInputSuccess('');
              }}
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', paddingLeft: '1rem' }}
            />
          </div>
          <button
            type="submit"
            className="pf-btn-submit"
            style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
          >
            <CheckCircle2 size={16} />
            <span>{language === 'vi' ? 'Lưu Vào Ví' : 'Apply Code'}</span>
          </button>
        </form>

        {inputError && (
          <div style={{ marginTop: '0.6rem', color: '#ef4444', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '600' }}>
            <AlertCircle size={14} />
            <span>{inputError}</span>
          </div>
        )}

        {inputSuccess && (
          <div style={{ marginTop: '0.6rem', color: '#10b981', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '700' }}>
            <CheckCircle2 size={14} />
            <span>{inputSuccess}</span>
          </div>
        )}
      </div>

      {/* ── TABS CHUYỂN ĐỔI: KHO ƯU ĐÃI VS VÍ VOUCHER CỦA TÔI ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--pf-border)', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'catalog' ? '3px solid var(--pf-primary)' : '3px solid transparent',
            color: activeTab === 'catalog' ? 'var(--pf-primary)' : 'var(--pf-text-muted)',
            fontWeight: '800',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '-2px'
          }}
        >
          <Gift size={18} />
          <span>{language === 'vi' ? 'Kho Ưu Đãi & Đổi Điểm' : 'Promos & Rewards'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'wallet' ? '3px solid var(--pf-primary)' : '3px solid transparent',
            color: activeTab === 'wallet' ? 'var(--pf-primary)' : 'var(--pf-text-muted)',
            fontWeight: '800',
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '-2px'
          }}
        >
          <Ticket size={18} />
          <span>{language === 'vi' ? 'Ví Voucher Của Tôi' : 'My Saved Vouchers'}</span>
          <span style={{ background: availableVoucherCount > 0 ? '#10b981' : '#64748b', color: '#ffffff', fontSize: '0.68rem', padding: '0.1rem 0.5rem', borderRadius: '10px', marginLeft: '0.2rem' }}>
            {availableVoucherCount}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: KHO ƯU ĐÃI & ĐỔI ĐIỂM
          ========================================================================= */}
      {activeTab === 'catalog' && (
        <>
          {/* ── SECTION 1: REDEEM POINTS FOR VOUCHERS ── */}
          <div className="pf-section-header">
            <div className="pf-section-header-left">
              <Gift size={20} color="#0284c7" />
              <h3 className="pf-section-title">{t('redeemVoucherTitle')}</h3>
            </div>
            <p className="pf-section-desc">{t('redeemVoucherSub')}</p>
          </div>

          {(() => {
            const availableRewards = (catalogVouchers.rewards || []).filter((rew) => !isVoucherInWallet(rew.code, userVouchers));
            if (availableRewards.length === 0) {
              return (
                <div className="pf-card" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'center', background: 'var(--pf-surface-subtle)', border: '1px dashed var(--pf-border)' }}>
                  <Coins size={28} color="#f59e0b" style={{ margin: '0 auto 0.5rem' }} />
                  <strong style={{ color: 'var(--pf-text-main)', fontSize: '0.92rem' }}>
                    {language === 'vi' ? 'Chưa có chương trình đổi điểm ParkPoints nào mới' : 'No reward vouchers available at this time'}
                  </strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--pf-text-muted)' }}>
                    {language === 'vi' ? 'Khi Quản Trị Viên phát hành voucher đổi điểm mới, các ưu đãi sẽ hiển thị tại đây để bạn quy đổi.' : 'When Admin releases new point redemption vouchers, they will appear here.'}
                  </p>
                </div>
              );
            }
            const isSingleReward = availableRewards.length === 1;
            return (
              <div
                className="pf-redeem-grid"
                style={{
                  marginBottom: '2.5rem',
                  gridTemplateColumns: isSingleReward ? 'minmax(280px, 380px)' : undefined,
                  maxWidth: isSingleReward ? '380px' : '100%'
                }}
              >
                {availableRewards.map((rew) => {
                  const canAfford = parkPoints >= rew.cost;

                  return (
                    <div key={rew.id} className="pf-redeem-card">
                      <div>
                        <span className="pf-redeem-cost-badge">
                          <Coins size={11} style={{ display: 'inline', marginRight: '3px' }} />
                          {rew.cost} pts
                        </span>
                        <h4 style={{ margin: '0.2rem 0 0.35rem', fontSize: '0.96rem' }}>
                          {language === 'vi' ? rew.title : rew.titleEn}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--pf-text-muted)', lineHeight: '1.4' }}>
                          {language === 'vi' ? rew.desc : rew.descEn}
                        </p>
                      </div>

                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                          <span>Mã: <strong>{rew.code}</strong></span>
                          <button
                            type="button"
                            className="pf-btn-text-link"
                            style={{ fontSize: '0.7rem', color: 'var(--pf-primary)' }}
                            onClick={() => setDetailModalVoucher(rew)}
                          >
                            <Info size={11} /> {t('viewDetails')}
                          </button>
                        </div>

                        <button
                          type="button"
                          className="pf-btn-redeem-action"
                          disabled={!canAfford}
                          onClick={() => handleRedeemReward(rew)}
                          style={{
                            background: canAfford ? 'var(--pf-primary)' : '#cbd5e1',
                            cursor: canAfford ? 'pointer' : 'not-allowed',
                            opacity: canAfford ? 1 : 0.7
                          }}
                        >
                          {canAfford ? (
                            `${t('redeemBtn')} (${rew.cost} pts)`
                          ) : (
                            language === 'vi' ? `Cần thêm ${rew.cost - parkPoints} pts` : `Need ${rew.cost - parkPoints} pts`
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── SECTION 2: AVAILABLE PROMO VOUCHERS ── */}
          <div className="pf-section-header">
            <div className="pf-section-header-left">
              <Tag size={20} color="#0284c7" />
              <h3 className="pf-section-title">
                {language === 'vi' ? 'Kho Voucher Khuyến Mãi Đang Hoạt Động' : 'Active Promo Vouchers'}
              </h3>
            </div>
            <p className="pf-section-desc">
              {language === 'vi' ? 'Nhấp "Thu thập" để lưu voucher vào ví hoặc "Sao chép" mã để sử dụng' : 'Click "Claim" to save voucher to your wallet or copy code'}
            </p>
          </div>

          {loadingCatalog ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--pf-text-muted)', fontSize: '0.9rem' }}>
              <RefreshCw size={24} style={{ margin: '0 auto 0.5rem', display: 'block', animation: 'spin 1s linear infinite' }} />
              {language === 'vi' ? 'Đang tải ưu đãi...' : 'Loading promos...'}
            </div>
          ) : (() => {
            const availablePromos = catalogVouchers.promos.filter((v) => !isVoucherInWallet(v.code, userVouchers));
            if (availablePromos.length === 0) {
              return (
                <div className="pf-card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(2, 132, 199, 0.05)', border: '1px dashed #0284c7' }}>
                  <Tag size={28} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                  <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
                    {language === 'vi' ? 'Hiện chưa có ưu đãi nào. Hãy quay lại sau!' : 'No promos available right now. Check back later!'}
                  </strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--pf-text-muted)' }}>
                    {language === 'vi' ? 'SmartPark thường xuyên cập nhật các ưu đãi mới. Đừng bỏ lỡ!' : 'SmartPark regularly updates new offers. Stay tuned!'}
                  </p>
                </div>
              );
            }
            const isSingle = availablePromos.length === 1;
            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isSingle ? 'minmax(300px, 420px)' : 'repeat(auto-fill, minmax(320px, 1fr))',
                  maxWidth: isSingle ? '420px' : '100%',
                  gap: '1rem'
                }}
              >
                {availablePromos.map((v) => {
                  const isClaimed = isVoucherInWallet(v.code, userVouchers);
                  return (
                    <div
                      key={v.id}
                      className="pf-card"
                      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span className="pf-voucher-tag-pill">{v.tag}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Hạn: {v.exp}</span>
                        </div>

                        <h4 style={{ margin: '0.2rem 0 0.35rem', fontSize: '1rem', color: 'var(--pf-text-main)' }}>
                          {language === 'vi' ? v.title : v.titleEn}
                        </h4>

                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--pf-text-muted)', lineHeight: '1.45' }}>
                          {language === 'vi' ? v.desc : v.descEn}
                        </p>
                      </div>

                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--pf-border)', paddingTop: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                          <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.95rem', fontWeight: '800', color: 'var(--pf-primary)' }}>
                            {v.code}
                          </span>
                          <button
                            type="button"
                            className="pf-btn-text-link"
                            style={{ fontSize: '0.72rem', color: 'var(--pf-primary)' }}
                            onClick={() => setDetailModalVoucher(v)}
                          >
                            <Info size={12} /> {t('viewDetails')}
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="pf-btn-apply-voucher"
                            disabled={isClaimed}
                            style={{
                              justifyContent: 'center',
                              background: isClaimed ? '#059669' : 'var(--pf-primary)',
                              cursor: isClaimed ? 'default' : 'pointer'
                            }}
                            onClick={() => handleClaim(v)}
                          >
                            {isClaimed ? (
                              <>
                                <Check size={14} /> {language === 'vi' ? 'Đã lưu trong ví' : 'Saved in Wallet'}
                              </>
                            ) : (
                              t('collectBtn')
                            )}
                          </button>

                          <button
                            type="button"
                            className="pf-btn-voucher-details"
                            style={{ justifyContent: 'center' }}
                            onClick={() => handleCopy(v.code)}
                          >
                            {copiedCode === v.code ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                            <span>{copiedCode === v.code ? 'Đã copy' : 'Sao chép'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {/* =========================================================================
          TAB 2: VÍ VOUCHER CỦA TÔI (MY SAVED VOUCHERS)
          ========================================================================= */}
      {activeTab === 'wallet' && (
        <div>
          {/* Subheader */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--pf-text-main)' }}>
                {language === 'vi' ? 'Danh Sách Voucher Trong Ví' : 'My Saved Vouchers'}
              </h3>
              <small style={{ color: 'var(--pf-text-muted)' }}>
                {language === 'vi' ? 'Các mã này sẽ tự động xuất hiện tại bước thanh toán đặt chỗ trước của bạn' : 'These vouchers will appear directly at your booking checkout step'}
              </small>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: availableVoucherCount > 0 ? '#0284c7' : '#64748b', background: availableVoucherCount > 0 ? 'rgba(2, 132, 199, 0.08)' : 'rgba(100, 116, 139, 0.08)', padding: '0.35rem 0.85rem', borderRadius: 'var(--pf-radius-sm)', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
              {availableVoucherCount} {language === 'vi' ? 'khả dụng' : 'available'}
            </div>
          </div>

          {filteredUserVouchers.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: filteredUserVouchers.length === 1 ? 'minmax(300px, 420px)' : 'repeat(auto-fill, minmax(320px, 1fr))',
                maxWidth: filteredUserVouchers.length === 1 ? '420px' : '100%',
                gap: '1rem'
              }}
            >
              {filteredUserVouchers.map((v) => (
                <div
                  key={v.id}
                  className="pf-card"
                  style={{
                    padding: '1.25rem',
                    border: '1px solid var(--pf-border-strong)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{
                      background: v.source === 'redeemed' ? '#8b5cf6' : v.source === 'code' ? '#0284c7' : '#0284c7',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: '800',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {v.source === 'redeemed' ? 'ĐỔI ĐIỂM PTS' : v.source === 'code' ? 'MÃ QUÀ TẶNG' : 'KHUYẾN MÃI'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hạn: {v.expiry}</span>
                  </div>

                  <h4 style={{ margin: '0.2rem 0 0.25rem', fontSize: '1rem', color: 'var(--pf-text-main)' }}>
                    {v.title}
                  </h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: 'var(--pf-text-muted)' }}>
                    {v.desc || 'Áp dụng cho mọi đơn đặt chỗ trước trên ứng dụng SmartPark.'}
                  </p>

                  <div style={{ borderTop: '1px solid var(--pf-border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>MÃ ƯU ĐÃI</div>
                      <div style={{ fontFamily: 'Space Grotesk', fontSize: '1.05rem', fontWeight: '800', color: 'var(--pf-primary)' }}>
                        {v.code}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        className="pf-btn-text-link"
                        style={{ fontSize: '0.74rem', border: '1px solid var(--pf-border)', padding: '0.35rem 0.65rem', borderRadius: '4px' }}
                        onClick={() => handleCopy(v.code)}
                      >
                        <Copy size={13} />
                        <span>Sao chép</span>
                      </button>

                      {onNavigateBooking && (
                        <button
                          type="button"
                          className="pf-btn-submit"
                          style={{ fontSize: '0.74rem', padding: '0.35rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => onNavigateBooking && onNavigateBooking(v)}
                        >
                          <span>Dùng ngay</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pf-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--pf-text-muted)' }}>
              <Ticket size={48} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.35rem', color: 'var(--pf-text-main)' }}>Ví Voucher Trống</h4>
              <p style={{ fontSize: '0.82rem', margin: '0 0 1.25rem' }}>
                {language === 'vi'
                  ? 'Bạn chưa có mã ưu đãi khả dụng nào trong ví. Hãy thu thập mã từ Kho Ưu Đãi hoặc nhập mã quà tặng để nhận ưu đãi!'
                  : 'No active vouchers in your wallet. Claim offers or enter gift codes to get discounts!'}
              </p>
              <button
                type="button"
                className="pf-btn-submit"
                onClick={() => setActiveTab('catalog')}
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.82rem' }}
              >
                {language === 'vi' ? 'Khám phá kho ưu đãi ngay' : 'Browse Promos'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL MODAL POPUP FOR VOUCHER ── */}
      {detailModalVoucher && (
        <div className="pf-modal-backdrop" onClick={() => setDetailModalVoucher(null)}>
          <div className="pf-modal-dialog pf-voucher-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={18} color="#0284c7" />
                <h3>{t('voucherDetailModalTitle')}</h3>
              </div>
              <button type="button" className="pf-modal-close-btn" onClick={() => setDetailModalVoucher(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="pf-modal-body">
              <div className="pf-voucher-detail-hero">
                <span className="pf-voucher-tag-pill">{detailModalVoucher.badge || detailModalVoucher.tag || 'PROMO'}</span>
                <div className="pf-voucher-modal-code">{detailModalVoucher.code}</div>
                <h4>{detailModalVoucher.title}</h4>
                <p>{detailModalVoucher.desc}</p>
              </div>

              <div className="pf-voucher-terms-list">
                <div className="pf-term-row">
                  <span>Hạn sử dụng:</span>
                  <strong>{detailModalVoucher.exp || detailModalVoucher.expiry}</strong>
                </div>
                <div className="pf-term-row">
                  <span>Chi nhánh áp dụng:</span>
                  <strong>{detailModalVoucher.stations || 'Tất cả chi nhánh SmartPark Đà Nẵng'}</strong>
                </div>
                <div className="pf-term-row">
                  <span>Điều kiện sử dụng:</span>
                  <strong>{detailModalVoucher.conditions || 'Áp dụng cho mọi xe đã đăng ký tài khoản.'}</strong>
                </div>
              </div>
            </div>

            <div className="pf-modal-footer">
              <button type="button" className="pf-btn-cancel" onClick={() => setDetailModalVoucher(null)}>
                {t('closeModal')}
              </button>
              <button
                type="button"
                className="pf-btn-submit"
                onClick={() => {
                  handleCopy(detailModalVoucher.code);
                  setDetailModalVoucher(null);
                }}
              >
                <Copy size={15} style={{ display: 'inline', marginRight: '4px' }} />
                Sao chép mã {detailModalVoucher.code}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

PromosView.propTypes = {
  parkPoints: PropTypes.number,
  setParkPoints: PropTypes.func,
  userVouchers: PropTypes.array,
  setUserVouchers: PropTypes.func,
  onNavigateBooking: PropTypes.func,
  language: PropTypes.string
};
