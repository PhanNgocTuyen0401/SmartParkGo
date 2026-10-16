import { useState } from 'react';
import PropTypes from 'prop-types';
import { Bell, ShieldCheck, Mail, Globe, Save, Moon, Sun } from 'lucide-react';
import { getTranslation } from '../../utils/i18n';

export default function SettingsView({
  language = 'vi',
  onLanguageChange,
  theme = 'light',
  onThemeChange
}) {
  const t = (key) => getTranslation(language, key);

  const [settings, setSettings] = useState({
    pushNotification: true,
    autoBarrier: true,
    autoVatEmail: true
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="pf-menu-view-container">
      <div className="pf-view-header-banner">
        <div>
          <div className="pf-slot-dialog-tag">
            <span className="pf-live-dot"></span> {language === 'vi' ? 'TÙY CHỈNH HỆ THỐNG' : 'SYSTEM PREFERENCES'}
          </div>
          <h2>{t('settingsTitle')}</h2>
          <p>{t('settingsSub')}</p>
        </div>
      </div>

      <div className="pf-card" style={{ padding: '2rem', maxWidth: '48rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Item 1: Push Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--pf-border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Bell size={18} color="#0284c7" style={{ marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{t('pushNotiTitle')}</strong>
                <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem' }}>
                  {t('pushNotiSub')}
                </small>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.pushNotification}
              onChange={(e) => setSettings({ ...settings, pushNotification: e.target.checked })}
              style={{ width: '1.25rem', height: '1.25rem', accentColor: '#0284c7' }}
            />
          </div>

          {/* Item 2: Auto Barrier AI */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--pf-border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <ShieldCheck size={18} color="#10b981" style={{ marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{t('autoBarrierTitle')}</strong>
                <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem' }}>
                  {t('autoBarrierSub')}
                </small>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoBarrier}
              onChange={(e) => setSettings({ ...settings, autoBarrier: e.target.checked })}
              style={{ width: '1.25rem', height: '1.25rem', accentColor: '#0284c7' }}
            />
          </div>

          {/* Item 3: VAT e-Invoice */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--pf-border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Mail size={18} color="#f59e0b" style={{ marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{t('vatEmailTitle')}</strong>
                <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem' }}>
                  {t('vatEmailSub')}
                </small>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoVatEmail}
              onChange={(e) => setSettings({ ...settings, autoVatEmail: e.target.checked })}
              style={{ width: '1.25rem', height: '1.25rem', accentColor: '#0284c7' }}
            />
          </div>

          {/* Item 4: Theme Mode (Light / Dark) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--pf-border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              {theme === 'dark' ? (
                <Moon size={18} color="#38bdf8" style={{ marginTop: '2px' }} />
              ) : (
                <Sun size={18} color="#f59e0b" style={{ marginTop: '2px' }} />
              )}
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{t('themeSelectTitle')}</strong>
                <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem' }}>
                  {t('themeSelectSub')}
                </small>
              </div>
            </div>
            <div className="pf-floor-tabs" style={{ margin: 0 }}>
              <button
                type="button"
                className={`pf-floor-tab ${theme === 'light' ? 'active' : ''}`}
                onClick={() => onThemeChange && onThemeChange('light')}
              >
                ☀️ {language === 'vi' ? 'Sáng' : 'Light'}
              </button>
              <button
                type="button"
                className={`pf-floor-tab ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => onThemeChange && onThemeChange('dark')}
              >
                🌙 {language === 'vi' ? 'Tối' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Item 5: Language Selection */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Globe size={18} color="#0284c7" style={{ marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{t('langSelectTitle')}</strong>
                <small style={{ display: 'block', color: '#6b7280', fontSize: '0.75rem' }}>
                  {t('langSelectSub')}
                </small>
              </div>
            </div>
            <select
              className="pf-form-control"
              style={{ width: '160px', fontWeight: '700' }}
              value={language}
              onChange={(e) => {
                if (onLanguageChange) onLanguageChange(e.target.value);
              }}
            >
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
          {saved && (
            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>
              {t('savedSuccess')}
            </span>
          )}
          <button type="button" className="pf-btn-submit" onClick={handleSave}>
            <Save size={15} style={{ display: 'inline', marginRight: '4px' }} />
            {t('saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
}

SettingsView.propTypes = {
  language: PropTypes.string,
  onLanguageChange: PropTypes.func,
  theme: PropTypes.string,
  onThemeChange: PropTypes.func
};
