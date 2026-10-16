import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import {
  Container,
  Row,
  Col,
  Form,
  Button,
  InputGroup
} from 'react-bootstrap';

import {
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Zap,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CarFront
} from 'lucide-react';

import './App.css';
import { registerUser, sendOtp } from './services/authService';

const DEFAULT_AD_SLIDES = [
  {
    id: 'ad-1',
    tag: 'TRẠM SẠC EV & SMARTPARK ĐÀ NẴNG',
    title: 'Bãi đỗ xe thông minh SmartPark Đà Nẵng',
    desc: 'Hệ thống trạm sạc xe điện EV 120kW và cảm biến ô đỗ thông minh tại toàn bộ 5 chi nhánh TP. Đà Nẵng.',
    imageUrl: '/slide_smartpark_ev.jpg',
    badge: 'Trạm Sạc EV 120kW',
    location: 'SmartPark - Aeon Mall & Trung Tâm TP. Đà Nẵng'
  },
  {
    id: 'ad-2',
    tag: 'CÔNG NGHỆ NHẬN DIỆN BIỂN SỐ AI',
    title: 'Barrier tự động không dừng 1.5 giây',
    desc: 'Hệ thống camera AI quét biển số tự động 99.8% độ chính xác, ra vào bãi xe mượt mà không cần quẹt thẻ.',
    imageUrl: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1600&q=85',
    badge: 'AI Vision Barrier',
    location: 'Vincom Plaza Ngô Quyền & Sân Bay Quốc Tế'
  },
  {
    id: 'ad-3',
    tag: 'ĐẶT CHỖ TRƯỚC GIỮ CHỖ 20 NGÀY',
    title: 'Giảm đến 40% khi mua vé dài hạn',
    desc: 'Chủ động chọn ô đỗ yêu thích qua ứng dụng di động, tích điểm thưởng ParkPoints đổi voucher miễn phí.',
    imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1600&q=85',
    badge: 'Ưu Đãi Vé Dài Hạn',
    location: 'Lotte Mart & Indochina Riverside Mall'
  }
];

function getAdSlides() {
  try {
    const saved = localStorage.getItem('sp_admin_ad_slides');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Sử dụng slide mặc định nếu localStorage trống
  }
  return DEFAULT_AD_SLIDES;
}

function App() {
  const [adSlides, setAdSlides] = useState(() => getAdSlides());
  const [currentAdSlide, setCurrentAdSlide] = useState(0);

  // Đồng bộ banner từ backend API hoặc admin theo thời gian thực (Real-time Socket.IO)
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/admin/ad-banners');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setAdSlides(json.data);
          try {
            localStorage.setItem('sp_admin_ad_slides', JSON.stringify(json.data));
          } catch {}
        }
      } catch {
        // Fallback giữ nguyên slides hiện tại
      }
    };
    fetchBanners();

    // Kết nối Socket.IO nhận thông báo cập nhật slide từ Admin ngay lập tức
    const socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
    socket.on('banner:updated', () => {
      fetchBanners();
    });

    // Lắng nghe cập nhật qua localStorage giữa các tab trình duyệt
    const handleStorage = (e) => {
      if (e.key === 'sp_admin_ad_slides' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdSlides(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      socket.disconnect();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const [isPaused, setIsPaused] = useState(false);

  // Auto rotate banner slides every 5s (pauses on hover)
  useEffect(() => {
    if (isPaused || !adSlides || adSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAdSlide((prev) => (prev + 1) % adSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [adSlides, isPaused]);

  const [step] = useState(1);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  /* =====================================================
     STATE
  ===================================================== */

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });


  /* =====================================================
     COUNTDOWN OTP
  ===================================================== */

  useEffect(() => {

    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {

      setCountdown((prev) => {

        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;

      });

    }, 1000);

    return () => clearInterval(timer);

  }, [countdown]);




  /* =====================================================
     XỬ LÝ INPUT
  ===================================================== */
  const handleChange = (e) => {

    const {
      name,
      value
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

  };





  /* =====================================================
     GỬI OTP QUA EMAIL THỰC TẾ (POSTGRESQL & NODEMAILER)
  ===================================================== */
  const handleSendOTP = async () => {
    setMessage('');

    if (!formData.email || !formData.email.toLowerCase().includes('@')) {
      setMessage('Vui lòng sử dụng địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);

    try {
      const res = await sendOtp(formData.email, formData.fullName);
      setLoading(false);

      if (res.success) {
        setCountdown(60);
        setOtpSent(true);
        if (res.isRealSmtp) {
          setOtp('');
          setMessage(`✓ ${res.message}`);
        } else {
          setOtp(res.otp || '');
          setMessage(`✓ ${res.message}`);
        }
      } else {
        setMessage(res.message || 'Không thể gửi mã OTP.');
      }
    } catch (err) {
      setLoading(false);
      setMessage('Lỗi kết nối máy chủ gửi OTP: ' + err.message);
    }
  };


  /* =====================================================
     XÁC NHẬN OTP & ĐĂNG KÝ TÀI KHOẢN VÀO POSTGRESQL
  ===================================================== */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setMessage('');

    if (otp.length !== 6) {
      setMessage('Vui lòng nhập đủ 6 số OTP.');
      return;
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPassword.test(formData.password)) {
      setMessage('Mật khẩu cần từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerUser({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || '',
        otp: otp
      });

      setLoading(false);

      if (res.success) {
        setMessage('Đăng ký tài khoản thành công! Tặng ngay 500 điểm thưởng. Đang chuyển vào trang chủ...');
        setTimeout(() => {
          window.location.href = '/home';
        }, 800);
      } else {
        setMessage(res.message || 'Đăng ký không thành công. Vui lòng thử lại.');
      }
    } catch (err) {
      setLoading(false);
      setMessage('Không thể kết nối đến máy chủ đăng ký: ' + err.message);
    }
  };


  /* =====================================================
     GỬI LẠI OTP
  ===================================================== */
  const handleResendOTP = async () => {
    if (countdown > 0) {
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      const res = await sendOtp(formData.email, formData.fullName);
      setLoading(false);

      if (res.success) {
        setCountdown(60);
        if (res.isRealSmtp) {
          setOtp('');
          setMessage(`✓ ${res.message}`);
        } else {
          setOtp(res.otp || '');
          setMessage(`✓ ${res.message}`);
        }
      } else {
        setMessage(res.message || 'Không thể gửi lại mã OTP.');
      }
    } catch (err) {
      setLoading(false);
      setMessage('Lỗi gửi lại mã OTP: ' + err.message);
    }
  };

  const handleBack = () => {
    setOtp('');
    setMessage('');
  };


  /* =====================================================
     OTP INPUT
  ===================================================== */

  const handleOTPChange = (e) => {

    const value =
      e.target.value
        .replace(/\D/g, '')
        .slice(0, 6);

    setOtp(value);

    setMessage('');

  };


  /* =====================================================
     RETURN
  ===================================================== */

  return (

    <div className="register-page">

      <Container
        fluid
        className="p-0"
      >

        <Row className="g-0 min-vh-100">


          {/* =================================================
              LEFT SIDE - FULL SCREEN ADS SLIDESHOW
          ================================================= */}
          {/* =================================================
              LEFT SIDE - FULL SCREEN VISUAL PHOTO SLIDESHOW (SHOWCASE NHƯ ẢNH MẪU)
          ================================================= */}
          <Col
            lg={6}
            className="register-left d-none d-lg-block p-0"
            style={{
              position: 'relative',
              overflow: 'hidden',
              height: '100vh',
              background: '#090d16'
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Slide Layers with Ken-Burns Subtle Zoom & Smooth Crossfade */}
            {adSlides.map((sl, idx) => (
              <div
                key={sl.id || idx}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: currentAdSlide === idx ? 1 : 0,
                  visibility: currentAdSlide === idx ? 'visible' : 'hidden',
                  transition: 'opacity 0.85s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.85s',
                  zIndex: currentAdSlide === idx ? 1 : 0,
                  overflow: 'hidden'
                }}
              >
                <img
                  src={sl.imageUrl}
                  alt={sl.title || `SmartPark Slide ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: currentAdSlide === idx ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 8s cubic-bezier(0.25, 1, 0.5, 1)',
                    display: 'block'
                  }}
                />
              </div>
            ))}

            {/* Subtle Vignettes for Logo & Controls contrast without muddying center */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.1) 22%, transparent 45%, transparent 68%, rgba(0, 0, 0, 0.25) 86%, rgba(0, 0, 0, 0.65) 100%)',
                pointerEvents: 'none',
                zIndex: 2
              }}
            />

            {/* TOP-LEFT FLOATING LOGO PILL (CHUẨN THEO ẢNH MẪU USER) */}
            <div
              style={{
                position: 'absolute',
                top: '1.75rem',
                left: '1.75rem',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(11, 17, 32, 0.72)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '999px',
                padding: '0.45rem 1rem 0.45rem 0.5rem',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 14px rgba(56, 189, 248, 0.5)',
                  padding: '2px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}
              >
                <img
                  src="/smartpark-logo.png"
                  alt="SmartPark Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.06em', color: '#ffffff', lineHeight: 1.1 }}>
                  SMART<span style={{ color: '#38bdf8' }}>PARK</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 500, letterSpacing: '0.02em' }}>
                  Hệ thống Đỗ xe Thông Minh - Đà Nẵng
                </div>
              </div>
            </div>

            {/* BOTTOM BAR: INDICATOR PILLS (LEFT) & CIRCULAR NAV ARROWS (RIGHT) */}
            <div
              style={{
                position: 'absolute',
                bottom: '1.75rem',
                left: '1.75rem',
                right: '1.75rem',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              {/* Pagination Dots / Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {adSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentAdSlide(idx)}
                    style={{
                      height: '7px',
                      width: currentAdSlide === idx ? '32px' : '9px',
                      borderRadius: '999px',
                      background: currentAdSlide === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.38)',
                      boxShadow: currentAdSlide === idx ? '0 0 12px rgba(255, 255, 255, 0.9)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    aria-label={`Đi tới slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Prev & Next Circular Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentAdSlide(prev => (prev === 0 ? adSlides.length - 1 : prev - 1))}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(15, 23, 42, 0.68)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.68)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  aria-label="Slide trước"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentAdSlide(prev => (prev + 1) % adSlides.length)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(15, 23, 42, 0.68)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.68)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  aria-label="Slide kế tiếp"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </Col>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}
          <Col
            lg={6}
            className="register-right"
          >
            <div className="register-container">
              {/* MOBILE BRAND */}
              <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src="/smartpark-logo.png"
                  alt="SmartPark"
                  style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }}
                />
                <span style={{ fontWeight: 800, letterSpacing: '0.04em' }}>
                  SMARTPARK ĐÀ NẴNG
                </span>
              </div>


              {/* =================================================
                  STEP 1
              ================================================= */}

              {step === 1 && (

                <div className="form-screen">


                  <div className="register-header">

                    <div className="register-label">
                      CREATE ACCOUNT
                    </div>

                    <h2>
                      Tạo tài khoản
                    </h2>

                    <p>
                      Đăng ký tài khoản để bắt đầu
                      sử dụng hệ thống bãi đỗ xe thông minh.
                    </p>

                  </div>


                  {/* MESSAGE */}

                  {message && (

                    <div className="form-message">

                      <span></span>

                      {message}

                    </div>

                  )}


                  <Form onSubmit={handleVerifyOTP}>


                    {/* NAME */}

                    <Form.Group
                      className="form-group"
                    >

                      <Form.Label>
                        Họ và tên
                      </Form.Label>

                      <InputGroup
                        className="custom-input"
                      >

                        <InputGroup.Text>

                          <UserRound size={17} />

                        </InputGroup.Text>


                        <Form.Control
                          type="text"
                          name="fullName"
                          placeholder="Nguyễn Văn A"
                          value={
                            formData.fullName
                          }
                          onChange={
                            handleChange
                          }
                          required
                        />

                      </InputGroup>

                    </Form.Group>


                    {/* EMAIL */}

                    <Form.Group
                      className="form-group"
                    >

                      <Form.Label>
                        Gmail
                      </Form.Label>

                      <InputGroup
                        className="custom-input"
                      >

                        <InputGroup.Text>

                          <Mail size={17} />

                        </InputGroup.Text>


                        <Form.Control
                          type="email"
                          name="email"
                          placeholder="example@gmail.com"
                          value={
                            formData.email
                          }
                          onChange={
                            handleChange
                          }
                          required
                        />

                      </InputGroup>

                      <div className="otp-inline">
                        <div className="input-hint">Xác thực Gmail bằng mã OTP 6 số.</div>

                        {!otpSent ? (
                          <Button type="button" className="send-otp-btn" onClick={handleSendOTP} disabled={loading}>
                            {loading ? <><RefreshCw size={15} className="spin" /> Đang gửi mã</> : <><Mail size={15} /> Gửi mã OTP</>}
                          </Button>
                        ) : (
                          <>
                            <div className="otp-inline-head">
                              <span>Mã đã gửi tới Gmail</span>
                              <button type="button" onClick={handleResendOTP} disabled={countdown > 0 || loading}>
                                <RefreshCw size={13} /> {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
                              </button>
                            </div>
                            <Form.Control className="otp-input otp-inline-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={otp} onChange={handleOTPChange} />
                            <div className="otp-dots">{[0, 1, 2, 3, 4, 5].map((index) => <span key={index} className={index < otp.length ? 'active' : ''}></span>)}</div>
                          </>
                        )}
                      </div>

                    </Form.Group>


                    {/* PASSWORD */}

                    <Row>

                      <Col md={6}>

                        <Form.Group
                          className="form-group"
                        >

                          <Form.Label>
                            Mật khẩu
                          </Form.Label>

                          <InputGroup
                            className="custom-input"
                          >

                            <InputGroup.Text>

                              <LockKeyhole size={17} />

                            </InputGroup.Text>


                            <Form.Control
                              type={
                                showPassword
                                  ? 'text'
                                  : 'password'
                              }
                              name="password"
                              placeholder="••••••••"
                              value={
                                formData.password
                              }
                              onChange={
                                handleChange
                              }
                              minLength={8}
                              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                              title="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
                              required
                            />


                            <Button
                              type="button"
                              className="password-btn"
                              onClick={() =>
                                setShowPassword(
                                  !showPassword
                                )
                              }
                            >

                              {showPassword ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}

                            </Button>

                          </InputGroup>

                        </Form.Group>

                      </Col>


                      <Col md={6}>

                        <Form.Group
                          className="form-group"
                        >

                          <Form.Label>
                            Xác nhận
                          </Form.Label>

                          <InputGroup
                            className="custom-input"
                          >

                            <InputGroup.Text>

                              <LockKeyhole size={17} />

                            </InputGroup.Text>


                            <Form.Control
                              type={
                                showConfirmPassword
                                  ? 'text'
                                  : 'password'
                              }
                              name="confirmPassword"
                              placeholder="••••••••"
                              value={
                                formData.confirmPassword
                              }
                              onChange={
                                handleChange
                              }
                              minLength={8}
                              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}"
                              title="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
                              required
                            />


                            <Button
                              type="button"
                              className="password-btn"
                              onClick={() =>
                                setShowConfirmPassword(
                                  !showConfirmPassword
                                )
                              }
                            >

                              {showConfirmPassword ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}

                            </Button>

                          </InputGroup>

                        </Form.Group>

                      </Col>

                    </Row>

                    <div className="password-requirements">
                      <ShieldCheck size={14} />
                      <span>Mật khẩu mạnh: tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</span>
                    </div>


                    {/* TERMS */}

                    <div className="terms">

                      <Form.Check
                        type="checkbox"
                        id="terms"
                        required
                        label={
                          <span>

                            Tôi đồng ý với{' '}

                            <a href="#">
                              điều khoản
                            </a>

                            {' '}và{' '}

                            <a href="#">
                              chính sách bảo mật
                            </a>

                          </span>
                        }
                      />

                    </div>


                    <Button
                      type="submit"
                      className="register-btn"
                      disabled={loading || !otpSent || otp.length !== 6}
                    >

                      {loading ? (

                        <>

                          <RefreshCw
                            size={17}
                            className="spin"
                          />

                          Đang xác nhận...

                        </>

                      ) : (

                        <>

                          <ShieldCheck size={17} />

                          Tạo tài khoản

                          <ArrowRight size={17} />

                        </>

                      )}

                    </Button>

                  </Form>


                  <div className="login-link">
                    Đã có tài khoản? <a href="/login">Đăng nhập ngay</a>
                  </div>


                </div>

              )}


              {/* =================================================
                  STEP 2
              ================================================= */}

              {step === 2 && (

                <div className="otp-screen">


                  {/* ICON */}

                  <div className="otp-icon">

                    <div className="otp-icon-ring">

                      <Mail size={25} />

                    </div>

                  </div>


                  {/* HEADER */}

                  <div className="register-header otp-header">

                    <div className="register-label">
                      EMAIL VERIFICATION
                    </div>

                    <h2>
                      Xác thực email
                    </h2>

                    <p>
                      Nhập mã OTP 6 số đã được
                      gửi tới
                    </p>

                    <strong className="otp-email">
                      {formData.email}
                    </strong>

                  </div>


                  {/* MESSAGE */}

                  {message && (

                    <div
                      className={
                        message.includes(
                          'thành công'
                        )
                          ? 'form-message success'
                          : 'form-message'
                      }
                    >

                      <span></span>

                      {message}

                    </div>

                  )}


                  <Form
                    onSubmit={handleVerifyOTP}
                  >


                    {/* OTP */}

                    <Form.Group
                      className="otp-group"
                    >

                      <Form.Label>
                        Mã xác thực
                      </Form.Label>


                      <Form.Control
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={
                          handleOTPChange
                        }
                        autoFocus
                      />


                      {/* OTP INDICATORS */}

                      <div className="otp-dots">

                        {[0, 1, 2, 3, 4, 5].map(
                          (index) => (

                            <span
                              key={index}
                              className={
                                index <
                                otp.length
                                  ? 'active'
                                  : ''
                              }
                            ></span>

                          )
                        )}

                      </div>

                    </Form.Group>


                    {/* RESEND */}

                    <div className="otp-info">

                      <span>
                        Chưa nhận được mã?
                      </span>


                      <button
                        type="button"
                        onClick={
                          handleResendOTP
                        }
                        disabled={
                          countdown > 0 ||
                          loading
                        }
                      >

                        <RefreshCw size={13} />

                        {countdown > 0
                          ? `Gửi lại sau ${countdown}s`
                          : 'Gửi lại OTP'
                        }

                      </button>

                    </div>


                    {/* VERIFY */}

                    <Button
                      type="submit"
                      className="register-btn"
                      disabled={
                        loading ||
                        otp.length !== 6
                      }
                    >

                      {loading ? (

                        <>

                          <RefreshCw
                            size={17}
                            className="spin"
                          />

                          Đang xác nhận...

                        </>

                      ) : (

                        <>

                          <ShieldCheck size={17} />

                          Xác nhận OTP

                          <ArrowRight size={17} />

                        </>

                      )}

                    </Button>


                    {/* BACK */}

                    <button
                      type="button"
                      className="back-btn"
                      onClick={handleBack}
                    >

                      <ArrowLeft size={15} />

                      Quay lại chỉnh sửa thông tin

                    </button>

                  </Form>


                  {/* SECURITY */}

                  <div className="otp-security">

                    <ShieldCheck size={16} />

                    <div>

                      <strong>
                        Bảo mật tài khoản
                      </strong>

                      <span>
                        Mã OTP chỉ được sử dụng
                        để xác minh địa chỉ email.
                      </span>

                    </div>

                  </div>




                </div>

              )}

            </div>

          </Col>

        </Row>

      </Container>
    </div>
  );
}

export default App;
