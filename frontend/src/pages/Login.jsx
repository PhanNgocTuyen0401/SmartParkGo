import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button, Form, InputGroup } from 'react-bootstrap';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { authenticateUser, sendForgotPasswordOtp, resetPasswordWithOtp } from '../services/authService';

import '../App.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Chế độ hiển thị: 'login' | 'forgot_password'
  const [viewMode, setViewMode] = useState(
    location.pathname === '/forgot-password' ? 'forgot_password' : 'login'
  );

  // Form Đăng nhập
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('sp_remember_login') === 'true';
  });

  // Tự động điền tài khoản & mật khẩu đã ghi nhớ từ phiên trước
  useEffect(() => {
    const isRemembered = localStorage.getItem('sp_remember_login') === 'true';
    if (isRemembered) {
      setRememberMe(true);
      const savedAccount = localStorage.getItem('sp_saved_account');
      const savedPassword = localStorage.getItem('sp_saved_password');
      if (savedAccount) {
        setEmail(savedAccount);
      }
      if (savedPassword) {
        try {
          setPassword(atob(savedPassword));
        } catch {
          setPassword(savedPassword);
        }
      }
    }
  }, []);

  const handleToggleRemember = (checked) => {
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem('sp_remember_login');
      localStorage.removeItem('sp_saved_account');
      localStorage.removeItem('sp_saved_password');
    }
  };

  // Form Quên mật khẩu
  // Step 1: Nhập email & Gửi OTP; Step 2: Nhập OTP & Mật khẩu mới; Step 3: Hoàn tất
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Đếm ngược gửi lại OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Xử lý gửi mã OTP đặt lại mật khẩu
  const handleSendResetOtp = async (e) => {
    e?.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const targetEmail = (forgotEmail || email).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setForgotError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await sendForgotPasswordOtp(targetEmail);
      setForgotLoading(false);
      if (res.success) {
        setForgotEmail(targetEmail);
        setForgotStep(2);
        setForgotSuccess(res.message || 'Mã OTP đặt lại mật khẩu đã được gửi đến email của bạn.');
        setResendCooldown(60);
      } else {
        setForgotError(res.message || 'Không tìm thấy tài khoản với email này.');
      }
    } catch (err) {
      setForgotLoading(false);
      setForgotError('Lỗi kết nối khi gửi OTP: ' + err.message);
    }
  };

  // Xử lý xác thực OTP và đổi mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Mã OTP phải bao gồm đúng 6 chữ số.');
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Xác nhận mật khẩu mới không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPasswordWithOtp(forgotEmail, forgotOtp.trim(), forgotNewPassword);
      setForgotLoading(false);
      if (res.success) {
        setForgotStep(3);
        setForgotSuccess(res.message || 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
        setEmail(forgotEmail);
        setPassword('');
      } else {
        setForgotError(res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err) {
      setForgotLoading(false);
      setForgotError('Lỗi kết nối khi đặt lại mật khẩu: ' + err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const auth = await authenticateUser(email, password);

      setLoading(false);

      if (auth.success) {
        // Lưu hoặc xóa thông tin đăng nhập theo trạng thái Ghi nhớ
        if (rememberMe) {
          localStorage.setItem('sp_remember_login', 'true');
          localStorage.setItem('sp_saved_account', email.trim());
          if (password) {
            localStorage.setItem('sp_saved_password', btoa(password));
          }
        } else {
          localStorage.removeItem('sp_remember_login');
          localStorage.removeItem('sp_saved_account');
          localStorage.removeItem('sp_saved_password');
        }

        if (auth.user.role === 'admin') {
          setStatusMessage('Đăng nhập thành công với quyền Quản Trị Viên (Admin). Đang chuyển hướng...');
          window.setTimeout(() => navigate('/admin'), 400);
        } else if (auth.user.role === 'staff') {
          setStatusMessage('Đăng nhập thành công với quyền Nhân Viên Trạm Trực. Đang chuyển hướng...');
          window.setTimeout(() => navigate('/staff'), 400);
        } else {
          setStatusMessage('Đăng nhập thành công với quyền Khách Hàng. Đang chuyển hướng...');
          window.setTimeout(() => navigate('/home'), 400);
        }
      } else {
        setErrorMessage(auth.message || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage('Lỗi hệ thống khi đăng nhập: ' + err.message);
    }
  };

  return (
    <main className="login-page">
      <div className="login-orb login-orb-one"></div>
      <div className="login-orb login-orb-two"></div>

      <section className="login-panel" aria-label="Đăng nhập / Quên mật khẩu">
        <Link to="/" className="login-brand" aria-label="SmartPark" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img src="/smartpark-logo.png" alt="SmartPark Logo" style={{ height: '44px', width: '44px', objectFit: 'contain', borderRadius: '8px' }} />
          <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em', color: '#0284c7' }}>
            Smart<span style={{ color: '#10b981' }}>Park</span>
          </span>
        </Link>

        {viewMode === 'login' ? (
          /* ══════════════════════════════════════════════
             MÀN HÌNH ĐĂNG NHẬP
          ══════════════════════════════════════════════ */
          <>
            <div className="login-heading">
              <span className="register-label">SMARTPARK ĐÀ NẴNG</span>
              <h1>Đăng nhập hệ thống</h1>
              <p>Hệ thống tự động phân quyền truy cập: Khách hàng, Nhân viên trực bốt hoặc Quản trị viên.</p>
            </div>

            {statusMessage && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600'
              }}>
                {statusMessage}
              </div>
            )}

            {errorMessage && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="form-group">
                <Form.Label>Tài khoản Email hoặc Tên đăng nhập</Form.Label>
                <InputGroup className="custom-input">
                  <InputGroup.Text><Mail size={17} /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Nhập email hoặc tên tài khoản"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="form-group login-password-group">
                <div className="login-field-label">
                  <Form.Label>Mật khẩu</Form.Label>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot_password');
                      setForgotEmail(email);
                      setForgotStep(1);
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <InputGroup className="custom-input">
                  <InputGroup.Text><LockKeyhole size={17} /></InputGroup.Text>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="button" className="password-btn" onClick={() => setShowPassword(!showPassword)} aria-label="Hiển thị mật khẩu">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </InputGroup>
              </Form.Group>

              <div className="login-options" style={{ marginBottom: '1.25rem' }}>
                <Form.Check
                  type="checkbox"
                  id="remember"
                  label="Ghi nhớ đăng nhập trên thiết bị này"
                  checked={rememberMe}
                  onChange={(e) => handleToggleRemember(e.target.checked)}
                />
              </div>

              <Button type="submit" className="register-btn" disabled={loading}>
                {loading ? 'Đang xác thực hệ thống...' : <><ShieldCheck size={17} /> Đăng nhập hệ thống <ArrowRight size={17} /></>}
              </Button>
            </Form>

            <p className="login-link">Chưa có tài khoản?<Link to="/">Tạo tài khoản</Link></p>
          </>
        ) : (
          /* ══════════════════════════════════════════════
             MÀN HÌNH QUÊN MẬT KHẨU (XÁC THỰC OTP QUA EMAIL)
          ══════════════════════════════════════════════ */
          <>
            <div className="login-heading">
              <span className="register-label">BẢO MẬT TÀI KHOẢN SMARTPARK</span>
              <h1>Đặt lại mật khẩu</h1>
              <p>Hệ thống sẽ gửi mã xác thực 6 số (OTP) tới hộp thư Gmail của bạn để thiết lập mật khẩu mới an toàn.</p>
            </div>

            {forgotError && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && forgotStep !== 3 && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={16} />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 && (
              /* Bước 1: Nhập Email */
              <Form onSubmit={handleSendResetOtp}>
                <Form.Group className="form-group">
                  <Form.Label>Nhập Email đã đăng ký</Form.Label>
                  <InputGroup className="custom-input">
                    <InputGroup.Text><Mail size={17} /></InputGroup.Text>
                    <Form.Control
                      type="email"
                      placeholder="Nhập địa chỉ email của bạn..."
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Button
                  type="submit"
                  className="register-btn"
                  disabled={forgotLoading}
                  style={{ marginTop: '1.25rem' }}
                >
                  {forgotLoading ? (
                    'Đang kiểm tra và gửi OTP...'
                  ) : (
                    <>
                      <KeyRound size={17} /> Nhận mã OTP qua Email <ArrowRight size={17} />
                    </>
                  )}
                </Button>

                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { setViewMode('login'); setForgotError(''); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <ArrowLeft size={14} /> Quay lại trang Đăng nhập
                  </button>
                </div>
              </Form>
            )}

            {forgotStep === 2 && (
              /* Bước 2: Nhập OTP & Mật khẩu mới */
              <Form onSubmit={handleResetPassword}>
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: '#0284c7'
                }}>
                  Mã OTP 6 số đã được gửi tới: <strong>{forgotEmail}</strong>
                </div>

                <Form.Group className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Form.Label>Mã xác thực OTP (6 chữ số)</Form.Label>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || forgotLoading}
                      onClick={handleSendResetOtp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: resendCooldown > 0 ? '#94a3b8' : '#0284c7',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                        padding: 0
                      }}
                    >
                      {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
                    </button>
                  </div>
                  <InputGroup className="custom-input">
                    <InputGroup.Text><KeyRound size={17} /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{ letterSpacing: '4px', fontWeight: '800', fontSize: '1.05rem' }}
                      required
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="form-group">
                  <Form.Label>Mật khẩu mới (Tối thiểu 6 ký tự)</Form.Label>
                  <InputGroup className="custom-input">
                    <InputGroup.Text><LockKeyhole size={17} /></InputGroup.Text>
                    <Form.Control
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu mới"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                    />
                    <Button type="button" className="password-btn" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Form.Group className="form-group">
                  <Form.Label>Xác nhận mật khẩu mới</Form.Label>
                  <InputGroup className="custom-input">
                    <InputGroup.Text><LockKeyhole size={17} /></InputGroup.Text>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu mới"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      required
                    />
                    <Button type="button" className="password-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Button
                  type="submit"
                  className="register-btn"
                  disabled={forgotLoading}
                  style={{ marginTop: '1.25rem' }}
                >
                  {forgotLoading ? (
                    'Đang xác thực và cập nhật mật khẩu...'
                  ) : (
                    <>
                      <ShieldCheck size={17} /> Xác Nhận Đổi Mật Khẩu <ArrowRight size={17} />
                    </>
                  )}
                </Button>

                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setForgotError(''); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ← Đổi địa chỉ email khác
                  </button>
                  <button
                    type="button"
                    onClick={() => { setViewMode('login'); setForgotError(''); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Đăng nhập
                  </button>
                </div>
              </Form>
            )}

            {forgotStep === 3 && (
              /* Bước 3: Đổi mật khẩu thành công */
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem'
                }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
                  Đổi mật khẩu thành công!
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.75rem', lineHeight: 1.5 }}>
                  Mật khẩu tài khoản <strong>{forgotEmail}</strong> của bạn đã được cập nhật an toàn vào cơ sở dữ liệu SmartPark.
                </p>

                <Button
                  type="button"
                  className="register-btn"
                  onClick={() => {
                    setViewMode('login');
                    setForgotStep(1);
                    setStatusMessage('Đã cập nhật mật khẩu mới thành công! Vui lòng nhập mật khẩu mới để đăng nhập.');
                  }}
                >
                  <ShieldCheck size={17} /> Đăng Nhập Ngay Bây Giờ <ArrowRight size={17} />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Login;
