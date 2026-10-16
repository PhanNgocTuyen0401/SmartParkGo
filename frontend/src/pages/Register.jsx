import { useState, useEffect } from 'react';
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
  CarFront,
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  ParkingSquare,
  Zap,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Tag,
  Building2
} from 'lucide-react';
import './App.css';

const DEFAULT_BANNER_SLIDES = [
  {
    id: 1,
    tag: 'TRẠM SẠC EV & SMARTPARK ĐÀ NẴNG',
    title: 'BÃI ĐỖ XE THÔNG MINH SMARTPARK ĐÀ NẴNG',
    desc: 'Hệ thống trạm sạc xe điện EV 120kW và cảm biến ô đỗ thông minh tại toàn bộ 5 chi nhánh TP. Đà Nẵng.',
    imageUrl: '/slide_smartpark_ev.jpg',
    badge: 'Trạm Sạc EV 120kW',
    location: 'SmartPark - Aeon Mall & Trung Tâm TP. Đà Nẵng',
    stats: '1,140 Ô đỗ toàn thành phố'
  },
  {
    id: 2,
    tag: 'CÔNG NGHỆ NHẬN DIỆN BIỂN SỐ AI',
    title: 'BARRIER TỰ ĐỘNG KHÔNG DỪNG 1.5 GIÂY',
    desc: 'Hệ thống camera AI quét biển số tự động 99.8% độ chính xác, ra vào bãi xe mượt mà không cần quẹt thẻ.',
    imageUrl: '/slide_smartpark_barrier.jpg',
    badge: 'AI Vision Barrier',
    location: 'Vincom Plaza Ngô Quyền & Sân Bay Quốc Tế',
    stats: '99.8% Chính xác biển số'
  },
  {
    id: 3,
    tag: 'ĐẶT CHỖ TRƯỚC GIỮ CHỖ 20 NGÀY',
    title: 'GIẢM ĐẾN 40% KHI MUA VÉ DÀI HẠN',
    desc: 'Chủ động chọn ô đỗ yêu thích qua ứng dụng di động, tích điểm thưởng ParkPoints đổi voucher miễn phí.',
    imageUrl: '/slide_smartpark_booking.jpg',
    badge: 'Ưu Đãi Vé Dài Hạn',
    location: 'Lotte Mart & Indochina Riverside Mall',
    stats: 'Thời hạn giữ vé 20 ngày'
  }
];

function App() {
  /* =====================================================
     STATE
  ===================================================== */
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Danh sách Slides quảng cáo kết nối trực tiếp với Quản Trị Viên (Admin)
  const [adSlides, setAdSlides] = useState(() => {
    try {
      const saved = localStorage.getItem('sp_admin_ad_slides');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasOldDemo = parsed.some(
            (s) => s.imageUrl && (s.imageUrl.includes('unsplash') || s.imageUrl.includes('photo-1590674899484'))
          );
          if (!hasOldDemo) return parsed;
        }
      }
    } catch {}
    return DEFAULT_BANNER_SLIDES;
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Preload ảnh slide để chuyển cảnh mượt mà không bị giật lag
  useEffect(() => {
    adSlides.forEach((sl) => {
      if (sl?.imageUrl) {
        const img = new Image();
        img.src = sl.imageUrl;
      }
    });
  }, [adSlides]);

  // Tự động chuyển slide mỗi 5 giây
  useEffect(() => {
    if (isPaused || adSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % adSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, adSlides.length]);

  // Lắng nghe cập nhật banner thời gian thực từ Quản Trị Viên (Admin)
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
      } catch {}
    };
    fetchBanners();

    const socket = io('http://localhost:5000', { reconnectionAttempts: 3, timeout: 5000 });
    socket.on('banner:updated', () => {
      fetchBanners();
    });

    const handleStorageChange = (e) => {
      if (e.key === 'sp_admin_ad_slides' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) setAdSlides(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      socket.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });


  /* =====================================================
     XỬ LÝ INPUT
  ===================================================== */

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

  };


  /* =====================================================
     GỬI OTP
  ===================================================== */

  const handleSendOTP = (e) => {

    e.preventDefault();

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      return;
    }


    if (
      formData.password !==
      formData.confirmPassword
    ) {

      alert('Mật khẩu xác nhận không khớp.');

      return;
    }


    /*
      DEMO FRONTEND

      Sau này thay bằng API:

      axios.post('/api/auth/send-otp', {
        email: formData.email
      });
    */

    console.log(
      'Gửi OTP tới:',
      formData.email
    );

    setStep(2);

  };


  /* =====================================================
     XÁC NHẬN OTP
  ===================================================== */

  const handleVerifyOTP = (e) => {

    e.preventDefault();

    if (otp.length !== 6) {

      alert('Vui lòng nhập đủ 6 số OTP.');

      return;
    }


    /*
      Sau này:

      axios.post('/api/auth/verify-otp', {
        email: formData.email,
        otp: otp
      });
    */

    console.log({
      ...formData,
      otp
    });

    alert('Xác thực email thành công!');

  };


  /* =====================================================
     GỬI LẠI OTP
  ===================================================== */

  const handleResendOTP = () => {

    setOtp('');

    console.log(
      'Gửi lại OTP tới:',
      formData.email
    );

    alert(
      `Đã gửi lại mã OTP tới ${formData.email}`
    );

  };


  /* =====================================================
     QUAY LẠI
  ===================================================== */

  const handleBack = () => {

    setStep(1);

    setOtp('');

  };


  return (

    <div className="register-page">

      <Container fluid className="p-0">

        <Row className="g-0 min-vh-100">


          {/* =================================================
              LEFT - PARKFLOW ADVERTISEMENT
          ================================================= */}

          {/* =================================================
              LEFT - FULL-HEIGHT SLIDESHOW (SHOWCASE NHƯ ẢNH MẪU)
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
            {/* Slide Layers with Ken-Burns Subtle Zoom & Ultra Smooth Crossfade */}
            {adSlides.map((sl, idx) => (
              <div
                key={sl.id || idx}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: currentSlide === idx ? 1 : 0,
                  pointerEvents: currentSlide === idx ? 'auto' : 'none',
                  transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: currentSlide === idx ? 2 : 1,
                  overflow: 'hidden',
                  willChange: 'opacity',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden'
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
                    transform: currentSlide === idx ? 'scale(1.06)' : 'scale(1)',
                    transition: currentSlide === idx
                      ? 'transform 8s cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'block',
                    willChange: 'transform',
                    imageRendering: '-webkit-optimize-contrast',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                  }}
                  loading="eager"
                  decoding="async"
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
                    onClick={() => setCurrentSlide(idx)}
                    style={{
                      height: '7px',
                      width: currentSlide === idx ? '32px' : '9px',
                      borderRadius: '999px',
                      background: currentSlide === idx ? '#ffffff' : 'rgba(255, 255, 255, 0.38)',
                      boxShadow: currentSlide === idx ? '0 0 12px rgba(255, 255, 255, 0.9)' : 'none',
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
                  onClick={() => setCurrentSlide(prev => (prev - 1 + adSlides.length) % adSlides.length)}
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
                  onClick={() => setCurrentSlide(prev => (prev + 1) % adSlides.length)}
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
              RIGHT
          ================================================= */}

          <Col
            lg={6}
            className="register-right"
          >

            <div className="register-container">


              {/* BRAND BADGE TRÊN FORM ĐĂNG KÝ */}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <CarFront size={17} strokeWidth={2.4} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', color: '#0f172a' }}>
                  SMARTPARK ĐÀ NẴNG
                </span>
              </div>


              {/* =================================================
                  STEP 1
              ================================================= */}

              {step === 1 && (

                <>

                  <div className="register-header" style={{ marginBottom: '1.5rem' }}>

                    <div className="register-label" style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: '#0284c7', fontWeight: 800, marginBottom: '0.25rem' }}>
                      CREATE ACCOUNT
                    </div>

                    <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
                      Tạo tài khoản
                    </h2>

                    <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                      Đăng ký tài khoản để bắt đầu sử dụng hệ thống bãi đỗ xe thông minh.
                    </p>

                  </div>


                  <Form onSubmit={handleSendOTP}>


                    {/* HỌ TÊN */}

                    <Form.Group className="form-group">

                      <Form.Label>
                        Họ và tên
                      </Form.Label>

                      <InputGroup className="custom-input">

                        <InputGroup.Text>
                          <UserRound size={18} />
                        </InputGroup.Text>

                        <Form.Control
                          type="text"
                          name="fullName"
                          placeholder="Nguyễn Văn A"
                          value={formData.fullName}
                          onChange={handleChange}
                          required
                        />

                      </InputGroup>

                    </Form.Group>


                    {/* EMAIL */}

                    <Form.Group className="form-group">

                      <Form.Label>
                        Email
                      </Form.Label>

                      <InputGroup className="custom-input">

                        <InputGroup.Text>
                          <Mail size={18} />
                        </InputGroup.Text>

                        <Form.Control
                          type="email"
                          name="email"
                          placeholder="you@gmail.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />

                      </InputGroup>

                    </Form.Group>


                    {/* PHONE */}

                    <Form.Group className="form-group">

                      <Form.Label>
                        Số điện thoại
                      </Form.Label>

                      <InputGroup className="custom-input">

                        <InputGroup.Text>
                          <Phone size={18} />
                        </InputGroup.Text>

                        <Form.Control
                          type="tel"
                          name="phone"
                          placeholder="0905 123 456"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                        />

                      </InputGroup>

                    </Form.Group>


                    {/* PASSWORD */}

                    <Row>

                      <Col md={6}>

                        <Form.Group className="form-group">

                          <Form.Label>
                            Mật khẩu
                          </Form.Label>

                          <InputGroup className="custom-input">

                            <InputGroup.Text>
                              <LockKeyhole size={18} />
                            </InputGroup.Text>

                            <Form.Control
                              type={
                                showPassword
                                  ? 'text'
                                  : 'password'
                              }
                              name="password"
                              placeholder="••••••••"
                              value={formData.password}
                              onChange={handleChange}
                              minLength={8}
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
                                <EyeOff size={17} />
                              ) : (
                                <Eye size={17} />
                              )}

                            </Button>

                          </InputGroup>

                        </Form.Group>

                      </Col>


                      {/* CONFIRM */}

                      <Col md={6}>

                        <Form.Group className="form-group">

                          <Form.Label>
                            Xác nhận
                          </Form.Label>

                          <InputGroup className="custom-input">

                            <InputGroup.Text>
                              <LockKeyhole size={18} />
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
                              onChange={handleChange}
                              minLength={8}
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
                                <EyeOff size={17} />
                              ) : (
                                <Eye size={17} />
                              )}

                            </Button>

                          </InputGroup>

                        </Form.Group>

                      </Col>

                    </Row>


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


                    {/* SEND OTP */}

                    <Button
                      type="submit"
                      className="register-btn"
                    >

                      <Mail size={17} />

                      Gửi mã xác thực

                      <ArrowRight size={17} />

                    </Button>


                  </Form>


                  <div className="login-link">

                    Đã có tài khoản?

                    <a href="#">
                      Đăng nhập
                    </a>

                  </div>

                </>

              )}


              {/* =================================================
                  STEP 2 - OTP
              ================================================= */}

              {step === 2 && (

                <div className="otp-container">


                  <div className="otp-icon">

                    <Mail size={25} />

                  </div>


                  <div className="register-header otp-header">

                    <div className="register-label">
                      EMAIL VERIFICATION
                    </div>

                    <h2>
                      Xác thực email
                    </h2>

                    <p>

                      Mã xác thực 6 số đã được
                      gửi tới

                      <strong>
                        {' '}{formData.email}
                      </strong>

                    </p>

                  </div>


                  <Form onSubmit={handleVerifyOTP}>

                    <Form.Group className="otp-group">

                      <Form.Label>
                        Nhập mã OTP
                      </Form.Label>

                      <Form.Control
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) =>
                          setOtp(
                            e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 6)
                          )
                        }
                        autoFocus
                      />

                    </Form.Group>


                    <div className="otp-info">

                      <span>
                        Chưa nhận được mã?
                      </span>

                      <button
                        type="button"
                        onClick={handleResendOTP}
                      >

                        <RefreshCw size={13} />

                        Gửi lại mã

                      </button>

                    </div>


                    <Button
                      type="submit"
                      className="register-btn"
                    >

                      <ShieldCheck size={17} />

                      Xác nhận email

                      <ArrowRight size={17} />

                    </Button>


                    <button
                      type="button"
                      className="back-btn"
                      onClick={handleBack}
                    >

                      <ArrowLeft size={15} />

                      Quay lại chỉnh sửa thông tin

                    </button>

                  </Form>


                  <div className="otp-security">

                    <ShieldCheck size={15} />

                    <span>
                      Mã xác thực được sử dụng để
                      bảo vệ tài khoản của bạn.
                    </span>

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