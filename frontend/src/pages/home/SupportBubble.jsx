import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Headphones,
  PhoneCall,
  ShieldCheck,
  X,
  ExternalLink,
  Zap,
  CarFront,
  CheckCircle2,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { getTranslation } from '../../utils/i18n';

export default function SupportBubble({ isOpen, onToggle, onClose, language = 'vi' }) {
  const t = (key) => getTranslation(language, key);

  const [sosSent, setSosSent] = useState(null);

  const handleTriggerSOS = (serviceName) => {
    setSosSent(serviceName);
    setTimeout(() => setSosSent(null), 3500);
  };

  return (
    <div className="pf-single-bubble-wrapper">
      <span className="pf-bubble-tooltip">
        {language === 'vi' ? 'Hỗ trợ 24/7 (Hotline, Zalo, Fanpage, Cứu hộ)' : '24/7 Support (Hotline, Zalo, Fanpage, Rescue)'}
      </span>

      <button
        className="pf-circle-bubble-btn support"
        onClick={onToggle}
        aria-label="Mở Hỗ trợ 24/7"
      >
        <Headphones size={22} />
        <span className="pf-bubble-tag-badge support">24/7</span>
      </button>

      {isOpen && (
        <div className="pf-standalone-popup pf-support-enhanced-popup">
          {/* Header */}
          <div className="pf-support-popup-head">
            <div className="pf-support-popup-head-left">
              <div className="pf-support-badge-icon">
                <Headphones size={18} />
              </div>
              <div>
                <strong>{t('supportTitle')}</strong>
                <small>{t('supportSub')}</small>
              </div>
            </div>
            <button
              className="pf-support-close-btn"
              onClick={onClose}
              aria-label="Đóng Hỗ trợ"
            >
              <X size={18} />
            </button>
          </div>

          <div className="pf-support-body-scroll">
            {/* Emergency SOS Banner if triggered */}
            {sosSent && (
              <div className="pf-sos-alert-banner">
                <CheckCircle2 size={16} />
                <span>
                  {language === 'vi'
                    ? `Đã phát tín hiệu cứu hộ: "${sosSent}". Đội ứng cứu khẩn cấp đang tới ô đỗ của bạn!`
                    : `Dispatched: "${sosSent}". Rapid rescue response is arriving at your spot!`}
                </span>
              </div>
            )}

            {/* 1. Toll-Free Hotline */}
            <div className="pf-hotline-card">
              <span className="pf-hotline-overline">{t('hotlineLabel')}</span>
              <div className="pf-hotline-number">1900 8888</div>
              <small>
                {language === 'vi'
                  ? 'Túc trực 24/7/365 · Xử lý rào chắn barrier, sự cố hầm & cứu hộ khẩn cấp'
                  : '24/7/365 Toll-free · Barrier gate, garage issues & emergency response'}
              </small>
              <a
                href="tel:19008888"
                className="pf-hotline-btn"
              >
                <PhoneCall size={16} /> {t('callNow')}
              </a>
            </div>

            {/* 2. Multi-Channel Contact Cards */}
            <div className="pf-multi-channel-list">
              {/* Zalo OA */}
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noopener noreferrer"
                className="pf-channel-item zalo"
              >
                <div className="pf-channel-icon zalo">Zalo</div>
                <div className="pf-channel-info">
                  <strong>{t('zaloSupport')}</strong>
                  <small>{t('zaloSub')}</small>
                </div>
                <ExternalLink size={15} className="pf-channel-link-arrow" />
              </a>

              {/* Facebook Fanpage */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="pf-channel-item facebook"
              >
                <div className="pf-channel-icon fb">FB</div>
                <div className="pf-channel-info">
                  <strong>{t('fanpageSupport')}</strong>
                  <small>{t('fanpageSub')}</small>
                </div>
                <ExternalLink size={15} className="pf-channel-link-arrow" />
              </a>
            </div>

            {/* 3. 1-Tap SOS Emergency Actions */}
            <div className="pf-sos-section">
              <span className="pf-sos-section-title">
                <AlertTriangle size={14} color="#f59e0b" />
                {t('sosEmergency')}
              </span>

              <div className="pf-sos-grid">
                <button
                  type="button"
                  className="pf-sos-btn"
                  onClick={() => handleTriggerSOS(language === 'vi' ? 'Câu bình ắc quy ô tô' : 'Car Battery Jumpstart')}
                >
                  <Zap size={16} color="#0284c7" />
                  <span>{t('sosBattery')}</span>
                </button>

                <button
                  type="button"
                  className="pf-sos-btn"
                  onClick={() => handleTriggerSOS(language === 'vi' ? 'Mở rào chắn Barrier khẩn cấp' : 'Barrier Manual Lift')}
                >
                  <ShieldCheck size={16} color="#10b981" />
                  <span>{t('sosBarrier')}</span>
                </button>

                <button
                  type="button"
                  className="pf-sos-btn"
                  onClick={() => handleTriggerSOS(language === 'vi' ? 'Tìm vị trí đỗ xe trong hầm' : 'Locate Car in Garage')}
                >
                  <CarFront size={16} color="#8b5cf6" />
                  <span>{t('sosFindCar')}</span>
                </button>

                <button
                  type="button"
                  className="pf-sos-btn"
                  onClick={() => handleTriggerSOS(language === 'vi' ? 'Cứu hộ vá lốp & bơm lốp' : 'Emergency Tire Service')}
                >
                  <Wrench size={16} color="#f59e0b" />
                  <span>{t('sosTire')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

SupportBubble.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  language: PropTypes.string
};
