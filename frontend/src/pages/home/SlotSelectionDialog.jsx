import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import {
  X,
  CarFront,
  Clock,
  Plus,
  CheckCircle2,
  MapPin,
  CreditCard,
  ShieldCheck,
  Tag,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  QrCode,
  Copy,
  AlertCircle,
  RefreshCw,
  Ticket,
  Sparkles,
  Lock,
  Crown,
  Award
} from 'lucide-react';
import { getTranslation } from '../../utils/i18n';
import { lookupVoucherCode, addVoucherToWallet, markVoucherAsUsed, normalizeVoucher } from '../../services/voucherService';

const BRANCH_FLOORS = {
  'Aeon Mall': {
    G: { name: 'Tầng G · Xe Máy & Ô Tô', type: 'Mixed', spots: [
      { id: 'G-01', status: 'occupied', distance: '5m tới cổng vào', type: 'bike' },
      { id: 'G-02', status: 'available', distance: '8m tới cổng vào', type: 'bike' },
      { id: 'G-03', status: 'available', distance: '10m' },
      { id: 'G-04', status: 'occupied', distance: '12m' },
      { id: 'G-05', status: 'available', distance: '15m tới thang máy' },
      { id: 'G-06', status: 'reserved', distance: '18m tới thang máy' },
      { id: 'G-07', status: 'available', distance: '20m' },
      { id: 'G-08', status: 'available', distance: '22m' },
    ]},
    B1: { name: 'Tầng B1 · Khu Tiêu Chuẩn', type: 'Standard', spots: [
      { id: 'A-01', status: 'occupied', distance: '15m tới Thang máy A' },
      { id: 'A-02', status: 'available', distance: '18m tới Thang máy A' },
      { id: 'A-03', status: 'reserved', distance: '22m tới Cổng ra' },
      { id: 'A-04', status: 'occupied', distance: '25m tới Cổng ra' },
      { id: 'A-05', status: 'available', distance: '30m' },
      { id: 'A-06', status: 'available', distance: '35m' },
      { id: 'A-07', status: 'occupied', distance: '12m tới Thang máy B' },
      { id: 'A-08', status: 'available', distance: '15m tới Thang máy B' },
      { id: 'A-09', status: 'occupied', distance: '20m' },
      { id: 'A-10', status: 'available', distance: '24m' },
      { id: 'A-11', status: 'available', distance: '28m' },
      { id: 'A-12', status: 'reserved', distance: '32m' },
    ]},
    B2: { name: 'Tầng B2 · Tiêu Chuẩn & EV Charging', type: 'Standard Plus', spots: [
      { id: 'B-01', status: 'occupied', distance: '10m tới Thang máy B' },
      { id: 'B-02', status: 'available', distance: '12m tới Thang máy B' },
      { id: 'B-03', status: 'occupied', distance: '15m' },
      { id: 'B-04', status: 'available', distance: '18m' },
      { id: 'B-05', status: 'reserved', distance: '22m' },
      { id: 'B-06', status: 'available', distance: '25m' },
      { id: 'B-07', status: 'occupied', distance: '8m tới Thang cuốn' },
      { id: 'B-08', status: 'available', distance: '12m · Trạm sạc EV', isEv: true },
      { id: 'B-09', status: 'available', distance: '14m · Trạm sạc EV', isEv: true },
      { id: 'B-10', status: 'occupied', distance: '18m' },
      { id: 'B-11', status: 'available', distance: '20m' },
      { id: 'B-12', status: 'available', distance: '26m' },
    ]},
    B3: { name: 'Tầng B3 · Khu VIP Dài Hạn', type: 'VIP', spots: [
      { id: 'V-01', status: 'reserved', isVip: true, distance: 'Sát sảnh VIP Tower' },
      { id: 'V-02', status: 'available', isVip: true, distance: 'Sát sảnh VIP Tower' },
      { id: 'V-03', status: 'occupied', isVip: true, distance: 'Bảo vệ riêng' },
      { id: 'V-04', status: 'available', isVip: true, distance: 'Bảo vệ riêng' },
      { id: 'V-05', status: 'occupied', isVip: true, distance: '10m VIP Lift' },
      { id: 'V-06', status: 'available', isVip: true, distance: '15m VIP Lift' },
      { id: 'V-07', status: 'available', isVip: true, distance: '20m' },
      { id: 'V-08', status: 'occupied', isVip: true, distance: '22m' },
    ]}
  },
  'Vincom': {
    B1: { name: 'Tầng B1 · Khu A Tiêu Chuẩn', type: 'Standard', spots: [
      { id: 'A-01', status: 'occupied', distance: '8m tới thang máy' },
      { id: 'A-02', status: 'available', distance: '10m' },
      { id: 'A-03', status: 'available', distance: '12m' },
      { id: 'A-04', status: 'occupied', distance: '15m' },
      { id: 'A-05', status: 'reserved', distance: '18m' },
      { id: 'A-06', status: 'available', distance: '20m' },
      { id: 'A-07', status: 'available', distance: '22m' },
      { id: 'A-08', status: 'occupied', distance: '25m' },
      { id: 'A-09', status: 'available', distance: '28m' },
      { id: 'A-10', status: 'available', distance: '30m' },
    ]},
    B2: { name: 'Tầng B2 · Khu B + EV', type: 'Standard Plus', spots: [
      { id: 'B-01', status: 'available', distance: '6m tới thang máy B' },
      { id: 'B-02', status: 'occupied', distance: '8m' },
      { id: 'B-03', status: 'available', distance: '10m' },
      { id: 'B-04', status: 'reserved', distance: '12m' },
      { id: 'B-05', status: 'available', distance: '15m · Trạm sạc EV', isEv: true },
      { id: 'B-06', status: 'available', distance: '18m · Trạm sạc EV', isEv: true },
      { id: 'B-07', status: 'occupied', distance: '20m' },
      { id: 'B-08', status: 'available', distance: '22m' },
      { id: 'B-09', status: 'occupied', distance: '24m' },
      { id: 'B-10', status: 'available', distance: '26m' },
    ]}
  },
  'Sân Bay': {
    G: { name: 'Tầng G · Khu Đỗ Mặt Đất', type: 'Ground Level', spots: [
      { id: 'G-01', status: 'occupied', distance: '5m cổng vào T1' },
      { id: 'G-02', status: 'available', distance: '8m cổng vào T1' },
      { id: 'G-03', status: 'available', distance: '12m' },
      { id: 'G-04', status: 'occupied', distance: '15m' },
      { id: 'G-05', status: 'reserved', distance: '18m' },
      { id: 'G-06', status: 'available', distance: '22m' },
      { id: 'G-07', status: 'available', distance: '25m' },
      { id: 'G-08', status: 'occupied', distance: '28m' },
      { id: 'G-09', status: 'available', distance: '30m' },
      { id: 'G-10', status: 'available', distance: '35m' },
    ]},
    T1: { name: 'Tầng T1 · Sân Đỗ Nội Địa', type: 'Domestic Terminal', spots: [
      { id: 'T-01', status: 'occupied', distance: 'Sát nhà ga nội địa' },
      { id: 'T-02', status: 'available', distance: '10m nhà ga nội địa' },
      { id: 'T-03', status: 'available', distance: '15m' },
      { id: 'T-04', status: 'occupied', distance: '18m' },
      { id: 'T-05', status: 'available', distance: '20m · EV Charging', isEv: true },
      { id: 'T-06', status: 'available', distance: '22m' },
      { id: 'T-07', status: 'reserved', distance: '25m' },
      { id: 'T-08', status: 'occupied', distance: '28m' },
      { id: 'T-09', status: 'available', distance: '30m' },
      { id: 'T-10', status: 'available', distance: '35m' },
    ]},
    T2: { name: 'Tầng T2 · Sân Đỗ Quốc Tế', type: 'International Terminal', spots: [
      { id: 'P-01', status: 'available', distance: 'Sát cổng quốc tế' },
      { id: 'P-02', status: 'occupied', distance: '8m cổng quốc tế' },
      { id: 'P-03', status: 'available', distance: '12m' },
      { id: 'P-04', status: 'available', distance: '15m' },
      { id: 'P-05', status: 'occupied', distance: '18m' },
      { id: 'P-06', status: 'reserved', distance: '20m' },
      { id: 'P-07', status: 'available', distance: '25m' },
      { id: 'P-08', status: 'available', distance: '28m' },
    ]}
  },
  'Lotte': {
    G: { name: 'Tầng G · Bãi Mặt Đất', type: 'Ground', spots: [
      { id: 'G-01', status: 'occupied', distance: '5m cổng vào' },
      { id: 'G-02', status: 'available', distance: '8m' },
      { id: 'G-03', status: 'available', distance: '10m' },
      { id: 'G-04', status: 'occupied', distance: '12m' },
      { id: 'G-05', status: 'available', distance: '15m' },
      { id: 'G-06', status: 'reserved', distance: '18m' },
      { id: 'G-07', status: 'available', distance: '20m' },
      { id: 'G-08', status: 'occupied', distance: '22m' },
    ]},
    B1: { name: 'Tầng B1 · Khu A + EV', type: 'Standard + EV', spots: [
      { id: 'A-01', status: 'available', distance: '6m thang máy' },
      { id: 'A-02', status: 'occupied', distance: '8m' },
      { id: 'A-03', status: 'available', distance: '10m' },
      { id: 'A-04', status: 'reserved', distance: '12m' },
      { id: 'A-05', status: 'available', distance: '15m · EV', isEv: true },
      { id: 'A-06', status: 'available', distance: '18m · EV', isEv: true },
      { id: 'A-07', status: 'occupied', distance: '20m' },
      { id: 'A-08', status: 'available', distance: '22m' },
    ]}
  },
  'Indochina': {
    B1: { name: 'Tầng B1 · Sảnh Bạch Đằng', type: 'Standard', spots: [
      { id: 'A-01', status: 'available', distance: '5m view sông Hàn' },
      { id: 'A-02', status: 'occupied', distance: '8m' },
      { id: 'A-03', status: 'available', distance: '10m' },
      { id: 'A-04', status: 'occupied', distance: '12m' },
      { id: 'A-05', status: 'available', distance: '15m' },
      { id: 'A-06', status: 'reserved', distance: '18m' },
      { id: 'A-07', status: 'available', distance: '20m' },
      { id: 'A-08', status: 'occupied', distance: '22m' },
    ]},
    B2: { name: 'Tầng B2 · Khu B + EV', type: 'Standard Plus', spots: [
      { id: 'B-01', status: 'occupied', distance: '6m thang VIP' },
      { id: 'B-02', status: 'available', distance: '8m' },
      { id: 'B-03', status: 'available', distance: '10m · EV', isEv: true },
      { id: 'B-04', status: 'available', distance: '12m · EV', isEv: true },
      { id: 'B-05', status: 'occupied', distance: '15m' },
      { id: 'B-06', status: 'available', distance: '18m' },
      { id: 'B-07', status: 'reserved', distance: '20m' },
      { id: 'B-08', status: 'available', distance: '22m' },
    ]}
  }
};

// Helper to get branch key and ID
function getBranchKey(branchName) {
  if (!branchName) return 'Aeon Mall';
  if (branchName.includes('Aeon')) return 'Aeon Mall';
  if (branchName.includes('Vincom')) return 'Vincom';
  if (branchName.includes('Sân Bay') || branchName.includes('Airport')) return 'Sân Bay';
  if (branchName.includes('Lotte')) return 'Lotte';
  if (branchName.includes('Indochina')) return 'Indochina';
  return 'Aeon Mall';
}

function getBranchId(branchName) {
  if (!branchName) return 'BR-01';
  if (branchName.includes('Aeon')) return 'BR-01';
  if (branchName.includes('Vincom')) return 'BR-02';
  if (branchName.includes('Sân Bay') || branchName.includes('Airport')) return 'BR-03';
  if (branchName.includes('Lotte')) return 'BR-04';
  if (branchName.includes('Indochina')) return 'BR-05';
  return 'BR-01';
}

export default function SlotSelectionDialog({
  isOpen,
  onClose,
  bookingInfo,
  userVouchers = [],
  setUserVouchers,
  onConfirmBooking,
  language = 'vi',
  initialVoucher = null
}) {
  const t = (key) => getTranslation(language, key);

  // Resolve branch-specific floor config
  const branchKey = getBranchKey(bookingInfo?.branch);
  const branchFloors = BRANCH_FLOORS[branchKey] || BRANCH_FLOORS['Aeon Mall'];
  const availableFloors = Object.keys(branchFloors);

  // Dialog internal step: 1 = Chọn ô đỗ, 2 = Thanh toán & Áp mã, 3 = Màn hình quét mã VietQR (nếu chọn VietQR)
  const [dialogStep, setDialogStep] = useState(1);

  const [selectedFloor, setSelectedFloor] = useState(
    bookingInfo?.evCharge ? (availableFloors.find(f => branchFloors[f]?.spots?.some(s => s.isEv)) || availableFloors[0]) : availableFloors[0]
  );
  const [chosenSlot, setChosenSlot] = useState(
    bookingInfo?.evCharge ? (branchFloors[availableFloors.find(f => branchFloors[f]?.spots?.some(s => s.isEv)) || availableFloors[0]]?.spots?.find(s => s.isEv)?.id || availableFloors[0]) : (branchFloors[availableFloors[0]]?.spots?.[0]?.id || 'A-02')
  );

  // Ô đỗ thời gian thực tải từ PostgreSQL Server
  const [liveSlots, setLiveSlots] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const branchId = getBranchId(bookingInfo?.branch);
    const fetchSlots = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/parking/slots/${branchId}/${selectedFloor}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setLiveSlots(json.data);
        }
      } catch (err) {
        console.warn('Lỗi tải slots từ server:', err);
      }
    };
    fetchSlots();
    const interval = setInterval(fetchSlots, 3000);

    let socket;
    try {
      socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
      socket.on('slot:status_changed', (data) => {
        if (!data) return;
        const curBranch = getBranchId(bookingInfo?.branch);
        if (!data.branchId || data.branchId === curBranch) {
          fetchSlots();
        }
      });
      socket.on('slots:update', () => {
        fetchSlots();
      });
    } catch {}

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [isOpen, selectedFloor, bookingInfo?.branch]);

  // Đặc quyền hạng hội viên của khách hàng hiện tại
  const [currentUserTier] = useState(() => {
    try {
      const raw = localStorage.getItem('pf_current_user');
      if (raw) {
        const u = JSON.parse(raw);
        const pts = u.parkPoints ?? u.park_points ?? 1250;
        if (pts >= 6500 || u.loyalty_tier === 'diamond') return { tier: 'diamond', nameVi: 'Hội Viên Kim Cương', nameEn: 'Diamond Member', discount: 15, multiplier: 2.0, freeVip: true, pts };
        if (pts >= 3000 || u.loyalty_tier === 'gold') return { tier: 'gold', nameVi: 'Hội Viên Vàng', nameEn: 'Gold Member', discount: 10, multiplier: 1.5, freeVip: true, pts };
        if (pts >= 700 || u.loyalty_tier === 'silver') return { tier: 'silver', nameVi: 'Hội Viên Bạc', nameEn: 'Silver Member', discount: 5, multiplier: 1.2, freeVip: false, pts };
        return { tier: 'bronze', nameVi: 'Hội Viên Chuẩn (Đồng)', nameEn: 'Bronze Member', discount: 0, multiplier: 1.0, freeVip: false, pts };
      }
    } catch {}
    return { tier: 'silver', nameVi: 'Hội Viên Bạc', nameEn: 'Silver Member', discount: 5, multiplier: 1.2, freeVip: false, pts: 1250 };
  });

  // Voucher đã chọn để áp dụng
  const [selectedVoucher, setSelectedVoucher] = useState(() => initialVoucher ? normalizeVoucher(initialVoucher) : null);

  // Phương thức thanh toán: 'vietqr' | 'momo' | 'zalopay' | 'bank' | 'card'
  const [paymentChoice, setPaymentChoice] = useState('vietqr');
  const [paymentWarning, setPaymentWarning] = useState('');

  // Lấy các phương thức thanh toán đã liên kết thực tế từ bộ nhớ thiết bị
  const [linkedPayments, setLinkedPayments] = useState(() => {
    try {
      const raw = localStorage.getItem('sp_linked_payments');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Cập nhật lại mỗi khi mở dialog
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem('sp_linked_payments');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLinkedPayments(parsed);
      }
    } catch {}
    setPaymentWarning('');
  }, [isOpen]);

  const momoAccount = linkedPayments.find((p) => p.type === 'momo');
  const zaloAccount = linkedPayments.find((p) => p.type === 'zalopay');
  const cardAccount = linkedPayments.find((p) => p.type === 'card' || p.type === 'bank');

  // Chặn nghiêm ngặt: Nếu chưa liên kết ví thì không cho phép chọn phương thức đó
  const handleSelectPaymentChoice = (choice) => {
    setPaymentWarning('');
    if (choice === 'vietqr') {
      setPaymentChoice('vietqr');
      return;
    }
    if (choice === 'momo') {
      if (!momoAccount) {
        setPaymentWarning('⚠️ Bạn chưa liên kết Ví MoMo. Vui lòng vào phân hệ "Thanh toán" để liên kết ví trước, hoặc chọn "Quét VietQR" để thanh toán ngay.');
        return;
      }
      setPaymentChoice('momo');
      return;
    }
    if (choice === 'zalopay') {
      if (!zaloAccount) {
        setPaymentWarning('⚠️ Bạn chưa liên kết Ví ZaloPay. Vui lòng vào phân hệ "Thanh toán" để liên kết ví trước, hoặc chọn "Quét VietQR" để thanh toán ngay.');
        return;
      }
      setPaymentChoice('zalopay');
      return;
    }
    if (choice === 'card') {
      if (!cardAccount) {
        setPaymentWarning('⚠️ Bạn chưa liên kết Thẻ ngân hàng (Visa/Mastercard). Vui lòng vào phân hệ "Thanh toán" để liên kết thẻ trước, hoặc chọn "Quét VietQR" để thanh toán ngay.');
        return;
      }
      setPaymentChoice('card');
      return;
    }
  };

  // Input nhập mã voucher trực tiếp tại checkout
  const [checkoutCodeInput, setCheckoutCodeInput] = useState('');
  const [checkoutCodeMsg, setCheckoutCodeMsg] = useState({ text: '', isError: false });

  // Modal xem chi tiết điều khoản voucher
  const [detailVoucher, setDetailVoucher] = useState(null);

  // VietQR modal / đếm ngược thời gian
  const [qrCountdown, setQrCountdown] = useState(300); // 5 phút
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [transCode, setTransCode] = useState('');

  // Lọc duy nhất các voucher ĐÃ LƯU của người dùng và CHƯA SỬ DỤNG
  const activeSavedVouchers = (Array.isArray(userVouchers) ? userVouchers : [])
    .map(normalizeVoucher)
    .filter((v) => v && !v.isUsed);

  // Khởi tạo mã chuyển khoản ngẫu nhiên khi mở dialog
  useEffect(() => {
    if (isOpen) {
      const randomCode = `SP${Math.floor(100000 + Math.random() * 900000)}`;
      setTransCode(randomCode);
      setQrCountdown(300);

      // Nếu có initialVoucher truyền vào thì ưu tiên chọn, ngược lại chọn voucher đầu tiên nếu có mã đã lưu
      if (initialVoucher) {
        setSelectedVoucher(normalizeVoucher(initialVoucher));
      } else if (activeSavedVouchers.length > 0 && !selectedVoucher) {
        setSelectedVoucher(activeSavedVouchers[0]);
      }
    }
  }, [isOpen, initialVoucher]);

  // Bộ đếm lùi cho VietQR
  useEffect(() => {
    if (!isOpen || paymentChoice !== 'vietqr' || qrCountdown <= 0) return;
    const timer = setInterval(() => {
      setQrCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, paymentChoice, qrCountdown]);

  const currentFloorData = branchFloors[selectedFloor] || branchFloors[availableFloors[0]] || { name: 'Tầng ' + (selectedFloor || 'B1'), spots: [] };
  const fallbackSpots = (currentFloorData?.spots || []).map((s) => ({
    ...s,
    status: s.status === 'occupied' || s.status === 'reserved' ? 'available' : s.status
  }));
  const currentSpots = liveSlots && liveSlots.length > 0 ? liveSlots : fallbackSpots;
  const availableCount = currentSpots.filter((s) => s.status === 'available').length;
  const reservedCount = currentSpots.filter((s) => s.status === 'reserved').length;
  const occupiedCount = currentSpots.filter((s) => s.status === 'occupied').length;
  const slotObj = currentSpots.find((s) => s.id === chosenSlot);

  // Tự động chuyển chọn ô khả dụng nếu ô hiện tại đang bận
  useEffect(() => {
    if (!isOpen) return;
    if (currentSpots && currentSpots.length > 0) {
      const cur = currentSpots.find((s) => s.id === chosenSlot);
      if (!cur || cur.status !== 'available') {
        const firstAvail = currentSpots.find((s) => s.status === 'available');
        if (firstAvail) {
          setChosenSlot(firstAvail.id);
        }
      }
    }
  }, [isOpen, currentSpots, chosenSlot]);

  // Tính toán cước phí gốc từ gói đã chọn ở BookingView
  let baseRate = bookingInfo?.estimatedFee;
  if (!baseRate || isNaN(baseRate)) {
    if (bookingInfo?.duration === '1 giờ') baseRate = 25000;
    else if (bookingInfo?.duration === '2 giờ') baseRate = 45000;
    else if (bookingInfo?.duration === '4 giờ') baseRate = 80000;
    else if (bookingInfo?.duration && (bookingInfo.duration.includes('ngày') || bookingInfo.duration.includes('Ngày'))) baseRate = 150000;
    else if (bookingInfo?.duration && (bookingInfo.duration.includes('Tuần') || bookingInfo.duration.includes('tuần'))) baseRate = 650000;
    else if (bookingInfo?.duration && (bookingInfo.duration.includes('Tháng') || bookingInfo.duration.includes('tháng'))) baseRate = 1800000;
    else baseRate = 25000;
  }

  // Kiểm tra ô đỗ hiện tại có thuộc khu VIP không
  const isSlotVip = Boolean(
    slotObj?.isVip ||
    selectedFloor === 'B3' ||
    (chosenSlot && chosenSlot.startsWith('V-')) ||
    currentFloorData?.type === 'VIP'
  );

  // Đặc quyền Hội viên: Vàng & Kim Cương được MIỄN PHÍ 100% phụ thu khu VIP
  const isVipWaived = isSlotVip && Boolean(currentUserTier?.freeVip);
  const baseVipSurcharge = isSlotVip
    ? (bookingInfo?.packageType === 'monthly' ? 200000 : bookingInfo?.packageType === 'weekly' ? 80000 : 15000)
    : 0;
  const vipSurcharge = isVipWaived ? 0 : baseVipSurcharge;

  // Đặc quyền Hội viên: Giảm giá trực tiếp theo hạng (Silver 5%, Gold 10%, Diamond 15%)
  const tierDiscountPercent = currentUserTier?.discount || 0;
  const tierDiscountAmount = Math.round((baseRate * tierDiscountPercent) / 100);

  const subtotalBeforeVoucher = Math.max(0, baseRate + vipSurcharge - tierDiscountAmount);
  const subtotal = subtotalBeforeVoucher;

  // Tính số tiền giảm giá (chỉ áp dụng nếu đạt giá trị đơn tối thiểu)
  let discountAmount = 0;
  let voucherNotice = null;
  if (selectedVoucher) {
    const normV = normalizeVoucher(selectedVoucher);
    if (normV) {
      const minVal = normV.minOrderVal || 0;
      if (minVal > 0 && subtotal < minVal) {
        voucherNotice = language === 'vi'
          ? `Đơn hàng tối thiểu ${minVal.toLocaleString('vi-VN')}đ để áp dụng voucher này (Hiện tại: ${subtotal.toLocaleString('vi-VN')}đ)`
          : `Minimum order ${minVal.toLocaleString('vi-VN')}đ required for this voucher (Current: ${subtotal.toLocaleString('vi-VN')}đ)`;
        discountAmount = 0;
      } else {
        if (normV.type === 'percent') {
          discountAmount = Math.round((subtotal * (normV.value || 0)) / 100);
        } else {
          discountAmount = normV.value || 0;
        }
      }
    }
  }

  const finalTotal = Math.max(0, isNaN(subtotal - discountAmount) ? (Number(subtotal) || 0) : (subtotal - discountAmount));
  const pointsToEarn = Math.max(10, Math.round((finalTotal / 1000) * (currentUserTier?.multiplier || 1.0)));

  // Format đếm ngược mm:ss
  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // VietQR link chuẩn Napas 247
  const vietQrImageLink = `https://img.vietqr.io/image/970415-103870000000-compact2.png?amount=${Number(finalTotal) || 0}&addInfo=${encodeURIComponent(transCode)}&accountName=${encodeURIComponent('BQL BAI XE SMARTPARK DA NANG')}`;

  const handleSelectSlot = (slot) => {
    if (slot.status === 'available') {
      setChosenSlot(slot.id);
    }
  };

  // Xử lý nhập mã voucher ngay tại bước thanh toán
  const handleApplyCheckoutCode = async (e) => {
    e.preventDefault();
    setCheckoutCodeMsg({ text: '', isError: false });

    const codeToApply = checkoutCodeInput.trim().toUpperCase();
    if (!codeToApply) {
      setCheckoutCodeMsg({ text: 'Vui lòng nhập mã ưu đãi.', isError: true });
      return;
    }

    // Kiểm tra trong danh bạ voucher hoặc API backend
    let found = lookupVoucherCode(codeToApply);
    if (!found) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/vouchers/apply-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ code: codeToApply })
        });
        const json = await res.json();
        if (json.success && json.data) {
          found = {
            code: json.data.code,
            title: json.data.title,
            type: json.data.discount_type || 'fixed',
            value: json.data.discount_val || 20000,
            minOrderVal: json.data.min_order_val || 0
          };
        }
      } catch {}
    }

    if (!found) {
      setCheckoutCodeMsg({
        text: `Mã "${codeToApply}" không tồn tại hoặc đã hết hạn.`,
        isError: true
      });
      return;
    }

    // Tự động thêm vào ví nếu chưa có
    const norm = normalizeVoucher(found);
    const addResult = addVoucherToWallet(norm, 'checkout');
    if (setUserVouchers) {
      setUserVouchers((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const exist = list.some((x) => (x?.code || x?.voucher_code || '').toUpperCase() === norm.code.toUpperCase());
        if (!exist) return [addResult?.voucher || norm, ...list];
        return list;
      });
    }

    // Chọn áp dụng ngay
    setSelectedVoucher(norm);
    setCheckoutCodeMsg({
      text: `✓ Đã áp dụng thành công mã ${norm.code} (-${norm.type === 'percent' ? `${norm.value}%` : `${(norm.value || 20000).toLocaleString('vi-VN')}đ`})!`,
      isError: false
    });
    setCheckoutCodeInput('');
  };

  // Hoàn tất đơn đặt chỗ
  const handleFinalConfirm = () => {
    // Chặn triệt để nếu chưa liên kết ví
    if (paymentChoice === 'momo' && !momoAccount) {
      alert('Không thể thanh toán: Bạn chưa liên kết Ví MoMo. Vui lòng chọn Quét VietQR để thanh toán ngay.');
      setPaymentChoice('vietqr');
      return;
    }
    if (paymentChoice === 'zalopay' && !zaloAccount) {
      alert('Không thể thanh toán: Bạn chưa liên kết Ví ZaloPay. Vui lòng chọn Quét VietQR để thanh toán ngay.');
      setPaymentChoice('vietqr');
      return;
    }
    if (paymentChoice === 'card' && !cardAccount) {
      alert('Không thể thanh toán: Bạn chưa liên kết Thẻ ngân hàng. Vui lòng chọn Quét VietQR để thanh toán ngay.');
      setPaymentChoice('vietqr');
      return;
    }

    // Nếu áp dụng voucher, đánh dấu là đã sử dụng
    if (selectedVoucher) {
      const vCode = selectedVoucher.code || selectedVoucher.voucher_code;
      if (vCode) {
        markVoucherAsUsed(vCode);
        if (setUserVouchers) {
          setUserVouchers((prev) =>
            (Array.isArray(prev) ? prev : []).map((v) => {
              if (!v) return v;
              const curCode = (v.code || v.voucher_code || '').toUpperCase();
              return curCode === String(vCode).toUpperCase() && !v.isUsed && !v.is_used
                ? { ...v, isUsed: true, is_used: true, usedAt: new Date().toISOString() }
                : v;
            })
          );
        }
      }
    }

    onConfirmBooking({
      ...bookingInfo,
      floor: selectedFloor,
      slot: chosenSlot,
      isVip: isSlotVip,
      vipSurcharge,
      paymentMethod: paymentChoice === 'vietqr' ? 'Quét VietQR / Napas 247' : paymentChoice,
      voucher: selectedVoucher,
      discountAmount,
      tierDiscountAmount,
      totalCost: finalTotal,
      pointsToEarn,
      loyaltyTier: currentUserTier?.tier,
      transCode
    });
  };

  // Xác nhận thanh toán VietQR (mô phỏng Webhook thành công)
  const handleConfirmVietQrPaid = () => {
    setIsVerifyingPayment(true);
    setTimeout(() => {
      setIsVerifyingPayment(false);
      handleFinalConfirm();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="pf-modal-backdrop" onClick={onClose}>
      <div
        className="pf-modal-dialog pf-slot-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: dialogStep === 2 && paymentChoice === 'vietqr' ? '760px' : '680px' }}
      >
        {/* Header with Step Tracker */}
        <div className="pf-modal-head">
          <div>
            <div className="pf-step-tracker" style={{ margin: 0, padding: '0.25rem 0.75rem', display: 'inline-flex' }}>
              <span className={`pf-step-item ${dialogStep === 1 ? 'active' : ''}`}>
                1. {language === 'vi' ? 'Chọn vị trí ô đỗ' : 'Select Spot'}
              </span>
              <span className="pf-step-line" style={{ width: '1.2rem' }}></span>
              <span className={`pf-step-item ${dialogStep === 2 ? 'active' : ''}`}>
                2. {language === 'vi' ? 'Thanh toán & Áp mã đã lưu' : 'Payment & Saved Vouchers'}
              </span>
            </div>
            <h3 style={{ marginTop: '0.4rem', fontSize: '1.2rem' }}>
              {dialogStep === 1
                ? (language === 'vi' ? `Chọn Ô Đỗ Xe · ${bookingInfo?.branch || 'Aeon Mall Thanh Khê 1'}` : `Choose Parking Spot · ${bookingInfo?.branch}`)
                : (language === 'vi' ? 'Thanh Toán & Áp Dụng Mã Ưu Đãi Đã Lưu' : 'Checkout & Apply Saved Voucher')}
            </h3>
          </div>
          <button
            className="pf-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pf-modal-body pf-slot-dialog-body">
          {dialogStep === 1 ? (
            /* ── STEP 1: INTERACTIVE SPOT MATRIX ── */
            <>
              {/* Floor Controls */}
              <div className="pf-slot-control-bar">
                <div className="pf-floor-tabs">
                  {availableFloors.map((fl) => (
                    <button
                      key={fl}
                      className={`pf-floor-tab ${selectedFloor === fl ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedFloor(fl);
                        const firstAvail = branchFloors[fl]?.spots?.find((s) => s.status === 'available');
                        if (firstAvail) setChosenSlot(firstAvail.id);
                      }}
                    >
                      {language === 'vi' ? `Tầng ${fl}` : `Level ${fl}`}
                      {branchFloors[fl]?.type === 'VIP' && <span className="pf-mini-ev-pill vip">✦ VIP</span>}
                      {branchFloors[fl]?.spots?.some(s => s.isEv) && branchFloors[fl]?.type !== 'VIP' && <span className="pf-mini-ev-pill">⚡ EV</span>}
                    </button>
                  ))}
                </div>

                <div className="pf-map-legend" style={{ margin: 0 }}>
                  <div className="pf-legend-item">
                    <div className="pf-legend-dot available"></div>
                    <span>{language === 'vi' ? 'Trống:' : 'Free:'} <strong>{availableCount}</strong></span>
                  </div>
                  <div className="pf-legend-item">
                    <div className="pf-legend-dot reserved" style={{ background: '#f59e0b' }}></div>
                    <span>{language === 'vi' ? 'Đã đặt:' : 'Reserved:'} <strong>{reservedCount}</strong></span>
                  </div>
                  <div className="pf-legend-item">
                    <div className="pf-legend-dot occupied"></div>
                    <span>{language === 'vi' ? 'Đã đỗ:' : 'Busy:'} <strong>{occupiedCount}</strong></span>
                  </div>
                </div>
              </div>

              <p className="pf-slot-guide-text">
                {language === 'vi'
                  ? '👉 Bấm vào ô màu xanh lá để chọn vị trí ô đỗ bạn muốn:'
                  : '👉 Click any glowing green spot to select your preferred parking bay:'}
              </p>

              {/* Slot Matrix Wrapper */}
              <div className="pf-slot-matrix-wrapper">
                <div className="pf-slots-row">
                  {(currentSpots && currentSpots.length > 0 ? currentSpots : (currentFloorData?.spots || [])).slice(0, 6).map((slot) => {
                    const isSelected = chosenSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={slot.status === 'occupied' || slot.status === 'reserved'}
                        className={`pf-slot-item ${slot.status} ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectSlot(slot)}
                      >
                        <span className="pf-slot-code">{slot.id}</span>
                        <div className="pf-slot-icon">
                          {isSelected ? (
                            <CheckCircle2 size={22} color="#0284c7" />
                          ) : slot.status === 'occupied' ? (
                            <CarFront size={20} color="#9ca3af" />
                          ) : slot.status === 'reserved' ? (
                            <Clock size={18} color="#f59e0b" />
                          ) : (
                            <Plus size={19} color="#10b981" />
                          )}
                        </div>
                        <span className="pf-slot-tag">
                          {slot.status === 'reserved'
                            ? (language === 'vi' ? 'Đã đặt' : 'Reserved')
                            : slot.status === 'occupied'
                              ? (language === 'vi' ? 'Đã đỗ' : 'Busy')
                              : slot.isEv
                                ? '⚡ EV'
                                : slot.isVip
                                  ? '✦ VIP'
                                  : (language === 'vi' ? 'Trống' : 'Free')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pf-aisle-lane">
                  ▲ {language === 'vi' ? `LÀN LƯU THÔNG TẦNG ${selectedFloor} · LỐI RA THANG MÁY` : `LANE ${selectedFloor} · ELEVATOR EXIT`} ▼
                </div>

                <div className="pf-slots-row">
                  {(currentSpots && currentSpots.length > 0 ? currentSpots : (currentFloorData?.spots || [])).slice(6, 12).map((slot) => {
                    const isSelected = chosenSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={slot.status === 'occupied' || slot.status === 'reserved'}
                        className={`pf-slot-item ${slot.status} ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectSlot(slot)}
                      >
                        <span className="pf-slot-code">{slot.id}</span>
                        <div className="pf-slot-icon">
                          {isSelected ? (
                            <CheckCircle2 size={22} color="#0284c7" />
                          ) : slot.status === 'occupied' ? (
                            <CarFront size={20} color="#9ca3af" />
                          ) : slot.status === 'reserved' ? (
                            <Clock size={18} color="#f59e0b" />
                          ) : (
                            <Plus size={19} color="#10b981" />
                          )}
                        </div>
                        <span className="pf-slot-tag">
                          {slot.status === 'reserved'
                            ? (language === 'vi' ? 'Đã đặt' : 'Reserved')
                            : slot.status === 'occupied'
                              ? (language === 'vi' ? 'Đã đỗ' : 'Busy')
                              : slot.isEv
                                ? '⚡ EV'
                                : slot.isVip
                                  ? '✦ VIP'
                                  : (language === 'vi' ? 'Trống' : 'Free')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Slot Summary */}
              <div className="pf-slot-selected-detail-panel">
                <div className="pf-slot-summary-left">
                  <div className="pf-slot-big-badge">{chosenSlot}</div>
                  <div>
                    <strong style={{ fontSize: '0.96rem' }}>
                      {language === 'vi' ? `Ô đỗ đã chọn: ${chosenSlot} (${currentFloorData?.name || 'Tầng ' + selectedFloor})` : `Selected: ${chosenSlot} (${currentFloorData?.name || 'Level ' + selectedFloor})`}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                      <MapPin size={13} color="#0284c7" style={{ display: 'inline', marginRight: '3px' }} />
                      {slotObj?.distance || 'Khu vực trung tâm'}
                      {slotObj?.isEv && <span style={{ color: '#0284c7', fontWeight: '700' }}> · Trụ sạc siêu tốc EV</span>}
                    </div>
                  </div>
                </div>

                <div className="pf-slot-summary-right">
                  {isVipWaived ? (
                    <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, marginBottom: '2px' }}>
                      👑 Miễn 100% phụ thu VIP ({currentUserTier?.nameVi})
                    </div>
                  ) : isSlotVip ? (
                    <div style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, marginBottom: '2px' }}>
                      👑 Ô VIP (+{vipSurcharge.toLocaleString('vi-VN')}đ)
                    </div>
                  ) : null}

                  {tierDiscountAmount > 0 && (
                    <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, marginBottom: '2px' }}>
                      ✨ Giảm {tierDiscountPercent}% ({currentUserTier?.nameVi}): -{tierDiscountAmount.toLocaleString('vi-VN')}đ
                    </div>
                  )}

                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{language === 'vi' ? 'Tạm tính cước:' : 'Subtotal:'}</span>
                  <strong style={{ fontSize: '1.25rem', color: '#0284c7', fontFamily: 'Space Grotesk' }}>
                    {subtotal.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              </div>
            </>
          ) : (
            /* ── STEP 2: CHECKOUT & SAVED VOUCHERS ONLY + DIRECT CODE INPUT + VIETQR ── */
            <div className="pf-checkout-step-container">
              {/* Trip Summary Mini Banner */}
              <div className="pf-checkout-summary-strip" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--pf-surface-subtle)', borderRadius: 'var(--pf-radius-md)', marginBottom: '1rem', fontSize: '0.8rem', border: '1px solid var(--pf-border)' }}>
                <div>
                  <strong>{bookingInfo?.branch}</strong>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Ô đỗ: <span style={{ color: '#0284c7', fontWeight: '700' }}>{chosenSlot} ({selectedFloor})</span> · {bookingInfo?.vehicle}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{bookingInfo?.date || new Date().toISOString().split('T')[0]} ({bookingInfo?.startTime || '19:00'})</strong>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Thời lượng: {bookingInfo?.duration || '2 giờ'}</div>
                </div>
              </div>

              {/* ── 1. KHU VỰC VOUCHER ĐÃ LƯU TRONG VÍ (CHỈ HIỂN THỊ CÁC MÃ ĐÃ LƯU) ── */}
              <div className="pf-checkout-voucher-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: '800', color: 'var(--pf-text-main)' }}>
                    <Ticket size={16} color="#0284c7" />
                    <span>MÃ ƯU ĐÃI ĐÃ LƯU TRONG VÍ ({activeSavedVouchers.length})</span>
                  </div>
                  {selectedVoucher && (
                    <button
                      type="button"
                      className="pf-btn-text-link"
                      style={{ fontSize: '0.72rem', color: '#ef4444' }}
                      onClick={() => setSelectedVoucher(null)}
                    >
                      Bỏ áp dụng mã
                    </button>
                  )}
                </div>

                {/* Danh sách các mã ĐÃ LƯU */}
                {activeSavedVouchers.length > 0 ? (
                  <div className="pf-checkout-voucher-list" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {activeSavedVouchers.map((v) => {
                      const isApplied = selectedVoucher && ((selectedVoucher.code || selectedVoucher.voucher_code) === (v.code || v.voucher_code));
                      return (
                        <div
                          key={v.id || v.code}
                          className={`pf-checkout-voucher-item ${isApplied ? 'active' : ''}`}
                          onClick={() => setSelectedVoucher(isApplied ? null : v)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <input
                              type="radio"
                              name="checkoutVoucher"
                              checked={isApplied}
                              onChange={() => {}}
                              style={{ accentColor: '#0284c7' }}
                            />
                            <div>
                              <span className="pf-checkout-voucher-code">{v.code}</span>
                              <div style={{ fontSize: '0.72rem', color: 'var(--pf-text-muted)' }}>{v.title}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="pf-btn-voucher-details"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.68rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailVoucher(v);
                              }}
                            >
                              <Info size={11} /> {t('viewDetails')}
                            </button>
                            <span className="pf-checkout-voucher-val">
                              {v.type === 'percent'
                                ? `-${v.value || v.discount_val || 0}%`
                                : `-${((v.value !== undefined ? v.value : v.discount_val) || 0).toLocaleString('vi-VN')}đ`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '0.85rem', background: 'var(--pf-surface)', borderRadius: 'var(--pf-radius-sm)', border: '1px dashed var(--pf-border)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--pf-text-muted)' }}>
                    Ví của bạn chưa có mã ưu đãi nào. Nhập mã trực tiếp bên dưới để được giảm giá ngay!
                  </div>
                )}

                {/* Banner cảnh báo điều kiện voucher chưa đạt */}
                {voucherNotice && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--pf-radius-sm)', color: '#b45309', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={14} />
                    <span>{voucherNotice}</span>
                  </div>
                )}

                {/* ── 2. FORM NHẬP MÃ ĐỂ ÁP DỤNG TRỰC TIẾP TẠI BƯỚC THANH TOÁN (NEW) ── */}
                <div style={{ marginTop: '0.85rem', borderTop: '1px dashed var(--pf-border)', paddingTop: '0.75rem' }}>
                  <form onSubmit={handleApplyCheckoutCode} style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Nhập mã ưu đãi của bạn (VD: WELCOME20K)..."
                        value={checkoutCodeInput}
                        onChange={(e) => {
                          setCheckoutCodeInput(e.target.value.toUpperCase());
                          setCheckoutCodeMsg({ text: '', isError: false });
                        }}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          fontSize: '0.78rem',
                          borderRadius: 'var(--pf-radius-sm)',
                          border: '1px solid var(--pf-border)',
                          textTransform: 'uppercase',
                          fontWeight: '700',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="pf-btn-submit"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', flexShrink: 0 }}
                    >
                      Áp dụng
                    </button>
                  </form>

                  {checkoutCodeMsg.text && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: checkoutCodeMsg.isError ? '#ef4444' : '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {checkoutCodeMsg.isError ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                      <span>{checkoutCodeMsg.text}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={{ padding: '0.75rem 1rem', background: 'var(--pf-surface)', border: '1px solid var(--pf-border)', borderRadius: 'var(--pf-radius-md)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.35rem' }}>
                  <span>{language === 'vi' ? `Cước gửi xe gói (${bookingInfo?.duration || 'Tiêu chuẩn'}):` : 'Standard Fee:'}</span>
                  <span>{baseRate.toLocaleString('vi-VN')}đ</span>
                </div>
                {isSlotVip && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#f59e0b', fontWeight: '700', marginBottom: '0.35rem' }}>
                    <span>👑 Phụ phí khu vực VIP ({chosenSlot}):</span>
                    <span>+{vipSurcharge.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {discountAmount > 0 && selectedVoucher && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#059669', fontWeight: '700', marginBottom: '0.35rem' }}>
                    <span>🏷️ Giảm giá voucher ({selectedVoucher.code}):</span>
                    <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                {/* Điểm thưởng tích lũy theo đơn giá tiền */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#d97706', fontWeight: '700', marginBottom: '0.35rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={13} color="#f59e0b" />
                    {language === 'vi' ? 'Điểm thưởng tích lũy (+1 pt / 1.000đ):' : 'Earned ParkPoints:'}
                  </span>
                  <span>+{Math.max(10, Math.floor(finalTotal / 1000))} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--pf-border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--pf-text-main)' }}>{t('finalAmount')}</strong>
                  <strong style={{ fontSize: '1.35rem', color: '#0284c7', fontFamily: 'Space Grotesk' }}>
                    {finalTotal.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              </div>

              {/* ── 3. PHƯƠNG THỨC THANH TOÁN (THÊM QUÉT MÃ QR KHI CHƯA LIÊN KẾT TÀI KHOẢN) ── */}
              <div className="pf-dialog-payment-section" style={{ margin: 0 }}>
                <label className="pf-payment-section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>
                    <CreditCard size={15} style={{ display: 'inline', marginRight: '4px' }} />
                    {language === 'vi' ? 'Chọn phương thức thanh toán:' : 'Select Payment Method:'}
                  </span>
                  <small style={{ color: '#0284c7', fontWeight: '700' }}>
                    {paymentChoice === 'vietqr' ? '⚡ Quét QR - Không cần liên kết' : 'Tài khoản đã liên kết'}
                  </small>
                </label>

                <div className="pf-dialog-payment-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  {/* Option 1: QUÉT MÃ VIETQR (DÀNH CHO KHÁCH CHƯA LIÊN KẾT TÀI KHOẢN) */}
                  <div
                    className={`pf-dialog-pay-card ${paymentChoice === 'vietqr' ? 'active' : ''}`}
                    onClick={() => handleSelectPaymentChoice('vietqr')}
                    style={{
                      border: paymentChoice === 'vietqr' ? '2px solid #0284c7' : '1px solid var(--pf-border)',
                      background: paymentChoice === 'vietqr' ? 'rgba(2,132,199,0.06)' : 'var(--pf-surface)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ position: 'absolute', top: '-7px', right: '8px', background: '#10b981', color: '#ffffff', fontSize: '0.58rem', fontWeight: '800', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                      KHUYÊN DÙNG
                    </span>
                    <div className="pf-pay-card-top" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <QrCode size={16} color="#0284c7" />
                      <strong>Quét VietQR</strong>
                    </div>
                    <small style={{ color: '#0284c7', fontWeight: '600' }}>⚡ Mở app ngân hàng quét</small>
                  </div>

                  {/* Option 2: Ví MoMo */}
                  <div
                    className={`pf-dialog-pay-card ${paymentChoice === 'momo' ? 'active' : ''}`}
                    onClick={() => handleSelectPaymentChoice('momo')}
                    style={{
                      opacity: momoAccount ? 1 : 0.65,
                      cursor: momoAccount ? 'pointer' : 'not-allowed',
                      border: paymentChoice === 'momo' ? '2px solid #d82d8b' : momoAccount ? '1px solid var(--pf-border)' : '1px dashed #ef4444',
                      background: paymentChoice === 'momo' ? 'rgba(216,45,139,0.08)' : 'var(--pf-surface)',
                      position: 'relative'
                    }}
                  >
                    <div className="pf-pay-card-top">
                      <strong style={{ color: momoAccount ? 'inherit' : '#94a3b8' }}>Ví MoMo</strong>
                    </div>
                    {momoAccount ? (
                      <small style={{ color: '#10b981', fontWeight: '600' }}>✓ {momoAccount.account || 'Đã liên kết'}</small>
                    ) : (
                      <small style={{ color: '#ef4444', fontWeight: '600' }}>🔒 Chưa liên kết</small>
                    )}
                  </div>

                  {/* Option 3: Ví ZaloPay */}
                  <div
                    className={`pf-dialog-pay-card ${paymentChoice === 'zalopay' ? 'active' : ''}`}
                    onClick={() => handleSelectPaymentChoice('zalopay')}
                    style={{
                      opacity: zaloAccount ? 1 : 0.65,
                      cursor: zaloAccount ? 'pointer' : 'not-allowed',
                      border: paymentChoice === 'zalopay' ? '2px solid #0088cc' : zaloAccount ? '1px solid var(--pf-border)' : '1px dashed #ef4444',
                      background: paymentChoice === 'zalopay' ? 'rgba(0,136,204,0.08)' : 'var(--pf-surface)',
                      position: 'relative'
                    }}
                  >
                    <div className="pf-pay-card-top">
                      <strong style={{ color: zaloAccount ? 'inherit' : '#94a3b8' }}>Ví ZaloPay</strong>
                    </div>
                    {zaloAccount ? (
                      <small style={{ color: '#10b981', fontWeight: '600' }}>✓ {zaloAccount.account || 'Đã liên kết'}</small>
                    ) : (
                      <small style={{ color: '#ef4444', fontWeight: '600' }}>🔒 Chưa liên kết</small>
                    )}
                  </div>

                  {/* Option 4: Thẻ Visa/Master */}
                  <div
                    className={`pf-dialog-pay-card ${paymentChoice === 'card' ? 'active' : ''}`}
                    onClick={() => handleSelectPaymentChoice('card')}
                    style={{
                      opacity: cardAccount ? 1 : 0.65,
                      cursor: cardAccount ? 'pointer' : 'not-allowed',
                      border: paymentChoice === 'card' ? '2px solid #6366f1' : cardAccount ? '1px solid var(--pf-border)' : '1px dashed #ef4444',
                      background: paymentChoice === 'card' ? 'rgba(99,102,241,0.08)' : 'var(--pf-surface)',
                      position: 'relative'
                    }}
                  >
                    <div className="pf-pay-card-top">
                      <strong style={{ color: cardAccount ? 'inherit' : '#94a3b8' }}>Visa / Master</strong>
                    </div>
                    {cardAccount ? (
                      <small style={{ color: '#10b981', fontWeight: '600' }}>✓ {cardAccount.account || 'Đã liên kết'}</small>
                    ) : (
                      <small style={{ color: '#ef4444', fontWeight: '600' }}>🔒 Chưa liên kết</small>
                    )}
                  </div>
                </div>

                {/* Cảnh báo khi bấm vào phương thức chưa liên kết */}
                {paymentWarning && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <span>{paymentWarning}</span>
                    <button
                      type="button"
                      onClick={() => setPaymentWarning('')}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* ── 4. GIAO DIỆN QUÉT MÃ VIETQR KHI CHỌN CHƯA LIÊN KẾT TÀI KHOẢN ── */}
                {paymentChoice === 'vietqr' && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#0f172a', borderRadius: 'var(--pf-radius-md)', color: '#ffffff', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <QrCode size={18} color="#38bdf8" />
                        <strong style={{ fontSize: '0.88rem' }}>MÃ QUÉT THANH TOÁN VIETQR (NAPAS 247)</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700' }}>
                        <Clock size={14} />
                        <span>Hết hạn sau: {formatCountdown(qrCountdown)}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Dynamic QR Code box */}
                      <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <QRCodeSVG
                          value={vietQrImageLink}
                          size={135}
                          level="M"
                          includeMargin={false}
                        />
                      </div>

                      {/* Bank Details & Copy */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Ngân hàng thụ hưởng:</div>
                        <div style={{ fontWeight: '800', color: '#38bdf8', fontSize: '0.85rem' }}>MBBank (Quân Đội) · CN Đà Nẵng</div>

                        <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.75rem' }}>STK: <strong>1038 7000 0000</strong></span>
                          <button
                            type="button"
                            className="pf-btn-text-link"
                            style={{ color: '#38bdf8', fontSize: '0.7rem' }}
                            onClick={() => {
                              navigator.clipboard?.writeText('103870000000');
                              alert('Đã sao chép số tài khoản MBBank!');
                            }}
                          >
                            <Copy size={12} /> Copy
                          </button>
                        </div>

                        <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.75rem' }}>Nội dung: <strong style={{ color: '#f59e0b' }}>{transCode}</strong></span>
                          <button
                            type="button"
                            className="pf-btn-text-link"
                            style={{ color: '#38bdf8', fontSize: '0.7rem' }}
                            onClick={() => {
                              navigator.clipboard?.writeText(transCode);
                              alert(`Đã sao chép cú pháp: ${transCode}`);
                            }}
                          >
                            <Copy size={12} /> Copy
                          </button>
                        </div>

                        <div style={{ marginTop: '0.45rem', fontSize: '0.7rem', color: '#cbd5e1' }}>
                          Số tiền chính xác: <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>{finalTotal.toLocaleString('vi-VN')}đ</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pf-modal-footer">
          {dialogStep === 1 ? (
            <>
              <button type="button" className="pf-btn-cancel" onClick={onClose}>
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
              <button
                type="button"
                className="pf-btn-submit"
                onClick={() => setDialogStep(2)}
              >
                <span>{language === 'vi' ? 'Tiếp tục sang bước Thanh toán & Áp mã' : 'Continue to Checkout'}</span>
                <ArrowRight size={16} style={{ display: 'inline', marginLeft: '4px' }} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="pf-btn-cancel"
                onClick={() => setDialogStep(1)}
              >
                <ArrowLeft size={16} style={{ display: 'inline', marginRight: '4px' }} />
                {language === 'vi' ? 'Quay lại chọn ô' : 'Back to Spots'}
              </button>

              {paymentChoice === 'vietqr' ? (
                <button
                  type="button"
                  className="pf-btn-submit"
                  disabled={isVerifyingPayment}
                  onClick={handleConfirmVietQrPaid}
                  style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  {isVerifyingPayment ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Đang kiểm tra giao dịch VietQR...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Xác Nhận Đã Chuyển Khoản & Nhận Mã Pass ({finalTotal.toLocaleString('vi-VN')}đ)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="pf-btn-submit"
                  onClick={handleFinalConfirm}
                >
                  <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  {language === 'vi'
                    ? `Thanh toán ${finalTotal.toLocaleString('vi-VN')}đ & Nhận QR Barrier Pass`
                    : `Pay ${finalTotal.toLocaleString('vi-VN')}đ & Get QR Pass`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Voucher Popup Modal */}
      {detailVoucher && (
        <div className="pf-modal-backdrop" onClick={() => setDetailVoucher(null)} style={{ zIndex: 11000 }}>
          <div className="pf-modal-dialog pf-voucher-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={18} color="#0284c7" />
                <h3>{t('voucherDetailModalTitle')}</h3>
              </div>
              <button type="button" className="pf-modal-close-btn" onClick={() => setDetailVoucher(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="pf-modal-body">
              <div className="pf-voucher-detail-hero">
                <span className="pf-voucher-tag-pill">{detailVoucher.tag || 'PROMO'}</span>
                <div className="pf-voucher-modal-code">{detailVoucher.code}</div>
                <h4>{detailVoucher.title}</h4>
                <p>{detailVoucher.desc}</p>
              </div>
              <div className="pf-voucher-terms-list">
                <div className="pf-term-row">
                  <span>Hạn sử dụng:</span>
                  <strong>{detailVoucher.expiry || detailVoucher.exp}</strong>
                </div>
                <div className="pf-term-row">
                  <span>Chi nhánh áp dụng:</span>
                  <strong>{detailVoucher.stations || 'Tất cả chi nhánh SmartPark Đà Nẵng'}</strong>
                </div>
                <div className="pf-term-row">
                  <span>Mức giảm:</span>
                  <strong style={{ color: '#0284c7' }}>
                    {detailVoucher.type === 'percent'
                      ? `Giảm ${detailVoucher.value || detailVoucher.discount_val || 0}%`
                      : `Giảm ${((detailVoucher.value !== undefined ? detailVoucher.value : detailVoucher.discount_val) || 0).toLocaleString('vi-VN')}đ`}
                  </strong>
                </div>
              </div>
            </div>
            <div className="pf-modal-footer">
              <button type="button" className="pf-btn-cancel" onClick={() => setDetailVoucher(null)}>
                {t('closeModal')}
              </button>
              <button
                type="button"
                className="pf-btn-submit"
                onClick={() => {
                  setSelectedVoucher(detailVoucher);
                  setDetailVoucher(null);
                }}
              >
                <Check size={16} style={{ display: 'inline', marginRight: '4px' }} />
                {language === 'vi' ? `Áp dụng mã ${detailVoucher?.code || detailVoucher?.voucher_code || ''}` : `Apply ${detailVoucher?.code || detailVoucher?.voucher_code || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

SlotSelectionDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  bookingInfo: PropTypes.object,
  userVouchers: PropTypes.array,
  setUserVouchers: PropTypes.func,
  onConfirmBooking: PropTypes.func.isRequired,
  language: PropTypes.string,
  initialVoucher: PropTypes.object
};
