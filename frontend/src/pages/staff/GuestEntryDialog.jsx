import { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import {
  UserPlus,
  Printer,
  CheckCircle2,
  CarFront,
  ArrowRight,
  ShieldCheck,
  X,
  RotateCcw,
  FileCheck,
  Building2,
  Clock,
  Calendar,
  Layers,
  CreditCard,
  QrCode,
  DollarSign,
  AlertTriangle,
  Zap,
  Check
} from 'lucide-react';
import { registerNewBooking } from '../../services/qrBookingService';
import InvoiceModal from './InvoiceModal';

const BRANCHES = [
  { id: 'BR-01', name: 'SmartPark - Aeon Mall Thanh Khê 1', address: 'Đường Nguyễn Tất Thành, P. Tam Thuận, Q. Thanh Khê, Đà Nẵng' },
  { id: 'BR-02', name: 'SmartPark - Vincom Plaza Ngô Quyền', address: '910A Ngô Quyền, P. An Hải Bắc, Q. Sơn Trà, Đà Nẵng' },
  { id: 'BR-03', name: 'SmartPark - Sân Bay Quốc Tế Đà Nẵng', address: 'Đường Duy Tân, P. Hòa Thuận Tây, Q. Hải Châu, Đà Nẵng' },
  { id: 'BR-04', name: 'SmartPark - Lotte Mart Đà Nẵng', address: '06 Nại Nam, P. Hòa Cường Bắc, Q. Hải Châu, Đà Nẵng' },
  { id: 'BR-05', name: 'SmartPark - Indochina Riverside Mall', address: '74 Bạch Đằng, P. Hải Châu 1, Q. Hải Châu, Đà Nẵng' }
];

const VEHICLE_PRICING = {
  'Ô tô 4 - 7 chỗ': {
    first2Hours: 25000,
    nextHour: 10000,
    dayRate: 150000,
    weekRate: 650000,
    monthRate: 1800000,
    defaultFloor: 'B1',
    defaultSlot: 'B1-A08'
  },
  'Ô tô SUV / Bán tải': {
    first2Hours: 30000,
    nextHour: 12000,
    dayRate: 180000,
    weekRate: 750000,
    monthRate: 2100000,
    defaultFloor: 'B1',
    defaultSlot: 'B1-A12'
  },
  'Ô tô điện EV (Có sạc)': {
    first2Hours: 25000,
    nextHour: 10000,
    dayRate: 150000,
    weekRate: 650000,
    monthRate: 1800000,
    defaultFloor: 'B2',
    defaultSlot: 'B2-EV02',
    evSurcharge: 25000
  },
  'Xe máy / Tay ga': {
    first2Hours: 5000,
    nextHour: 3000,
    dayRate: 20000,
    weekRate: 100000,
    monthRate: 300000,
    defaultFloor: 'G',
    defaultSlot: 'G-05'
  }
};

const SAMPLE_SLOTS = {
  'G': [
    { code: 'G-01', type: 'bike', status: 'available' },
    { code: 'G-02', type: 'bike', status: 'available' },
    { code: 'G-03', type: 'bike', status: 'occupied' },
    { code: 'G-04', type: 'bike', status: 'occupied' },
    { code: 'G-05', type: 'bike', status: 'available' },
    { code: 'G-06', type: 'bike', status: 'available' },
    { code: 'G-07', type: 'bike', status: 'reserved' },
    { code: 'G-08', type: 'bike', status: 'available' }
  ],
  'B1': [
    { code: 'B1-A01', type: 'car', status: 'available' },
    { code: 'B1-A02', type: 'car', status: 'occupied' },
    { code: 'B1-A03', type: 'car', status: 'available' },
    { code: 'B1-A04', type: 'car', status: 'available' },
    { code: 'B1-A05', type: 'car', status: 'occupied' },
    { code: 'B1-A06', type: 'car', status: 'available' },
    { code: 'B1-A07', type: 'car', status: 'reserved' },
    { code: 'B1-A08', type: 'car', status: 'available' },
    { code: 'B1-A09', type: 'car', status: 'available' },
    { code: 'B1-A10', type: 'car', status: 'occupied' },
    { code: 'B1-A11', type: 'car', status: 'available' },
    { code: 'B1-A12', type: 'car', status: 'available' }
  ],
  'B2': [
    { code: 'B2-B01', type: 'car', status: 'available' },
    { code: 'B2-B02', type: 'car', status: 'occupied' },
    { code: 'B2-B03', type: 'car', status: 'available' },
    { code: 'B2-EV01', type: 'ev', status: 'available' },
    { code: 'B2-EV02', type: 'ev', status: 'available' },
    { code: 'B2-EV03', type: 'ev', status: 'occupied' },
    { code: 'B2-B07', type: 'car', status: 'available' },
    { code: 'B2-B08', type: 'car', status: 'reserved' }
  ],
  'B3': [
    { code: 'B3-V01', type: 'vip', status: 'available' },
    { code: 'B3-V02', type: 'vip', status: 'occupied' },
    { code: 'B3-V03', type: 'vip', status: 'available' },
    { code: 'B3-V04', type: 'vip', status: 'available' },
    { code: 'B3-V05', type: 'vip', status: 'reserved' },
    { code: 'B3-V06', type: 'vip', status: 'available' }
  ]
};

export default function GuestEntryDialog({ onRegisterSuccess, onClose }) {
  const [step, setStep] = useState(1); // 1: Cấu hình vé & Thông tin | 2: Thanh toán & Xuất vé | 3: Xem vé & In
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0].name);
  const [plate, setPlate] = useState('');
  const [customerName, setCustomerName] = useState('Khách Vãng Lai');
  const [vehicleType, setVehicleType] = useState('Ô tô 4 - 7 chỗ');
  const [packageType, setPackageType] = useState('hourly'); // 'hourly' | 'daily' | 'weekly' | 'monthly'

  // Thời gian vào & ra
  const now = new Date();
  const formatTimeStr = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const [startTime, setStartTime] = useState(formatTimeStr(now));
  const [endTime, setEndTime] = useState(() => {
    const d = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return formatTimeStr(d);
  });
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Vị trí ô đỗ
  const [assignedFloor, setAssignedFloor] = useState('B1');
  const [assignedSlot, setAssignedSlot] = useState('B1-A08');
  const [note, setNote] = useState('');

  // Phương thức thanh toán
  const [paymentMethod, setPaymentMethod] = useState('vietqr'); // 'vietqr' | 'cash' | 'pos'
  const [vietqrConfirmed, setVietqrConfirmed] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(900); // 15 phút

  // Kết quả vé & Xuất Hóa đơn điện tử VAT
  const [createdTicket, setCreatedTicket] = useState(null);
  const [showVatInvoice, setShowVatInvoice] = useState(false);
  const [autoShowVat, setAutoShowVat] = useState(true);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [taxCompany, setTaxCompany] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxEmail, setTaxEmail] = useState('');

  const ticketPrintRef = useRef(null);

  // Đếm ngược QR
  useEffect(() => {
    if (step === 2 && paymentMethod === 'vietqr' && qrCountdown > 0) {
      const timer = setInterval(() => setQrCountdown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, paymentMethod, qrCountdown]);

  // Đổi loại phương tiện
  const handleVehicleTypeChange = (type) => {
    setVehicleType(type);
    const config = VEHICLE_PRICING[type] || VEHICLE_PRICING['Ô tô 4 - 7 chỗ'];
    setAssignedFloor(config.defaultFloor);
    setAssignedSlot(config.defaultSlot);
  };

  // Tính cước thực tế
  const feeCalculation = useMemo(() => {
    const config = VEHICLE_PRICING[vehicleType] || VEHICLE_PRICING['Ô tô 4 - 7 chỗ'];

    if (packageType === 'daily') {
      return { total: config.dayRate, label: 'Vé ngày (24 giờ)', duration: '24 giờ' };
    }
    if (packageType === 'weekly') {
      return { total: config.weekRate, label: 'Thẻ tuần (7 ngày)', duration: '7 ngày' };
    }
    if (packageType === 'monthly') {
      return { total: config.monthRate, label: 'Thẻ tháng (30 ngày)', duration: '30 ngày' };
    }

    // Tính theo giờ tự chọn
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes <= 0) diffMinutes += 24 * 60;

    const diffHours = diffMinutes / 60;
    const hours = Math.floor(diffHours);
    const mins = Math.round((diffHours - hours) * 60);
    const durationLabel = hours > 0 ? `${hours} giờ${mins > 0 ? ` ${mins} phút` : ''}` : `${mins} phút`;

    let fee = config.first2Hours;
    if (diffHours > 2) {
      const extraHours = Math.ceil(diffHours - 2);
      fee += extraHours * config.nextHour;
    }
    if (config.evSurcharge) {
      fee += config.evSurcharge;
    }

    return { total: fee, label: `Theo giờ (${durationLabel})`, duration: durationLabel };
  }, [vehicleType, packageType, startTime, endTime]);

  // Sang bước xác nhận thanh toán
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!plate.trim()) {
      alert('Vui lòng nhập biển số xe khách vãng lai.');
      return;
    }
    setStep(2);
  };

  // Hoàn tất cấp vé
  const handleConfirmAndIssueTicket = () => {
    const cleanPlate = plate.trim().toUpperCase();
    const randomTicketNum = Math.floor(100000 + Math.random() * 900000);
    const pinCode = Math.floor(1000 + Math.random() * 9000);
    const curDate = new Date();
    const expiryDate = new Date(curDate.getTime() + 20 * 24 * 60 * 60 * 1000);

    const payLabel = paymentMethod === 'vietqr'
      ? 'VietQR Napas 247 MBBank'
      : paymentMethod === 'pos'
      ? 'Thẻ POS Ngân hàng'
      : 'Tiền mặt thu tại quầy';

    // Đăng ký vé vào bộ nhớ QR & local storage
    const registered = registerNewBooking({
      plate: cleanPlate,
      model: vehicleType,
      customer: customerName.trim() || 'Khách vãng lai',
      phone: 'Tại bốt kiểm soát cổng',
      branch: selectedBranch,
      slot: `Tầng ${assignedFloor} · Ô ${assignedSlot}`,
      duration: `${feeCalculation.label} · Hạn vé 20 ngày`,
      startTime: `${startDate} ${startTime}`,
      date: startDate,
      totalCost: feeCalculation.total,
      paymentMethod: payLabel
    });

    const guestTicket = {
      id: `SP-VL-${randomTicketNum}`,
      code: registered.code,
      pin: pinCode,
      plate: cleanPlate,
      customer: customerName.trim() || 'Khách vãng lai',
      vehicleType,
      branch: selectedBranch,
      address: BRANCHES.find(b => b.name === selectedBranch)?.address || 'Đà Nẵng',
      slot: `Tầng ${assignedFloor} · Ô ${assignedSlot}`,
      floor: assignedFloor,
      rawSlot: assignedSlot,
      packageType,
      timeIn: startTime,
      timeOut: endTime,
      dateIn: startDate,
      expiryDate: expiryDate.toLocaleDateString('vi-VN'),
      validityDays: 20,
      fee: `${feeCalculation.total.toLocaleString('vi-VN')}đ`,
      totalCost: feeCalculation.total,
      gateIn: 'Cổng Vào 01 (Làn Kiểm Soát Nhân Viên)',
      status: 'Đã thanh toán · Hiệu lực đỗ',
      method: payLabel,
      note: note.trim(),
      ticketType: 'Vé lượt khách vãng lai'
    };

    setCreatedTicket(guestTicket);
    setStep(3);

    // Kích hoạt xuất hóa đơn VAT điện tử ngay lập tức khi thanh toán xong
    if (autoShowVat) {
      setShowVatInvoice(true);
    }

    if (onRegisterSuccess) {
      onRegisterSuccess(guestTicket);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Tạo URL Napas 247 VietQR MBBank động
  const vietQrUrl = useMemo(() => {
    const bank = 'MB';
    const acc = '0905123456';
    const amount = feeCalculation.total;
    const memo = `SPVL ${plate.replace(/[^a-zA-Z0-9]/g, '')}`.toUpperCase().slice(0, 20);
    return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=SMARTPARK%20DA%20NANG`;
  }, [feeCalculation.total, plate]);

  return (
    <>
      <div className="sp-modal-backdrop" onClick={onClose}>
        <div
          className="sp-guest-modal"
          style={{ maxWidth: step === 3 ? '580px' : '720px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sp-guest-head" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.85rem' }}>
            <div className="sp-gh-title">
              <div className="sp-gh-icon" style={{ background: '#0284c7', color: '#fff', borderRadius: '8px', padding: '6px' }}>
                <UserPlus size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                  {step === 1 && 'TIẾP NHẬN XE VÃNG LAI · CHỌN Ô & TÍNH CƯỚC THỰC'}
                  {step === 2 && 'THANH TOÁN CƯỚC VÉ VÃNG LAI · VIETQR PAY'}
                  {step === 3 && 'PHIẾU VÉ ĐIỆN TỬ SMARTPARK PASS · XUẤT HÓA ĐƠN'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                  {selectedBranch} · Hệ Thống Quản Lý Trạm Đỗ Đà Nẵng
                </p>
              </div>
            </div>
            <button type="button" className="sp-btn-close-modal" onClick={onClose} aria-label="Đóng" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* CẢNH BÁO QUAN TRỌNG: VÉ VÃNG LAI KHÔNG ÁP DỤNG VOUCHER */}
          <div style={{
            background: 'rgba(234, 88, 12, 0.08)',
            border: '1px solid rgba(234, 88, 12, 0.3)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            margin: '0.85rem 1rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: '#fdba74'
          }}>
            <AlertTriangle size={16} color="#f97316" style={{ flexShrink: 0 }} />
            <span>
              <strong>Lưu ý nghiệp vụ:</strong> Vé khách vãng lai thu cước trực tiếp tại bốt. <strong>Tuyệt đối không áp dụng voucher khuyến mãi</strong> (voucher chỉ áp dụng cho thành viên đặt trước trên app).
            </span>
          </div>

          {/* ========================================================
              BƯỚC 1: CẤU HÌNH THÔNG TIN XE, GIỜ ĐỖ & Ô ĐỖ TRỰC QUAN
          ======================================================== */}
          {step === 1 && (
            <form onSubmit={handleProceedToPayment} style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                
                {/* Cột 1: Thông tin cơ bản */}
                <div>
                  {/* Chi nhánh */}
                  <div className="sp-form-field" style={{ marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={13} color="#38bdf8" /> CHI NHÁNH BÃI ĐỖ XE
                    </label>
                    <select
                      className="sp-select"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                    >
                      {BRANCHES.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Biển số xe */}
                  <div className="sp-form-field" style={{ marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1' }}>
                      BIỂN SỐ XE KHÁCH <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #0284c7', borderRadius: '7px', background: '#0f172a', overflow: 'hidden' }}>
                      <div style={{ background: '#0284c7', color: '#fff', padding: '0.45rem 0.65rem', fontWeight: 900, fontSize: '0.78rem' }}>
                        VN
                      </div>
                      <input
                        type="text"
                        placeholder="VD: 43A-889.92, 43B-123.45..."
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        required
                        autoFocus
                        style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', color: '#f8fafc', fontWeight: 800, fontSize: '0.92rem', letterSpacing: '0.05em' }}
                      />
                    </div>
                  </div>

                  {/* Tên khách & Loại xe */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <div className="sp-form-field">
                      <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1' }}>TÊN KHÁCH (NẾU CÓ)</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Khách vãng lai"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div className="sp-form-field">
                      <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1' }}>LOẠI XE</label>
                      <select
                        className="sp-select"
                        value={vehicleType}
                        onChange={(e) => handleVehicleTypeChange(e.target.value)}
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.78rem' }}
                      >
                        <option value="Ô tô 4 - 7 chỗ">🚗 Ô tô 4 - 7 chỗ</option>
                        <option value="Ô tô SUV / Bán tải">🚙 Ô tô SUV / Bán tải</option>
                        <option value="Ô tô điện EV (Có sạc)">⚡ EV (Có sạc 120kW)</option>
                        <option value="Xe máy / Tay ga">🛵 Xe máy / Tay ga</option>
                      </select>
                    </div>
                  </div>

                  {/* Gói thời lượng */}
                  <div className="sp-form-field" style={{ marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} color="#38bdf8" /> GÓI THỜI LƯỢNG ĐỖ
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      {[
                        { id: 'hourly', label: 'Theo giờ linh hoạt', badge: 'Tự chỉnh' },
                        { id: 'daily', label: 'Vé ngày 24h', badge: 'Tiết kiệm' },
                        { id: 'weekly', label: 'Thẻ tuần (7 ngày)', badge: 'Gói tuần' },
                        { id: 'monthly', label: 'Thẻ tháng (30 ngày)', badge: 'Gói tháng' }
                      ].map(pkg => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setPackageType(pkg.id)}
                          style={{
                            padding: '0.45rem 0.5rem',
                            borderRadius: '6px',
                            border: packageType === pkg.id ? '2px solid #0284c7' : '1px solid #334155',
                            background: packageType === pkg.id ? 'rgba(2, 132, 199, 0.2)' : '#0f172a',
                            color: packageType === pkg.id ? '#38bdf8' : '#cbd5e1',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{pkg.label}</span>
                          <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: '4px' }}>{pkg.badge}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Giờ vào & Giờ ra (nếu chọn theo giờ) */}
                  {packageType === 'hourly' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.65rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Giờ vào thực tế</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Giờ ra dự kiến (tự chỉnh)</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ghi chú */}
                  <div className="sp-form-field">
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Ghi chú tình trạng xe lúc vào bốt</label>
                    <input
                      type="text"
                      placeholder="VD: Xe có trầy nhẹ cản sau, có vali để lại..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '0.76rem' }}
                    />
                  </div>
                </div>

                {/* Cột 2: Sơ đồ chọn ô đỗ xe trực quan */}
                <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Layers size={14} color="#38bdf8" /> SƠ ĐỒ Ô ĐỖ TƯƠNG TÁC
                    </label>
                    {/* Tầng */}
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {['G', 'B1', 'B2', 'B3'].map(fl => (
                        <button
                          key={fl}
                          type="button"
                          onClick={() => {
                            setAssignedFloor(fl);
                            const firstAvail = SAMPLE_SLOTS[fl]?.find(s => s.status === 'available');
                            if (firstAvail) setAssignedSlot(firstAvail.code);
                          }}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            border: assignedFloor === fl ? '1px solid #0284c7' : '1px solid #334155',
                            background: assignedFloor === fl ? '#0284c7' : 'transparent',
                            color: assignedFloor === fl ? '#fff' : '#94a3b8',
                            cursor: 'pointer'
                          }}
                        >
                          {fl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chú thích màu ô */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.64rem', color: '#94a3b8', marginBottom: '0.65rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }}></span> Trống
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }}></span> Đang đỗ
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#eab308' }}></span> Đã đặt
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#0284c7' }}></span> Đang chọn
                    </span>
                  </div>

                  {/* Grid ô đỗ xe */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.45rem',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    padding: '2px'
                  }}>
                    {(SAMPLE_SLOTS[assignedFloor] || []).map(slot => {
                      const isSelected = assignedSlot === slot.code;
                      const isOccupied = slot.status === 'occupied';
                      const isReserved = slot.status === 'reserved';

                      let bg = 'rgba(16, 185, 129, 0.12)';
                      let borderColor = '#10b981';
                      let textColor = '#34d399';

                      if (isSelected) {
                        bg = '#0284c7';
                        borderColor = '#38bdf8';
                        textColor = '#ffffff';
                      } else if (isOccupied) {
                        bg = 'rgba(239, 68, 68, 0.12)';
                        borderColor = '#ef4444';
                        textColor = '#f87171';
                      } else if (isReserved) {
                        bg = 'rgba(234, 179, 8, 0.12)';
                        borderColor = '#eab308';
                        textColor = '#facc15';
                      }

                      return (
                        <button
                          key={slot.code}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setAssignedSlot(slot.code)}
                          style={{
                            padding: '0.45rem 0.2rem',
                            borderRadius: '6px',
                            border: `1.5px solid ${borderColor}`,
                            background: bg,
                            color: textColor,
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: isOccupied ? 'not-allowed' : 'pointer',
                            opacity: isOccupied ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <span>{slot.code}</span>
                          <span style={{ fontSize: '0.58rem', fontWeight: 600 }}>
                            {isSelected ? 'ĐÃ CHỌN' : isOccupied ? 'CÓ XE' : isReserved ? 'ĐÃ ĐẶT' : 'TRỐNG'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Hộp tóm tắt cước */}
                  <div style={{
                    marginTop: '0.85rem',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(2, 132, 199, 0.1)',
                    border: '1px solid rgba(2, 132, 199, 0.3)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Vị trí chỉ định:</span>
                      <strong style={{ fontSize: '0.78rem', color: '#38bdf8' }}>Tầng {assignedFloor} · Ô {assignedSlot}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Thời lượng đỗ:</span>
                      <span style={{ fontSize: '0.76rem', color: '#f8fafc' }}>{feeCalculation.duration}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #334155', paddingTop: '6px', marginTop: '4px' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#f8fafc' }}>TỔNG CƯỚC THU:</strong>
                      <strong style={{ fontSize: '1.05rem', color: '#10b981', fontWeight: 900 }}>
                        {feeCalculation.total.toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '7px', background: '#334155', border: 'none', color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '7px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
                  }}
                >
                  <span>Tiếp Tục Thanh Toán ({feeCalculation.total.toLocaleString('vi-VN')}đ)</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              BƯỚC 2: PHƯƠNG THỨC THANH TOÁN (VIETQR / CASH / POS)
          ======================================================== */}
          {step === 2 && (
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                
                {/* Chọn phương thức */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.75rem' }}>
                    1. CHỌN HÌNH THỨC THANH TOÁN
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {[
                      { id: 'vietqr', label: 'Quét Mã VietQR Napas 247 (MBBank)', desc: 'Mã QR động chính xác số tiền, nhận diện tự động', icon: QrCode, badge: 'Khuyên Dùng' },
                      { id: 'cash', label: 'Thu Tiền Mặt Trực Tiếp Tại Quầy', desc: 'Nhân viên thu tiền mặt và thối lại cho khách', icon: DollarSign },
                      { id: 'pos', label: 'Quẹt Thẻ Ngân Hàng / POS Contactless', desc: 'Thẻ ATM nội địa, Visa, Mastercard qua máy POS', icon: CreditCard }
                    ].map(method => (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        style={{
                          padding: '0.75rem 0.85rem',
                          borderRadius: '8px',
                          border: paymentMethod === method.id ? '2px solid #0284c7' : '1px solid #334155',
                          background: paymentMethod === method.id ? 'rgba(2, 132, 199, 0.15)' : '#0f172a',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <div style={{
                          background: paymentMethod === method.id ? '#0284c7' : '#1e293b',
                          color: '#fff',
                          padding: '8px',
                          borderRadius: '6px'
                        }}>
                          <method.icon size={18} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '0.8rem', color: paymentMethod === method.id ? '#38bdf8' : '#f8fafc' }}>
                              {method.label}
                            </strong>
                            {method.badge && (
                              <span style={{ fontSize: '0.62rem', background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                {method.badge}
                              </span>
                            )}
                          </div>
                          <small style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{method.desc}</small>
                        </div>
                        {paymentMethod === method.id && <Check size={18} color="#38bdf8" />}
                      </div>
                    ))}
                  </div>

                  {/* Thông tin vé tóm tắt */}
                  <div style={{
                    marginTop: '1rem',
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '0.75rem 0.85rem',
                    fontSize: '0.75rem',
                    color: '#cbd5e1'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>Biển số xe:</span>
                      <strong style={{ color: '#fff' }}>{plate}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>Vị trí ô đỗ:</span>
                      <strong style={{ color: '#38bdf8' }}>Tầng {assignedFloor} · {assignedSlot}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span>Gói cước:</span>
                      <span>{feeCalculation.label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #334155', paddingTop: '5px', marginTop: '5px' }}>
                      <strong style={{ color: '#fff' }}>SỐ TIỀN THANH TOÁN:</strong>
                      <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>{feeCalculation.total.toLocaleString('vi-VN')}đ</strong>
                    </div>
                  </div>
                </div>

                {/* Khung hiển thị thanh toán theo lựa chọn */}
                <div style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center'
                }}>
                  {paymentMethod === 'vietqr' ? (
                    <>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem' }}>
                        QUÉT MÃ NAPAS 247 MBBANK ĐỂ THANH TOÁN
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.65rem' }}>
                        Hiệu lực mã QR: <strong style={{ color: '#f59e0b' }}>{formatCountdown(qrCountdown)}</strong>
                      </div>

                      {/* Ảnh VietQR thực */}
                      <div style={{
                        background: '#ffffff',
                        padding: '8px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        marginBottom: '0.75rem'
                      }}>
                        <img
                          src={vietQrUrl}
                          alt="VietQR MBBank"
                          style={{ width: '185px', height: 'auto', display: 'block', borderRadius: '4px' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                        Ngân hàng: <strong>MBBank Đà Nẵng</strong><br />
                        Số tiền: <strong style={{ color: '#10b981' }}>{feeCalculation.total.toLocaleString('vi-VN')}đ</strong><br />
                        Nội dung: <strong>SPVL {plate.replace(/[^a-zA-Z0-9]/g, '')}</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => setVietqrConfirmed(true)}
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '6px',
                          background: vietqrConfirmed ? '#10b981' : '#1e293b',
                          border: vietqrConfirmed ? '1px solid #10b981' : '1px solid #334155',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <CheckCircle2 size={14} color={vietqrConfirmed ? '#fff' : '#10b981'} />
                        <span>{vietqrConfirmed ? 'Đã Nhận Tiền Ngân Hàng' : 'Mô Phỏng Đã Nhận Chuyển Khoản'}</span>
                      </button>
                    </>
                  ) : paymentMethod === 'cash' ? (
                    <div style={{ padding: '1rem 0' }}>
                      <DollarSign size={48} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem' }}>
                        THU TIỀN MẶT TẠI BỐT
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
                        Nhân viên trực tiếp nhận: <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>{feeCalculation.total.toLocaleString('vi-VN')}đ</strong> từ tài xế.
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Sau khi bấm Xác nhận, hệ thống sẽ in biên nhận & mở barrier.
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem 0' }}>
                      <CreditCard size={48} color="#38bdf8" style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem' }}>
                        QUẸT THẺ MÁY POS
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem' }}>
                        Yêu cầu khách chạm thẻ vào máy POS số tiền: <strong style={{ color: '#38bdf8', fontSize: '1.05rem' }}>{feeCalculation.total.toLocaleString('vi-VN')}đ</strong>.
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Hỗ trợ Visa, Master, Napas Contactless không cần mật khẩu dưới 1 triệu.
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* TÙY CHỌN XUẤT HÓA ĐƠN ĐIỆN TỬ GTGT (VAT) NGHỊ ĐỊNH 123 */}
              <div style={{
                background: 'rgba(2, 132, 199, 0.08)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 0.9rem',
                marginTop: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                    <input
                      type="checkbox"
                      checked={autoShowVat}
                      onChange={(e) => setAutoShowVat(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    <span>⚡ Tự động xuất hóa đơn GTGT (VAT) ngay sau khi thu tiền</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowTaxForm(!showTaxForm)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {showTaxForm ? 'Ẩn thông tin công ty ▲' : '+ Thông tin DN / Công ty (tùy chọn) ▼'}
                  </button>
                </div>

                {showTaxForm && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.65rem', borderTop: '1px dashed #334155', paddingTop: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#cbd5e1', display: 'block', marginBottom: '2px' }}>Tên đơn vị / Doanh nghiệp:</label>
                      <input
                        type="text"
                        placeholder="VD: Cty Cổ Phần SmartPark VN..."
                        value={taxCompany}
                        onChange={(e) => setTaxCompany(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '5px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#cbd5e1', display: 'block', marginBottom: '2px' }}>Mã số thuế bên mua (MST):</label>
                      <input
                        type="text"
                        placeholder="VD: 0401889248..."
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '5px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: '#cbd5e1', display: 'block', marginBottom: '2px' }}>Email nhận HĐĐT Cục Thuế:</label>
                      <input
                        type="email"
                        placeholder="VD: ketoan@congty.com..."
                        value={taxEmail}
                        onChange={(e) => setTaxEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '5px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '0.75rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Foot actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid #1e293b', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '7px', background: '#334155', border: 'none', color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Quay Lại Sửa Thông Tin
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndIssueTicket}
                  style={{
                    padding: '0.55rem 1.4rem',
                    borderRadius: '7px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Xác Nhận Đã Thu Tiền &amp; Xuất Vé SmartPark</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              BƯỚC 3: PHIẾU VÉ ĐIỆN TỬ SMARTPARK PASS & HÓA ĐƠN VAT
          ======================================================== */}
          {step === 3 && createdTicket && (
            <div style={{ padding: '1rem' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: '#6ee7b7',
                marginBottom: '0.75rem'
              }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span>
                  <strong>Cấp vé thành công!</strong> Barrier Cổng Vào 01 đã mở tự động. Đã lưu lịch sử vào hệ thống kiểm soát.
                </span>
              </div>

              {/* CARD XUẤT HÓA ĐƠN ĐIỆN TỬ VAT TỨC THÌ */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(14, 165, 233, 0.08) 100%)',
                border: '1.5px solid #0284c7',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#0284c7', color: '#fff', borderRadius: '8px', padding: '6px', display: 'grid', placeItems: 'center' }}>
                    <FileCheck size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc' }}>
                      🧾 HÓA ĐƠN ĐIỆN TỬ GTGT (VAT) ĐÃ SẴN SÀNG
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Chuẩn Nghị định 123/2020/NĐ-CP · Thuế GTGT 8% · Cục Thuế TP. Đà Nẵng
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVatInvoice(true)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '7px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  <Printer size={15} /> XUẤT HÓA ĐƠN VAT NGAY
                </button>
              </div>

              {/* Khung vé in nhiệt chuẩn 1 trang */}
              <div
                ref={ticketPrintRef}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  border: '1.5px solid #0284c7',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  marginBottom: '1rem'
                }}
              >
                {/* Header vé */}
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 900, color: '#0284c7', fontSize: '1.15rem' }}>
                    <CarFront size={22} /> SMARTPARK PASS
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                    HỆ THỐNG QUẢN LÝ BÃI XE THÔNG MINH ĐÀ NẴNG
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {createdTicket.branch}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                    {createdTicket.address}
                  </div>
                </div>

                {/* Biển số to rõ */}
                <div style={{
                  background: '#0f172a',
                  color: '#f8fafc',
                  textAlign: 'center',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.05em' }}>
                    BIỂN SỐ XE KHÁCH VÃNG LAI
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '0.08em', color: '#ffffff' }}>
                    {createdTicket.plate}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
                    {createdTicket.vehicleType}
                  </div>
                </div>

                {/* Mã QR code xác thực */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#fff', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <QRCodeSVG value={createdTicket.code} size={135} level="M" />
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0284c7', letterSpacing: '0.08em', marginTop: '4px' }}>
                    {createdTicket.code}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    Mã PIN dự phòng: <strong>{createdTicket.pin}</strong>
                  </div>
                </div>

                {/* Chi tiết thông tin vé */}
                <div style={{ fontSize: '0.74rem', borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '0.65rem 0', lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Vị trí ô đỗ:</span>
                    <strong style={{ color: '#0284c7' }}>{createdTicket.slot}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Thời gian vào:</span>
                    <strong>{createdTicket.dateIn} {createdTicket.timeIn}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Gói thời lượng:</span>
                    <span>{feeCalculation.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Hạn hiệu lực vé:</span>
                    <strong style={{ color: '#10b981' }}>{createdTicket.expiryDate} (20 ngày)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Hình thức thanh toán:</span>
                    <span>{createdTicket.method}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                    <strong style={{ fontSize: '0.82rem' }}>CƯỚC ĐÃ THU:</strong>
                    <strong style={{ fontSize: '1rem', color: '#059669' }}>{createdTicket.fee}</strong>
                  </div>
                </div>

                {/* Footer phiếu vé */}
                <div style={{ textAlign: 'center', marginTop: '0.65rem', fontSize: '0.65rem', color: '#64748b' }}>
                  Quý khách vui lòng giữ vé này để quét mở barrier khi rời bãi.<br />
                  Hotline hỗ trợ kỹ thuật 24/7: <strong>1900 888 888</strong>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handlePrintTicket}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '7px',
                    background: '#0284c7',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={15} /> In Phiếu Vé Cho Khách
                </button>

                <button
                  type="button"
                  onClick={() => setShowVatInvoice(true)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '7px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
                  }}
                >
                  <FileCheck size={15} /> Xuất Hóa Đơn Điện Tử VAT
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '7px',
                    background: '#10b981',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Hoàn Tất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL HÓA ĐƠN VAT NGHỊ ĐỊNH 123 / THÔNG TƯ 78 */}
      {showVatInvoice && createdTicket && (
        <InvoiceModal
          isOpen={showVatInvoice}
          onClose={() => setShowVatInvoice(false)}
          invoice={{
            id: `HD-${createdTicket.id}`,
            invoiceNo: `00${createdTicket.pin}`,
            plate: createdTicket.plate,
            customerName: createdTicket.customer,
            customer: createdTicket.customer,
            company: taxCompany.trim() || undefined,
            taxCode: taxId.trim() || undefined,
            taxEmail: taxEmail.trim() || undefined,
            phone: 'Tại bốt kiểm soát',
            slot: createdTicket.slot,
            vehicleType: createdTicket.vehicleType,
            checkIn: `${createdTicket.dateIn} ${createdTicket.timeIn}`,
            checkOut: `${createdTicket.dateIn} ${createdTicket.timeOut || createdTicket.timeIn}`,
            time: `${createdTicket.dateIn} ${createdTicket.timeIn}`,
            duration: feeCalculation.label,
            preTax: Math.round(feeCalculation.total / 1.08),
            vat: feeCalculation.total - Math.round(feeCalculation.total / 1.08),
            total: feeCalculation.total,
            paymentMethod: createdTicket.method,
            method: createdTicket.method,
            status: 'Đã phát hành điện tử',
            cqtCode: '00E9F241-8A7B-4F12-BC35-64903332A1F8'
          }}
        />
      )}
    </>
  );
}

GuestEntryDialog.propTypes = {
  onRegisterSuccess: PropTypes.func,
  onClose: PropTypes.func.isRequired
};
