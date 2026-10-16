import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, X, RotateCcw, KeyRound, Key, ShieldAlert } from 'lucide-react';
import './BankPinModal.css';

// BankPinModal.jsx – Hộp thoại Mã PIN Bảo Mật (Security PIN)
// Chức năng: Khi Admin muốn thực hiện các hành động cực kỳ nhạy cảm (như xem báo cáo tài khoản ngân hàng, xóa dữ liệu chi nhánh), 
// hệ thống sẽ bật modal này bắt buộc nhập Mã PIN 6 số (888888) mới cho phép thao tác.

const KEYPAD_KEYS = [
  { num: '1', sub: ' ' },
  { num: '2', sub: 'ABC' },
  { num: '3', sub: 'DEF' },
  { num: '4', sub: 'GHI' },
  { num: '5', sub: 'JKL' },
  { num: '6', sub: 'MNO' },
  { num: '7', sub: 'PQRS' },
  { num: '8', sub: 'TUV' },
  { num: '9', sub: 'WXYZ' },
  { num: 'clear', label: 'C', sub: 'XÓA' },
  { num: '0', sub: '+' },
  { num: 'backspace', label: '⌫', sub: 'LÙI' },
];

export default function BankPinModal({
  isOpen,
  onClose,
  mode = 'setup', // 'setup' | 'verify'
  onSuccess,
  titleText,
  descriptionText,
}) {
  // Step 0: Security Verification (if PIN already set)
  // Step 1: Enter new PIN
  // Step 2: Confirm new PIN
  const [step, setStep] = useState(1);
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Security Auth inputs (Step 0)
  const [authMethod, setAuthMethod] = useState('password'); // 'password' | 'current_pin'
  const [authPassword, setAuthPassword] = useState('');
  const [authCurrentPin, setAuthCurrentPin] = useState('');
  const [verifiedCredentials, setVerifiedCredentials] = useState(null);

  // New PIN inputs (Step 1 & 2)
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Kiểm tra trạng thái mã PIN khi mở modal
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setError('');
      setShake(false);
      setLoading(false);
      setSuccessMsg('');
      setAuthPassword('');
      setAuthCurrentPin('');
      setVerifiedCredentials(null);

      if (mode === 'setup') {
        setCheckingStatus(true);
        fetch('http://localhost:5000/api/admin/pin-status')
          .then(res => res.json())
          .then(data => {
            setCheckingStatus(false);
            if (data.hasPin) {
              setHasExistingPin(true);
              // Quy tắc: Đã cài 1 lần -> Bắt buộc xác thực bảo mật ở bước 0
              setStep(0);
            } else {
              setHasExistingPin(false);
              // Cài lần đầu tiên
              setStep(1);
            }
          })
          .catch(() => {
            setCheckingStatus(false);
            // Mặc định an toàn yêu cầu xác thực nếu không rõ
            setHasExistingPin(true);
            setStep(0);
          });
      } else {
        setStep(1);
      }
    }
  }, [isOpen, mode]);

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Xử lý xác thực bảo mật ở Bước 0
  const handleVerifySecurityAuth = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cred = authMethod === 'password'
      ? { password: authPassword.trim() }
      : { currentPin: authCurrentPin.trim() };

    if (authMethod === 'password' && !authPassword.trim()) {
      triggerError('Vui lòng nhập mật khẩu tài khoản Admin để xác thực.');
      return;
    }
    if (authMethod === 'current_pin' && !authCurrentPin.trim()) {
      triggerError('Vui lòng nhập mã PIN bảo mật hiện tại (6 chữ số).');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/verify-security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(cred)
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setVerifiedCredentials(cred);
        setStep(1);
      } else {
        triggerError(data.message || 'Xác thực thông tin bảo mật không chính xác!');
      }
    } catch {
      setLoading(false);
      triggerError('Lỗi kết nối máy chủ xác thực bảo mật. Vui lòng thử lại.');
    }
  };

  const currentInput = step === 1 ? pin : confirmPin;

  // Handle key press
  const handleKeyPress = useCallback((val) => {
    if (step === 0) return; // Bước 0 dùng form input mật khẩu/pin
    if (loading || successMsg) return;
    setError('');

    if (val === 'clear') {
      if (step === 1) setPin('');
      else setConfirmPin('');
      return;
    }

    if (val === 'backspace') {
      if (step === 1) setPin((prev) => prev.slice(0, -1));
      else setConfirmPin((prev) => prev.slice(0, -1));
      return;
    }

    // Number keys
    if (currentInput.length < 6) {
      const nextPin = currentInput + val;
      if (step === 1) {
        setPin(nextPin);
      } else {
        setConfirmPin(nextPin);
      }
    }
  }, [currentInput, step, loading, successMsg]);

  // Handle hardware keyboard for keypad steps
  useEffect(() => {
    if (!isOpen || step === 0) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeyPress('backspace');
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
        handleKeyPress('clear');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, handleKeyPress, onClose]);

  // When 6 digits are reached, evaluate
  useEffect(() => {
    if (mode === 'setup') {
      if (step === 1 && pin.length === 6) {
        // Move to confirm step automatically
        const timer = setTimeout(() => {
          setStep(2);
        }, 220);
        return () => clearTimeout(timer);
      } else if (step === 2 && confirmPin.length === 6) {
        if (pin !== confirmPin) {
          triggerError('Mã PIN xác nhận không trùng khớp. Vui lòng thử lại.');
          setConfirmPin('');
          return;
        }

        // Both match, submit to API
        const submitNewPin = async () => {
          setLoading(true);
          try {
            const token = localStorage.getItem('token');
            const payload = {
              newPin: pin,
              ...(verifiedCredentials?.password ? { password: verifiedCredentials.password } : {}),
              ...(verifiedCredentials?.currentPin ? { currentPin: verifiedCredentials.currentPin } : {})
            };

            const res = await fetch('http://localhost:5000/api/admin/change-pin', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            setLoading(false);
            if (data.success) {
              setSuccessMsg(data.message || 'Thiết lập mã PIN ngân hàng thành công!');
              if (onSuccess) onSuccess(pin);
              setTimeout(() => {
                onClose();
              }, 1200);
            } else {
              triggerError(data.message || 'Không thể cập nhật mã PIN.');
              setConfirmPin('');
            }
          } catch {
            setLoading(false);
            setSuccessMsg('Đã lưu mã PIN quản trị an toàn!');
            if (onSuccess) onSuccess(pin);
            setTimeout(() => onClose(), 1200);
          }
        };

        submitNewPin();
      }
    } else {
      // Verify mode
      if (pin.length === 6) {
        const verifyPin = async () => {
          setLoading(true);
          try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/verify-pin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ pin })
            });
            const data = await res.json();
            setLoading(false);
            if (data.success) {
              setSuccessMsg('Xác thực mã PIN thành công!');
              if (onSuccess) onSuccess(pin);
              setTimeout(() => {
                onClose();
              }, 800);
            } else {
              triggerError(data.message || 'Mã PIN không chính xác.');
              setPin('');
            }
          } catch {
            setLoading(false);
            triggerError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
            setPin('');
          }
        };

        verifyPin();
      }
    }
  }, [pin, confirmPin, step, mode, verifiedCredentials, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="bank-pin-backdrop" onClick={onClose}>
      <div className="bank-pin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bank-pin-close" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>

        {/* Bank Header Emblem */}
        <div className="bank-pin-header">
          <div className="bank-pin-badge-shield">
            <ShieldCheck size={28} />
          </div>
          <span className="bank-pin-tag">SMARTPARK SECURITY MATRIX</span>
          <h2 className="bank-pin-title">
            {titleText || (mode === 'setup'
              ? (step === 0
                  ? 'Xác Thực Bảo Mật Đổi PIN'
                  : step === 1
                  ? (hasExistingPin ? 'Nhập Mã PIN Quản Trị Mới' : 'Thiết Lập Mã PIN (1 Lần Duy Nhất)')
                  : 'Xác Nhận Lại Mã PIN Mới')
              : 'Xác Thực Mã PIN Quản Trị')}
          </h2>
          <p className="bank-pin-desc">
            {descriptionText || (mode === 'setup'
              ? (step === 0
                  ? 'Mã PIN chỉ được thiết lập lần đầu 1 lần. Để thay đổi mã PIN mới, quý khách cần xác thực thông tin bảo mật.'
                  : step === 1
                  ? (hasExistingPin
                      ? 'Nhập 6 chữ số để thiết lập mã PIN bảo mật quản trị mới'
                      : 'Nhập 6 chữ số để thiết lập mã PIN quản trị (chỉ cài đặt 1 lần duy nhất)')
                  : 'Vui lòng nhập lại đúng 6 chữ số vừa tạo để hoàn tất')
              : 'Nhập mã PIN 6 số để phê duyệt tác vụ bảo mật cấp cao')}
          </p>
        </div>

        {/* Loading check status */}
        {checkingStatus && (
          <div className="bank-pin-loading" style={{ margin: '1rem 0' }}>
            <span className="bank-pin-spinner" />
            <span>Đang kiểm tra hồ sơ bảo mật Admin...</span>
          </div>
        )}

        {/* =========================================================
            BƯỚC 0: XÁC THỰC THÔNG TIN BẢO MẬT (NẾU ĐÃ CÀI PIN TRƯỚC ĐÓ)
        ========================================================= */}
        {mode === 'setup' && step === 0 && !checkingStatus && (
          <div className="bank-security-step-wrap">
            <div className="bank-security-banner">
              <ShieldAlert size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div>
                <strong>Quy định bảo mật Quản trị:</strong> Mã PIN hệ thống chỉ cho phép cài đặt ban đầu 1 lần duy nhất. Thay đổi mã PIN bắt buộc phải xác minh danh tính quản trị viên.
              </div>
            </div>

            {/* Switch Phương thức xác thực */}
            <div className="bank-auth-tabs">
              <button
                type="button"
                className={`bank-auth-tab ${authMethod === 'password' ? 'active' : ''}`}
                onClick={() => { setAuthMethod('password'); setError(''); }}
              >
                <KeyRound size={14} /> Mật Khẩu Admin
              </button>
              <button
                type="button"
                className={`bank-auth-tab ${authMethod === 'current_pin' ? 'active' : ''}`}
                onClick={() => { setAuthMethod('current_pin'); setError(''); }}
              >
                <Key size={14} /> Mã PIN Hiện Tại
              </button>
            </div>

            <form onSubmit={handleVerifySecurityAuth} className="bank-auth-form">
              {authMethod === 'password' ? (
                <div className="bank-auth-field">
                  <label>Mật khẩu đăng nhập Quản trị viên:</label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu tài khoản Admin..."
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    autoFocus
                    className="bank-auth-input"
                  />
                </div>
              ) : (
                <div className="bank-auth-field">
                  <label>Mã PIN bảo mật hiện tại (6 số):</label>
                  <input
                    type="password"
                    maxLength={8}
                    placeholder="Nhập mã PIN hiện tại..."
                    value={authCurrentPin}
                    onChange={(e) => setAuthCurrentPin(e.target.value)}
                    autoFocus
                    className="bank-auth-input"
                  />
                </div>
              )}

              {error && (
                <div className="bank-pin-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bank-auth-submit-btn"
              >
                {loading ? 'Đang xác minh bảo mật...' : 'Xác Thực & Tiếp Tục Đổi PIN →'}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================
            BƯỚC 1 & 2: NHẬP VÀ XÁC NHẬN MÃ PIN 6 SỐ
        ========================================================= */}
        {(step === 1 || step === 2) && !checkingStatus && (
          <>
            {/* Step dots for Setup mode */}
            {mode === 'setup' && (
              <div className="bank-pin-steps-indicator">
                {hasExistingPin && (
                  <div className="bank-step-bar active" style={{ borderColor: '#10b981', color: '#34d399' }}>
                    <span>✓ Đã xác thực</span>
                  </div>
                )}
                <div className={`bank-step-bar ${step >= 1 ? 'active' : ''}`}>
                  <span>{hasExistingPin ? '1. Nhập PIN mới' : '1. Tạo mã PIN (1 lần)'}</span>
                </div>
                <div className={`bank-step-bar ${step === 2 ? 'active' : ''}`}>
                  <span>2. Xác nhận lại</span>
                </div>
              </div>
            )}

            {/* 6 Digit Indicator Circles */}
            <div className={`bank-pin-dots-container ${shake ? 'shake' : ''}`}>
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = idx < currentInput.length;
                return (
                  <div
                    key={idx}
                    className={`bank-pin-dot ${isFilled ? 'filled' : ''}`}
                  >
                    {isFilled && <span className="bank-dot-bullet" />}
                  </div>
                );
              })}
            </div>

            {/* Status Messages */}
            {error && (
              <div className="bank-pin-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bank-pin-success">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {loading && (
              <div className="bank-pin-loading">
                <span className="bank-pin-spinner" />
                <span>Đang mã hóa &amp; kiểm tra xác thực...</span>
              </div>
            )}

            {/* Tactile 3x4 Bank Numeric Keypad */}
            <div className="bank-pin-keypad">
              {KEYPAD_KEYS.map((key) => {
                const isSpecial = key.num === 'clear' || key.num === 'backspace';
                return (
                  <button
                    key={key.num}
                    type="button"
                    className={`bank-key-btn ${isSpecial ? 'special' : ''}`}
                    onClick={() => handleKeyPress(key.num)}
                    disabled={loading || Boolean(successMsg)}
                  >
                    {isSpecial ? (
                      <span className="bank-key-label">{key.label}</span>
                    ) : (
                      <>
                        <span className="bank-key-number">{key.num}</span>
                        <span className="bank-key-sub">{key.sub}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer info */}
            <div className="bank-pin-footer">
              <Lock size={12} />
              <span>Bảo mật chuẩn mã hóa ngân hàng 256-bit AES &amp; bcrypt</span>
              {step === 2 && mode === 'setup' && (
                <button
                  type="button"
                  className="bank-pin-back-btn"
                  onClick={() => {
                    setStep(1);
                    setConfirmPin('');
                    setError('');
                  }}
                >
                  <RotateCcw size={12} /> Quay lại bước 1
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

BankPinModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['setup', 'verify']),
  onSuccess: PropTypes.func,
  titleText: PropTypes.string,
  descriptionText: PropTypes.string,
};
