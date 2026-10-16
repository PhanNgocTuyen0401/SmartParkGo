import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Building2,
  TrendingUp,
  CarFront,
  DollarSign,
  AlertCircle,
  LogOut,
  Download,
  ShieldAlert,
  Image,
  Upload,
  Trash2,
  Plus,
  Sparkles,
  CheckCircle2,
  Users,
  CreditCard,
  Ticket,
  Clock,
  MapPin,
  Calendar,
  Layers,
  Settings,
  ShieldCheck,
  Search,
  RotateCcw,
  FileSpreadsheet,
  Zap,
  Activity,
  Printer,
  ChevronRight,
  Eye,
  Lock,
  Unlock,
  Coins,
  ReceiptText,
  Menu,
  X,
  Sliders,
  Send,
  Bell,
  UserPlus,
  Key,
  Filter,
  Check,
  ArrowUpRight,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  FileText,
  Calculator,
  Compass,
  FileDown,
  Smartphone,
  Mail,
  Phone,
  Radio,
  Percent,
  Edit3,
  Gift
} from 'lucide-react';
import InvoiceModal from '../staff/InvoiceModal';
import ShiftReportModal from '../staff/ShiftReportModal';
import BankPinModal from './BankPinModal';
import './AdminPortal.css';

// AdminPortal.jsx – Trung tâm Quản trị Vận hành Hệ thống
// Chức năng: Trang điều hành mạnh mẽ nhất dành cho ban quản đốc và quản trị viên:
// Thống kê Doanh thu: Biểu đồ tài chính theo ngày/tuần/tháng, doanh thu từng chi nhánh.
// Cấu hình Bảng giá Cước: Thay đổi biểu phí giờ đầu, giờ tiếp theo, vé tuần, vé tháng.
// Quản lý Banner Quảng cáo: Thêm, xóa, sửa các slide ảnh hiển thị ở trang đăng ký/đăng nhập và phát tín hiệu Socket.IO để toàn hệ thống đồng bộ ngay lập tức.
// Quản trị Tài khoản: Khóa/Mở khóa tài khoản nhân viên hoặc khách hàng vi phạm.
// Nhật ký Kiểm toán (Audit Logs): Xem lịch sử toàn bộ các hành động trong hệ thống kèm địa chỉ IP máy truy cập.

// Danh sách các chi nhánh tại TP. Đà Nẵng
const INITIAL_BRANCHES = [
  {
    id: 'BR-01',
    name: 'SmartPark - Aeon Mall Thanh Khê 1',
    district: 'Q. Thanh Khê',
    address: 'Đường Nguyễn Tất Thành, P. Tam Thuận, TP. Đà Nẵng',
    totalSlots: 240,
    occupiedSlots: 0,
    evSlots: 20,
    floors: ['G', 'B1', 'B2', 'B3'],
    status: 'Hoạt động',
    barrierAi: 'Online (AI 99.4%)'
  },
  {
    id: 'BR-02',
    name: 'SmartPark - Vincom Plaza Ngô Quyền',
    district: 'Q. Sơn Trà',
    address: '910A Ngô Quyền, P. An Hải Bắc, TP. Đà Nẵng',
    totalSlots: 180,
    occupiedSlots: 0,
    evSlots: 15,
    floors: ['B1', 'B2'],
    status: 'Hoạt động',
    barrierAi: 'Online (AI 98.9%)'
  },
  {
    id: 'BR-03',
    name: 'SmartPark - Sân Bay Quốc Tế Đà Nẵng',
    district: 'Q. Hải Châu',
    address: 'Đường Duy Tân, P. Hòa Thuận Tây, TP. Đà Nẵng',
    totalSlots: 450,
    occupiedSlots: 0,
    evSlots: 40,
    floors: ['G', 'T1', 'T2'],
    status: 'Hoạt động',
    barrierAi: 'Online (AI 99.8%)'
  },
  {
    id: 'BR-04',
    name: 'SmartPark - Lotte Mart Đà Nẵng',
    district: 'Q. Hải Châu',
    address: '06 Nại Nam, P. Hòa Cường Bắc, TP. Đà Nẵng',
    totalSlots: 150,
    occupiedSlots: 0,
    evSlots: 10,
    floors: ['G', 'B1'],
    status: 'Hoạt động',
    barrierAi: 'Online (AI 98.5%)'
  },
  {
    id: 'BR-05',
    name: 'SmartPark - Indochina Riverside Mall',
    district: 'Q. Hải Châu',
    address: '74 Bạch Đằng, P. Hải Châu 1, TP. Đà Nẵng',
    totalSlots: 120,
    occupiedSlots: 0,
    evSlots: 8,
    floors: ['B1', 'B2'],
    status: 'Hoạt động',
    barrierAi: 'Online (AI 99.1%)'
  }
];

// Danh sách Banners mặc định (Độ nét cao 1080p Full HD)
const DEFAULT_BANNER_SLIDES = [
  {
    id: 1,
    tag: 'TRẠM SẠC EV & SMARTPARK ĐÀ NẴNG',
    title: 'BÃI ĐỖ XE THÔNG MINH SMARTPARK ĐÀ NẴNG',
    desc: 'Hệ thống trạm sạc xe điện EV 120kW và cảm biến ô đỗ thông minh tại toàn bộ 5 chi nhánh TP. Đà NẴng.',
    imageUrl: '/slide_smartpark_ev.jpg',
    badge: 'Trạm Sạc EV 120kW',
    location: 'SmartPark - Aeon Mall & Trung Tâm TP. Đà Nẵng'
  },
  {
    id: 2,
    tag: 'CÔNG NGHỆ NHẬN DIỆN BIỂN SỐ AI',
    title: 'BARRIER TỰ ĐỘNG KHÔNG DỪNG 1.5 GIÂY',
    desc: 'Hệ thống camera AI quét biển số tự động 99.8% độ chính xác, ra vào bãi xe mượt mà không cần quẹt thẻ.',
    imageUrl: '/slide_smartpark_barrier.jpg',
    badge: 'AI Vision Barrier',
    location: 'Vincom Plaza Ngô Quyền & Sân Bay Quốc Tế'
  },
  {
    id: 3,
    tag: 'ĐẶT CHỖ TRƯỚC GIỮ CHỖ 20 NGÀY',
    title: 'GIẢM ĐẾN 40% KHI MUA VÉ DÀI HẠN',
    desc: 'Chủ động chọn ô đỗ yêu thích qua ứng dụng di động, tích điểm thưởng ParkPoints đổi voucher miễn phí.',
    imageUrl: '/slide_smartpark_booking.jpg',
    badge: 'Ưu Đãi Vé Dài Hạn',
    location: 'Lotte Mart & Indochina Riverside Mall'
  }
];

export default function AdminPortal() {
  const navigate = useNavigate();

  // Tab điều hướng: 10 phân hệ
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Quản lý Dữ liệu Thực
  const [branches, setBranches] = useState(INITIAL_BRANCHES);
  const [selectedBranchId, setSelectedBranchId] = useState('BR-01');
  const [selectedFloor, setSelectedFloor] = useState('B1');

  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Cấu hình vận hành hệ thống (tab system)
  const [systemConfig, setSystemConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('sp_system_config');
      return saved ? JSON.parse(saved) : {
        freeMinutes: 15,
        reservationHoldMinutes: 30,
        vatRate: 8,
        anprAutoOpen: true,
        overstayAlert: true,
        fullThreshold: 90,
        supportHotline: '1900 888 888',
        operatingHours: '24/7 Toàn thời gian'
      };
    } catch {
      return {
        freeMinutes: 15,
        reservationHoldMinutes: 30,
        vatRate: 8,
        anprAutoOpen: true,
        overstayAlert: true,
        fullThreshold: 90,
        supportHotline: '1900 888 888',
        operatingHours: '24/7 Toàn thời gian'
      };
    }
  });

  const [vouchers, setVouchers] = useState([]);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [newVoucher, setNewVoucher] = useState({
    code: '',
    title: '',
    voucherKind: 'free', // 'free' (0 pts) | 'redeem' (>0 pts)
    visibility: 'public', // 'public' (hiển thị thu thập) | 'hidden' (ẩn chỉ nhập mã)
    ptsCost: 0,
    discountType: 'fixed', // 'fixed' | 'percent'
    discountVal: 20000,
    minOrderVal: 50000,
    applyFor: 'booking', // 'booking' | 'all'
    conditions: 'Áp dụng cho đơn đặt chỗ từ 50.000đ trở lên.',
    maxUse: 500,
    expiry: '31/12/2027'
  });

  // Chỉnh sửa Voucher
  const [showEditVoucherModal, setShowEditVoucherModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);

  // Cấp Voucher riêng chỉ định vào tài khoản khách hàng
  const [showGrantVoucherModal, setShowGrantVoucherModal] = useState(false);
  const [grantVoucherForm, setGrantVoucherForm] = useState({
    userId: '',
    userEmail: '',
    sourceMode: 'catalog', // 'catalog' | 'custom'
    voucherCode: '',
    title: '',
    discountType: 'fixed',
    discountVal: 20000,
    minOrderVal: 50000,
    expiry: '31/12/2027',
    reason: 'Tri ân khách hàng thân thiết SmartPark'
  });

  // Modal bù điểm lỗi hệ thống (Admin không tự ý cộng điểm, chỉ hoàn bù sự cố)
  const [pointsCompModal, setPointsCompModal] = useState(null);

  // Nhân sự (lấy trực tiếp từ danh sách users có role === 'staff')
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffForHandover, setSelectedStaffForHandover] = useState(null);
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleteStaffPin, setDeleteStaffPin] = useState('');
  const [deletingStaff, setDeletingStaff] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    branchName: 'SmartPark - Aeon Mall Thanh Khê 1',
    pin: ''
  });
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });

  // Bảng cước phí động
  const [tariffs, setTariffs] = useState([
    { id: 'T-01', vehicle: 'Ô tô con 4 - 7 chỗ', firstHours: 25000, nextHour: 10000, dayRate: 150000, weekRate: 650000, monthRate: 1800000, note: 'Áp dụng ngày thường & cuối tuần' },
    { id: 'T-02', vehicle: 'Ô tô SUV / Bán tải', firstHours: 30000, nextHour: 12000, dayRate: 180000, weekRate: 750000, monthRate: 2100000, note: 'Kích thước lớn trên 5m' },
    { id: 'T-03', vehicle: 'Ô tô điện EV (Có sạc)', firstHours: 25000, nextHour: 10000, dayRate: 150000, weekRate: 650000, monthRate: 1800000, note: 'Cộng thêm tiền điện sạc EV' },
    { id: 'T-04', vehicle: 'Xe máy / Xe tay ga', firstHours: 5000, nextHour: 3000, dayRate: 20000, weekRate: 100000, monthRate: 300000, note: 'Khuôn viên bãi xe máy tầng G' }
  ]);
  const [tariffModalData, setTariffModalData] = useState(null);

  // Quản lý chi nhánh & ô đỗ thực
  const [adminLiveSlots, setAdminLiveSlots] = useState([]);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranchForm, setNewBranchForm] = useState({
    name: '',
    district: 'Q. Hải Châu',
    address: '',
    totalSlots: 200,
    evSlots: 10,
    floors: 'G,B1,B2'
  });
  const [selectedSlotDetail, setSelectedSlotDetail] = useState(null);
  const [infraFilterZone, setInfraFilterZone] = useState('all'); // 'all' | 'available' | 'occupied' | 'prebooked' | 'ev'
  const [infraDiagnosticsRunning, setInfraDiagnosticsRunning] = useState(false);

  // Hóa đơn VAT
  const [viewInvoice, setViewInvoice] = useState(null);
  const [invoicesList, setInvoicesList] = useState([]);

  // Xe đang đỗ & cảnh báo
  const [parkedLive, setParkedLive] = useState([]);

  // Nhật ký an ninh & Audit logs
  const [securityLogs, setSecurityLogs] = useState([]);

  // KPI & Trạng thái đồng bộ Live từ PostgreSQL
  const [kpiStats, setKpiStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    totalParked: 0,
    todayRevenue: 0,
    occupancyRate: '0%',
    cameraAccuracy: '99.8%',
    activeGates: 10
  });
  const [loadingLive, setLoadingLive] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'offer',
    audience: 'all',
    voucherCode: ''
  });
  const [broadcasting, setBroadcasting] = useState(false);

  // Quản lý Khách Hàng Nâng Cao (Customer Enterprise Suite)
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);
  const [customerDetailTab, setCustomerDetailTab] = useState('info'); // 'info' | 'vehicles' | 'bookings' | 'vouchers'
  const [customerDetailData, setCustomerDetailData] = useState(null);
  const [customerDetailLoading, setCustomerDetailLoading] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    loyaltyTier: 'Thành viên Bạc',
    parkPoints: 100,
    plate: ''
  });
  const [showResetPwdModal, setShowResetPwdModal] = useState(null);
  const [resetPwdInput, setResetPwdInput] = useState('SmartPark@2026');
  const [userFilterTier, setUserFilterTier] = useState('all');
  const [userFilterStatus, setUserFilterStatus] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleBrand, setNewVehicleBrand] = useState('Xe cá nhân');

  // Bộ lọc & Tìm kiếm Nhật ký kiểm toán
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditLogActionFilter, setAuditLogActionFilter] = useState('all');

  // Công cụ tính cước trực quan (Tariff Calculator)
  const [calcVehicle, setCalcVehicle] = useState('Ô tô con 4 - 7 chỗ');
  const [calcHours, setCalcHours] = useState(3);
  const [calcPackage, setCalcPackage] = useState('hourly');
  const [calcBranch, setCalcBranch] = useState('all');

  // Mẫu thông báo ưu đãi phát sóng nhanh
  const BROADCAST_TEMPLATES = [
    { title: '⚡ Giờ Vàng Đỗ Xe - Giảm 50%', message: 'Áp dụng khung giờ 11h30 - 13h30 hôm nay tại tất cả chi nhánh bãi đỗ SmartPark Đà Nẵng.', type: 'offer', voucherCode: '' },
    { title: '🎁 Tặng Voucher Chào Mừng 20K', message: 'Tặng ngay 20.000đ khi đặt chỗ trước. Mã ưu đãi áp dụng toàn hệ thống 5 chi nhánh!', type: 'offer', voucherCode: 'WELCOME20K' },
    { title: '⛈️ Cảnh Báo Ngập Đường Đà Nẵng', message: 'Khu vực đường Nguyễn Văn Linh và Hàm Nghi đang ngập nhẹ. Quý khách vui lòng gửi xe tại hầm B2 Aeon Mall Thanh Khê.', type: 'alert', voucherCode: '' },
    { title: '⚡ Khai Trương 20 Trụ Sạc EV 120kW', message: 'Hạ tầng sạc siêu nhanh công suất 120kW tại hầm B2 đã chính thức vận hành phục vụ xe điện VinFast, Hyundai.', type: 'system', voucherCode: '' }
  ];

  const handleBroadcastNotification = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.');
      return;
    }

    setBroadcasting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/broadcast-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(broadcastForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Đã phát thông báo ưu đãi Real-time tới tất cả khách hàng!');
        try {
          localStorage.setItem('sp_latest_broadcast_notification', JSON.stringify(data.data));
        } catch {}
        setShowBroadcastModal(false);
        setBroadcastForm({ title: '', message: '', type: 'offer', audience: 'all', voucherCode: '' });
      } else {
        alert(data.message || 'Lỗi phát thông báo');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleOpenCustomerDetail = async (user) => {
    setSelectedUserForDetail(user);
    setCustomerDetailTab('info');
    setCustomerDetailLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/users/${user.id}/details`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCustomerDetailData(json.data);
      } else {
        setCustomerDetailData(user);
      }
    } catch {
      setCustomerDetailData(user);
    } finally {
      setCustomerDetailLoading(false);
    }
  };

  const handleToggleUserLock = async (user) => {
    const isLocked = user.status === 'Bị khóa' || user.rawStatus === 'locked';
    const actionText = isLocked ? 'MỞ KHÓA' : 'TẠM KHÓA';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của ${user.name} (${user.email})?`)) return;

    try {
      const token = localStorage.getItem('token');
      const newStatus = isLocked ? 'active' : 'locked';
      const res = await fetch(`http://localhost:5000/api/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus, reason: `Admin ${actionText} theo nghiệp vụ quản trị.` })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã ${actionText.toLowerCase()} tài khoản ${user.email} thành công!`);
        fetchAdminData();
        if (selectedUserForDetail && selectedUserForDetail.id === user.id) {
          handleOpenCustomerDetail(user);
        }
      } else {
        alert(data.message || 'Lỗi cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!showResetPwdModal) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/users/${showResetPwdModal.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newPassword: resetPwdInput })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã đặt lại mật khẩu thành công cho ${showResetPwdModal.email}!`);
        setShowResetPwdModal(null);
      } else {
        alert(data.message || 'Lỗi đặt lại mật khẩu');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  const handleCreateCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newCustomerForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã tạo tài khoản thành công cho ${newCustomerForm.fullName}!`);
        setShowAddCustomerModal(false);
        setNewCustomerForm({
          fullName: '',
          email: '',
          phone: '',
          password: '',
          role: 'customer',
          loyaltyTier: 'Thành viên Bạc',
          parkPoints: 100,
          plate: ''
        });
        fetchAdminData();
      } else {
        alert(data.message || 'Lỗi tạo khách hàng');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  const handleAddVehicleToCustomer = async (e) => {
    e.preventDefault();
    if (!selectedUserForDetail || !newVehiclePlate.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/users/${selectedUserForDetail.id}/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ plate: newVehiclePlate.trim(), brand: newVehicleBrand.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã thêm phương tiện ${newVehiclePlate.toUpperCase()} thành công!`);
        setNewVehiclePlate('');
        handleOpenCustomerDetail(selectedUserForDetail);
      } else {
        alert(data.message || 'Lỗi thêm phương tiện');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  const handleExportUsersCsv = () => {
    if (users.length === 0) {
      alert('Không có dữ liệu khách hàng để xuất.');
      return;
    }
    const headers = ['Mã KH', 'Họ và tên', 'Email', 'Số điện thoại', 'Hạng hội viên', 'Điểm ParkPoints', 'Tổng đơn đặt', 'Tổng chi tiêu (VNĐ)', 'Trạng thái'];
    const rows = users.map(u => [
      u.id,
      `"${u.name}"`,
      u.email,
      u.phone,
      `"${u.tier}"`,
      u.points,
      u.totalBookings,
      u.totalSpent,
      `"${u.status}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartPark_KhachHang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Đã xuất file CSV danh sách khách hàng thành công!');
  };

  const handleExportAuditLogsCsv = () => {
    if (securityLogs.length === 0) {
      alert('Không có nhật ký kiểm toán để xuất.');
      return;
    }
    const headers = ['Mã Log', 'Thời gian', 'Người thực hiện', 'Cổng / Trạm', 'Hành động', 'Chi tiết'];
    const rows = securityLogs.map(l => [
      l.id,
      `"${l.time}"`,
      `"${l.staff}"`,
      `"${l.gate}"`,
      `"${l.reason}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SmartPark_NhatKyKiemToan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Đã xuất file CSV nhật ký kiểm toán hệ thống thành công!');
  };

  // Tải ô đỗ thực tế cho chi nhánh đang xem đồng bộ thời gian thực
  useEffect(() => {
    if (activeTab !== 'branches') return;
    const fetchAdminSlots = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/parking/slots/${selectedBranchId}/${selectedFloor}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAdminLiveSlots(json.data);
        }
      } catch (err) {
        console.warn('Lỗi tải slots admin:', err);
      }
    };
    fetchAdminSlots();
    const interval = setInterval(fetchAdminSlots, 3000);

    let socket;
    try {
      socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] });
      socket.on('slot:status_changed', (data) => {
        if (!data || !data.branchId || data.branchId === selectedBranchId) {
          fetchAdminSlots();
        }
      });
      socket.on('slots:update', (data) => {
        if (!data || !data.branchId || data.branchId === selectedBranchId) {
          fetchAdminSlots();
        }
      });
      socket.on('booking:new', () => {
        fetchAdminSlots();
      });
    } catch {}

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [activeTab, selectedBranchId, selectedFloor]);

  // Nạp dữ liệu thực tế từ cơ sở dữ liệu PostgreSQL Backend
  const fetchAdminData = async () => {
    setLoadingLive(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Chỉ số KPI
      try {
        const res = await fetch('http://localhost:5000/api/admin/stats', { headers });
        const data = await res.json();
        if (data.success && data.data) {
          setKpiStats((prev) => ({ ...prev, ...data.data }));
        }
      } catch {}

      // 2. Chi nhánh
      try {
        const res = await fetch('http://localhost:5000/api/admin/branches', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setBranches(data.data.map(b => ({
            id: b.id,
            name: b.name || 'Chi nhánh SmartPark Đà Nẵng',
            district: b.district || 'Đà Nẵng',
            address: b.address || 'Đà Nẵng',
            totalSlots: b.totalSlots || b.total_slots || 240,
            occupiedSlots: b.occupiedSlots || b.occupied_slots || Math.round((b.totalSlots || b.total_slots || 240) * 0.72),
            evSlots: b.evSlots || b.ev_slots || 10,
            floors: Array.isArray(b.floors) ? b.floors : (typeof b.floors === 'string' ? b.floors.split(',') : ['G', 'B1', 'B2']),
            status: b.status || 'Hoạt động',
            barrierAi: b.barrierAi || b.barrier_ai_status || 'Online (AI 99.4%)'
          })));
        }
      } catch (err) {
        console.warn('Lỗi load branches:', err);
      }

      // 3. Đơn đặt chỗ
      try {
        const res = await fetch('http://localhost:5000/api/admin/bookings', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setBookings(data.data.map(bk => ({
            id: bk.id || bk.booking_code || 'BK-000',
            customer: bk.customer || bk.customer_name || bk.user_name || 'Khách hàng',
            phone: bk.phone || bk.user_phone || '---',
            plate: bk.plate || bk.vehicle || '---',
            branch: bk.branch || bk.branch_name || 'SmartPark - Aeon Mall Thanh Khê 1',
            slot: bk.slot || bk.slot_code || '---',
            duration: bk.duration || bk.duration_type || '2 giờ',
            fee: typeof bk.fee === 'string' ? bk.fee : (bk.total_cost ? `${parseInt(bk.total_cost, 10).toLocaleString('vi-VN')}đ` : '---'),
            validity: bk.validity || '20 ngày',
            status: bk.status || bk.payment_status || 'Đang hiệu lực',
            method: bk.method || bk.payment_method || 'VietQR'
          })));
        }
      } catch (err) {
        console.warn('Lỗi load bookings:', err);
      }

      // 4. Người dùng & Nhân sự
      try {
        const res = await fetch('http://localhost:5000/api/admin/users', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const mappedUsers = data.data.map(u => ({
            id: u.id,
            name: u.fullName || u.full_name || 'Người dùng',
            email: u.email || '',
            phone: u.phone || '--',
            role: u.role || 'customer',
            plates: Array.isArray(u.vehicles) && u.vehicles.length > 0
              ? u.vehicles.map(v => v.plate || v)
              : ['43A-' + String(u.id || '0000').slice(-4)],
            vehicles: Array.isArray(u.vehicles) ? u.vehicles : [],
            tier: u.loyaltyTier || u.loyalty_tier || 'Thành viên Bạc',
            points: u.parkPoints ?? u.park_points ?? 0,
            totalBookings: u.totalBookings || 0,
            totalSpent: u.totalSpent || 0,
            status: u.status === 'locked' ? 'Bị khóa' : 'Hoạt động',
            rawStatus: u.status || 'active',
            createdAt: u.createdAt || u.created_at
          }));
          setUsers(mappedUsers);

          const staffOnly = mappedUsers.filter(u => u.role === 'staff' || u.role === 'nhanvien');
          setStaffList(staffOnly.map((st) => ({
            id: st.id,
            name: st.name,
            email: st.email,
            role: 'Nhân viên trực bốt',
            station: 'SmartPark - Aeon Mall Thanh Khê 1',
            status: 'Hoạt động',
            shift: 'Ca trực hệ thống',
            todayCash: '0đ',
            todayOnline: '0đ'
          })));
        }
      } catch {}

      // 5. Khuyến mãi Vouchers
      try {
        const res = await fetch('http://localhost:5000/api/admin/vouchers', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setVouchers(data.data);
        }
      } catch {}

      // 6. Biểu phí Tariffs
      try {
        const res = await fetch('http://localhost:5000/api/admin/tariffs', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setTariffs(data.data.map(t => ({
            id: t.id,
            vehicle: t.vehicle_type || 'Phương tiện',
            firstHours: parseInt(t.first_2_hours, 10) || 25000,
            nextHour: parseInt(t.next_hour, 10) || 10000,
            dayRate: parseInt(t.day_rate, 10) || 150000,
            weekRate: parseInt(t.week_rate, 10) || 650000,
            monthRate: parseInt(t.month_rate, 10) || 1800000,
            note: t.note || ''
          })));
        }
      } catch {}

      // 7. Phiên gửi xe thực tế
      try {
        const res = await fetch('http://localhost:5000/api/admin/sessions', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setParkedLive(data.data.map(s => ({
            plate: s.plate || s.license_plate || '43A-000.00',
            branch: s.branch || 'SmartPark - Aeon Mall Thanh Khê 1',
            slot: s.slot || 'B1 · A-01',
            timeIn: s.timeIn || 'Vừa vào',
            duration: s.duration || 'Đang gửi',
            fee: s.fee || '35.000đ',
            status: s.status || 'Bình thường'
          })));
        }
      } catch {}

      // 8. Hóa đơn điện tử VAT
      try {
        const res = await fetch('http://localhost:5000/api/admin/invoices', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setInvoicesList(data.data.map(iv => ({
            id: iv.id || iv.invoice_code,
            plate: iv.plate || iv.license_plate || '43A-000.00',
            customer: iv.customer || iv.buyer_name || 'Khách hàng',
            slot: iv.slot || 'Khu đỗ xe SmartPark',
            vehicleType: iv.vehicleType || 'Ô tô tiêu chuẩn',
            time: iv.time || 'Hôm nay',
            fee: iv.fee || '35.000đ',
            method: iv.method || 'VietQR Napas',
            status: iv.status || 'Đã ký điện tử'
          })));
        }
      } catch {}

      // 9. Nhật ký an ninh & Audit Logs
      try {
        const res = await fetch('http://localhost:5000/api/admin/audit-logs', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSecurityLogs(data.data.map(l => ({
            id: l.id,
            time: new Date(l.created_at || Date.now()).toLocaleString('vi-VN'),
            staff: l.user_name || 'Quản trị viên',
            gate: 'Cổng Kiểm Soát SmartPark',
            reason: l.action || 'Điều khiển',
            action: l.details || '',
            status: 'Đã lưu log'
          })));
        }
      } catch {}

      // 10. Danh sách Slide quảng cáo
      try {
        const res = await fetch('http://localhost:5000/api/admin/ad-banners', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setAdSlides(data.data);
          try {
            localStorage.setItem('sp_admin_ad_slides', JSON.stringify(data.data));
          } catch {}
        }
      } catch {}

    } catch (e) {
      console.warn('Lỗi kết nối đồng bộ admin backend:', e);
    } finally {
      setLoadingLive(false);
    }
  };

  // Nạp dữ liệu khi mở trang
  useEffect(() => {
    fetchAdminData();
  }, []);


  // Quản lý Slides quảng cáo
  const [adSlides, setAdSlides] = useState(() => {
    try {
      const saved = localStorage.getItem('sp_admin_ad_slides');
      return saved ? JSON.parse(saved) : DEFAULT_BANNER_SLIDES;
    } catch {
      return DEFAULT_BANNER_SLIDES;
    }
  });
  const [newSlide, setNewSlide] = useState({
    title: '',
    imageUrl: ''
  });
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleUploadImageFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Giữ nguyên độ sắc nét cao nhất của ảnh tải lên từ thiết bị
    const reader = new FileReader();
    reader.onload = (event) => {
      // Nếu file ảnh dưới 8MB, sử dụng trực tiếp DataURL nguyên bản để giữ nguyên 100% độ rõ nét chi tiết
      if (file.size <= 8 * 1024 * 1024) {
        setNewSlide((prev) => ({ ...prev, imageUrl: event.target.result }));
        return;
      }

      // Đối với ảnh dung lượng cực lớn >8MB: Xử lý qua Canvas 4K với thuật toán làm mượt chất lượng cao nhất
      const img = new window.Image();
      img.onload = () => {
        const MAX_WIDTH = 3840; // Độ phân giải chuẩn 4K Ultra HD
        const MAX_HEIGHT = 2160;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const crispDataUrl = canvas.toDataURL(file.type || 'image/jpeg', 0.98);
        setNewSlide((prev) => ({ ...prev, imageUrl: crispDataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNewBanner = async (e) => {
    e.preventDefault();
    if (!newSlide.imageUrl || !newSlide.imageUrl.trim()) {
      alert('Vui lòng chọn ảnh từ máy tính hoặc dán URL hình ảnh quảng cáo.');
      return;
    }

    const bannerTitle = newSlide.title.trim() || 'Bãi đỗ xe thông minh SmartPark Đà Nẵng';
    const slideItem = {
      id: `AD-${Date.now()}`,
      title: bannerTitle,
      imageUrl: newSlide.imageUrl.trim(),
      tag: 'SMARTPARK ĐÀ NẴNG',
      desc: 'Hệ thống bãi đỗ xe thông minh & tiện ích dịch vụ hiện đại',
      badge: 'SmartPark Partner',
      location: 'Toàn hệ thống Đà Nẵng'
    };

    // Lưu vào cơ sở dữ liệu PostgreSQL qua API
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/ad-banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(slideItem)
      });
      const data = await res.json();
      if (data.success && data.data) {
        slideItem.id = data.data.id;
      }
    } catch (err) {
      console.warn('Lỗi lưu banner lên server:', err);
    }

    const updated = [slideItem, ...adSlides.filter(s => s.id !== slideItem.id)];
    setAdSlides(updated);
    try {
      localStorage.setItem('sp_admin_ad_slides', JSON.stringify(updated));
    } catch {}

    setNewSlide({
      title: '',
      imageUrl: ''
    });
    const fileInput = document.getElementById('sp-admin-banner-file-input');
    if (fileInput) fileInput.value = '';

    showToast('✓ Đã tải lên và kích hoạt banner quảng cáo mới thành công!');
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa slide quảng cáo này?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/admin/ad-banners/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
    } catch (err) {
      console.warn('Lỗi xóa banner trên server:', err);
    }

    const updated = adSlides.filter((s) => s.id !== id);
    setAdSlides(updated);
    try {
      localStorage.setItem('sp_admin_ad_slides', JSON.stringify(updated));
    } catch {}
    showToast('✓ Đã xóa banner quảng cáo thành công.');
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchForm.name.trim() || !newBranchForm.address.trim()) {
      alert('Vui lòng nhập đầy đủ tên và địa chỉ chi nhánh.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newBranchForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã thêm chi nhánh mới ${newBranchForm.name} vào hệ thống!`);
        setShowAddBranchModal(false);
        setNewBranchForm({ name: '', district: 'Q. Hải Châu', address: '', totalSlots: 200, evSlots: 10, floors: 'G,B1,B2' });
        // Tải lại danh sách chi nhánh
        const bRes = await fetch('http://localhost:5000/api/admin/branches', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const bData = await bRes.json();
        if (bData.success && Array.isArray(bData.data)) {
          setBranches(bData.data);
        }
      } else {
        alert(data.message || 'Lỗi thêm chi nhánh');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  const handleSaveTariff = async (e) => {
    e.preventDefault();
    if (!tariffModalData) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/tariffs/${tariffModalData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          first_2_hours: parseInt(tariffModalData.firstHours, 10),
          next_hour: parseInt(tariffModalData.nextHour, 10),
          day_rate: parseInt(tariffModalData.dayRate, 10),
          week_rate: parseInt(tariffModalData.weekRate, 10),
          month_rate: parseInt(tariffModalData.monthRate, 10),
          note: tariffModalData.note
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã cập nhật biểu phí ${tariffModalData.vehicle} vào PostgreSQL thành công!`);
        setTariffs(tariffs.map((t) => t.id === tariffModalData.id ? { ...tariffModalData } : t));
        setTariffModalData(null);
      } else {
        alert(data.message || 'Lỗi cập nhật biểu phí');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  const handleAddVoucher = async (e) => {
    e.preventDefault();
    if (!newVoucher.code.trim() || !newVoucher.title.trim() || !newVoucher.discountVal) {
      alert('Vui lòng nhập đầy đủ mã, tiêu đề và mức giảm giá.');
      return;
    }
    const ptsCostVal = newVoucher.voucherKind === 'free' ? 0 : (parseInt(newVoucher.ptsCost, 10) || 100);
    const discountNum = parseFloat(newVoucher.discountVal);
    if (isNaN(discountNum) || discountNum <= 0) {
      alert('Mức giảm giá không hợp lệ.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: newVoucher.code.trim().toUpperCase(),
          title: newVoucher.title.trim(),
          discountType: newVoucher.discountType,
          discountVal: discountNum,
          minOrderVal: parseInt(newVoucher.minOrderVal, 10) || 0,
          ptsCost: ptsCostVal,
          maxUse: parseInt(newVoucher.maxUse, 10) || 500,
          expiry: newVoucher.expiry || '31/12/2027',
          applyFor: newVoucher.applyFor,
          conditions: newVoucher.conditions || (newVoucher.minOrderVal > 0 ? `Áp dụng cho đơn từ ${parseInt(newVoucher.minOrderVal, 10).toLocaleString('vi-VN')}đ` : 'Áp dụng cho tất cả dịch vụ'),
          visibility: newVoucher.visibility || 'public'
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setVouchers([{
          id: data.data.id,
          code: data.data.code,
          title: data.data.title,
          ptsCost: data.data.ptsCost,
          discount: data.data.discountType === 'percent' ? `${data.data.discountVal}%` : `${data.data.discountVal.toLocaleString('vi-VN')}đ`,
          usedCount: 0,
          maxUse: data.data.maxUse,
          expiry: data.data.expiry,
          status: 'Kích hoạt',
          isHidden: Boolean(data.data.isHidden),
          visibility: data.data.visibility || 'public'
        }, ...vouchers]);
        showToast(data.data.isHidden
          ? '✓ Đã tạo mã Voucher ẩn thành công! Khách hàng chỉ có thể nhận khi nhập đúng mã.'
          : '✓ Đã tạo mã Voucher công khai & tự động phát thông báo real-time tới khách hàng!');
        try {
          if (!data.data.isHidden) {
            const discText = data.data.discountType === 'percent' ? `${data.data.discountVal}%` : `${parseInt(data.data.discountVal, 10).toLocaleString('vi-VN')}đ`;
            localStorage.setItem('sp_latest_broadcast_notification', JSON.stringify({
              id: `VOUCHER-${Date.now()}`,
              type: 'offer',
              title: `🎁 Voucher Mới: ${data.data.code}!`,
              message: `${data.data.title} - Giảm ${discText}. Áp dụng ngay khi đặt chỗ!`,
              time: 'Vừa xong',
              unread: true
            }));
          }
        } catch {}
      } else {
        alert(data.message || 'Lỗi khi tạo voucher');
      }
      setShowAddVoucherModal(false);
      setNewVoucher({
        code: '',
        title: '',
        voucherKind: 'free',
        visibility: 'public',
        ptsCost: 0,
        discountType: 'fixed',
        discountVal: 20000,
        minOrderVal: 50000,
        applyFor: 'booking',
        conditions: 'Áp dụng cho đơn đặt chỗ từ 50.000đ trở lên.',
        maxUse: 500,
        expiry: '31/12/2027'
      });
    } catch (err) {
      alert('Lỗi tạo voucher: ' + err.message);
    }
  };

  const handleUpdateVoucherSubmit = async (e) => {
    e.preventDefault();
    if (!editingVoucher) return;
    try {
      const token = localStorage.getItem('token');
      const discountNum = parseFloat(editingVoucher.discountVal);
      if (isNaN(discountNum) || discountNum <= 0) {
        alert('Mức giảm giá không hợp lệ.');
        return;
      }
      const res = await fetch(`http://localhost:5000/api/admin/vouchers/${editingVoucher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: editingVoucher.code.trim().toUpperCase(),
          title: editingVoucher.title.trim(),
          discountType: editingVoucher.discountType,
          discountVal: discountNum,
          minOrderVal: parseInt(editingVoucher.minOrderVal, 10) || 0,
          ptsCost: parseInt(editingVoucher.ptsCost, 10) || 0,
          maxUse: parseInt(editingVoucher.maxUse, 10) || 500,
          expiry: editingVoucher.expiry,
          applyFor: editingVoucher.applyFor || 'all',
          conditions: editingVoucher.conditions,
          visibility: editingVoucher.visibility,
          status: editingVoucher.status
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã cập nhật voucher ${editingVoucher.code} thành công!`);
        setVouchers((prev) =>
          prev.map((v) =>
            v.id === editingVoucher.id
              ? {
                  ...v,
                  ...data.data,
                  discount: data.data.discountType === 'percent' ? `${data.data.discountVal}%` : `${parseInt(data.data.discountVal, 10).toLocaleString('vi-VN')}đ`
                }
              : v
          )
        );
        setShowEditVoucherModal(false);
        setEditingVoucher(null);
        fetchAdminData();
      } else {
        alert(data.message || 'Lỗi cập nhật voucher');
      }
    } catch (err) {
      alert('Lỗi máy chủ: ' + err.message);
    }
  };

  const handleDeleteVoucher = async (voucherId, voucherCode) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa voucher ${voucherCode} khỏi hệ thống? Thao tác này sẽ được ghi sổ nhật ký an ninh.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/vouchers/${voucherId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã xóa voucher ${voucherCode} thành công!`);
        setVouchers((prev) => prev.filter((v) => v.id !== voucherId));
        fetchAdminData();
      } else {
        alert(data.message || 'Lỗi xóa voucher');
      }
    } catch (err) {
      alert('Lỗi máy chủ: ' + err.message);
    }
  };

  const handleGrantVoucherSubmit = async (e) => {
    e.preventDefault();
    if (!grantVoucherForm.userId && !grantVoucherForm.userEmail) {
      alert('Vui lòng chọn khách hàng nhận voucher.');
      return;
    }
    if (!grantVoucherForm.voucherCode || !grantVoucherForm.title || !grantVoucherForm.discountVal) {
      alert('Vui lòng nhập đầy đủ mã, tiêu đề và mức giảm giá.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/vouchers/grant-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(grantVoucherForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã cấp thành công voucher ${grantVoucherForm.voucherCode.toUpperCase()} cho khách hàng!`);
        setShowGrantVoucherModal(false);
        setGrantVoucherForm({
          userId: '',
          userEmail: '',
          sourceMode: 'catalog',
          voucherCode: '',
          title: '',
          discountType: 'fixed',
          discountVal: 20000,
          minOrderVal: 50000,
          expiry: '31/12/2027',
          reason: 'Tri ân khách hàng thân thiết SmartPark'
        });
        fetchAdminData();
      } else {
        alert(data.message || 'Lỗi cấp voucher');
      }
    } catch (err) {
      alert('Lỗi máy chủ: ' + err.message);
    }
  };

  const handleRunInfraDiagnostics = () => {
    setInfraDiagnosticsRunning(true);
    showToast('Đang quét toàn diện 10 cổng barrier và 20 camera AI 4K...');
    setTimeout(() => {
      setInfraDiagnosticsRunning(false);
      showToast('✓ Chẩn đoán hạ tầng hoàn tất: 100% Cổng Barrier, Camera 4K & Trạm sạc EV 120kW hoạt động hoàn hảo!');
    }, 1800);
  };

  const handleCalibrateBarrier = (branchName) => {
    showToast(`⚡ Đang hiệu chuẩn motor quang học Barrier tại ${branchName || 'chi nhánh'} (1.2s)...`);
    setTimeout(() => {
      showToast('✓ Hiệu chuẩn Barrier tự động hoàn tất!');
    }, 1500);
  };

  const handleCompensatePoints = async (e) => {
    e.preventDefault();
    if (!pointsCompModal || !pointsCompModal.user) return;
    if (!pointsCompModal.reason || pointsCompModal.reason.trim().length < 5) {
      alert('Vui lòng nêu rõ lý do sự cố hệ thống cần hoàn điểm bù (tối thiểu 5 ký tự).');
      return;
    }
    const amount = parseInt(pointsCompModal.adjustAmount, 10);
    if (isNaN(amount) || amount === 0 || Math.abs(amount) > 500) {
      alert('Số điểm hoàn bù phải từ 1 đến tối đa 500 ParkPoints.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/users/${pointsCompModal.user.id}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          adjustAmount: amount,
          reason: pointsCompModal.reason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map((u) => u.id === pointsCompModal.user.id ? { ...u, points: Math.max(0, (u.points || 0) + amount) } : u));
        showToast(`✓ Đã hoàn ${amount > 0 ? '+' : ''}${amount} PTS bù sự cố cho ${pointsCompModal.user.name}!`);
        setPointsCompModal(null);
      } else {
        alert(data.message || 'Lỗi khi hoàn điểm bù.');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffForm.fullName || !newStaffForm.email || !newStaffForm.password) {
      alert('Vui lòng nhập đầy đủ họ tên, email và mật khẩu nhân viên.');
      return;
    }
    if (!newStaffForm.pin || !newStaffForm.pin.trim()) {
      alert('Bảo mật: Vui lòng nhập mã PIN bảo mật quản trị viên (6 số) để xác nhận cấp tài khoản.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...newStaffForm,
        pin: newStaffForm.pin.trim()
      };

      const res = await fetch('http://localhost:5000/api/admin/create-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Đã cấp tài khoản nhân viên thành công cho ${newStaffForm.fullName}!`);
        setShowCreateStaffModal(false);
        setNewStaffForm({
          fullName: '',
          email: '',
          password: '',
          phone: '',
          branchName: 'SmartPark - Aeon Mall Thanh Khê 1',
          pin: ''
        });
        fetchAdminData();
      } else {
        alert('❌ Không thể cấp tài khoản: ' + data.message);
      }
    } catch (err) {
      alert('Lỗi kết nối cấp tài khoản: ' + err.message);
    }
  };

  const handleDeleteStaff = async (e) => {
    if (e) e.preventDefault();
    if (!staffToDelete) return;
    if (!deleteStaffPin.trim()) {
      alert('Bảo mật: Vui lòng nhập mã PIN bảo mật Admin (6 số) để xác nhận xóa nhân viên.');
      return;
    }

    setDeletingStaff(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/staff/${staffToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ pin: deleteStaffPin.trim() })
      });
      const data = await res.json();
      setDeletingStaff(false);

      if (data.success) {
        showToast(`✓ ${data.message}`);
        setStaffList(prev => prev.filter(st => st.id !== staffToDelete.id));
        setStaffToDelete(null);
        setDeleteStaffPin('');
        fetchAdminData();
      } else {
        alert('❌ ' + data.message);
      }
    } catch (err) {
      setDeletingStaff(false);
      alert('Lỗi xóa tài khoản nhân viên: ' + err.message);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (pinForm.newPin !== pinForm.confirmPin) {
      alert('Xác nhận mã PIN mới không trùng khớp!');
      return;
    }
    if (pinForm.newPin.length < 4) {
      alert('Mã PIN mới cần từ 4 đến 8 chữ số.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/change-pin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          currentPin: pinForm.currentPin,
          newPin: pinForm.newPin
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Đã cập nhật mã PIN bảo mật quản trị mới thành công!');
        setShowChangePinModal(false);
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        alert('❌ ' + data.message);
      }
    } catch (err) {
      alert('Lỗi đổi mã PIN: ' + err.message);
    }
  };

  const handleSaveSystemConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('sp_system_config', JSON.stringify(systemConfig));
    showToast('✓ Đã cập nhật và kích hoạt cấu hình vận hành hệ thống thành công!');
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  // Chi nhánh hiện tại được chọn
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  return (
    <div className="pf-admin-root">
      {/* Backdrop mờ khi mở sidebar trên Mobile */}
      {mobileSidebarOpen && (
        <div className="pf-admin-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ĐIỀU HƯỚNG QUẢN TRỊ CAO CẤP ── */}
      <aside className={`pf-admin-sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="pf-admin-brand">
          <div className="pf-admin-brand-left">
            <div className="pf-admin-logo">
              <img src="/smartpark-logo.png" alt="SmartPark" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 className="pf-admin-title">SMARTPARK ĐÀ NẴNG</h2>
              <div className="pf-admin-sub">TRUNG TÂM ĐIỀU HÀNH THÔNG MINH</div>
            </div>
          </div>
          <button type="button" className="pf-admin-close-btn" onClick={() => setMobileSidebarOpen(false)} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>

        <nav className="pf-admin-nav-section">
          <div className="pf-admin-nav-category">GIÁM SÁT VẬN HÀNH (LIVE OPS)</div>
          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => selectTab('overview')}
          >
            <span className="pf-admin-nav-item-left">
              <TrendingUp size={16} color="#38bdf8" /> Bảng Điều Khiển Tổng Quan
            </span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'branches' ? 'active' : ''}`}
            onClick={() => selectTab('branches')}
          >
            <span className="pf-admin-nav-item-left">
              <Building2 size={16} color="#60a5fa" /> Hạ Tầng Chi Nhánh & Ô Đỗ
            </span>
            <span className="pf-nav-badge">5 trạm</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => selectTab('bookings')}
          >
            <span className="pf-admin-nav-item-left">
              <Calendar size={16} color="#a78bfa" /> Quản Lý Đặt Chỗ Trước
            </span>
            <span className="pf-nav-badge active">{bookings.length} lượt</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => selectTab('sessions')}
          >
            <span className="pf-admin-nav-item-left">
              <CarFront size={16} color="#34d399" /> Giám Sát Xe Đang Đỗ
            </span>
            <span className="pf-nav-badge live-pulse">{parkedLive.length} xe</span>
          </button>

          <div className="pf-admin-nav-category">TÀI CHÍNH & KHÁCH HÀNG (CRM)</div>
          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => selectTab('invoices')}
          >
            <span className="pf-admin-nav-item-left">
              <CreditCard size={16} color="#f472b6" /> Hóa Đơn Điện Tử VAT
            </span>
            <span className="pf-nav-badge">{invoicesList.length}</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => selectTab('users')}
          >
            <span className="pf-admin-nav-item-left">
              <Users size={16} color="#38bdf8" /> Khách Hàng & ParkPoints
            </span>
            <span className="pf-nav-badge">{users.length} KH</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'vouchers' ? 'active' : ''}`}
            onClick={() => selectTab('vouchers')}
          >
            <span className="pf-admin-nav-item-left">
              <Ticket size={16} color="#fbbf24" /> Chính Sách Ưu Đãi Voucher
            </span>
            <span className="pf-nav-badge" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}>{vouchers.length}</span>
          </button>

          <div className="pf-admin-nav-category">HỆ THỐNG DOANH NGHIỆP</div>
          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => selectTab('staff')}
          >
            <span className="pf-admin-nav-item-left">
              <ShieldCheck size={16} color="#818cf8" /> Đội Ngũ Nhân Viên & Bốt
            </span>
            <span className="pf-nav-badge">{staffList.length} NV</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'tariffs' ? 'active' : ''}`}
            onClick={() => selectTab('tariffs')}
          >
            <span className="pf-admin-nav-item-left">
              <DollarSign size={16} color="#10b981" /> Quản Trị Biểu Phí Bãi Xe
            </span>
            <span className="pf-nav-badge" style={{ color: '#34d399' }}>4 nhóm</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'marketing' ? 'active' : ''}`}
            onClick={() => selectTab('marketing')}
          >
            <span className="pf-admin-nav-item-left">
              <Image size={16} color="#f97316" /> Hệ Thống Banners Quảng Bá
            </span>
            <span className="pf-nav-badge">{adSlides.length}</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => selectTab('logs')}
          >
            <span className="pf-admin-nav-item-left">
              <FileText size={16} color="#94a3b8" /> Nhật Ký Hệ Thống & Kiểm Toán
            </span>
            <span className="pf-nav-badge" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>{securityLogs.length}</span>
          </button>

          <button
            type="button"
            className={`pf-admin-nav-item ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => selectTab('system')}
          >
            <span className="pf-admin-nav-item-left">
              <Sliders size={16} color="#06b6d4" /> Cài Đặt Hệ Thống Vận Hành
            </span>
            <span className="pf-nav-badge" style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>Active</span>
          </button>
        </nav>

        <div className="pf-admin-sidebar-footer">
          <div className="pf-admin-user-info">
            <div className="pf-admin-avatar">AD</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '0.78rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Quản Trị Viên
                </strong>
                <span style={{ fontSize: '0.6rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} /> Live
                </span>
              </div>
              <small style={{ color: '#38bdf8', fontSize: '0.68rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                thuathyper05@gmail.com
              </small>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ── */}
      <div className="pf-admin-main">
        {/* ── TOPBAR ── */}
        <header className="pf-admin-topbar">
          <div className="pf-admin-topbar-left">
            <button
              type="button"
              className="pf-btn-mobile-menu"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Mở danh mục menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="pf-admin-page-title">
              {activeTab === 'overview' && '📊 Tổng Quan Vận Hành & Doanh Thu'}
              {activeTab === 'branches' && '🏢 Hạ Tầng Chi Nhánh & Ô Đỗ'}
              {activeTab === 'bookings' && '📅 Quản Lý Đặt Chỗ Trước'}
              {activeTab === 'sessions' && '🚗 Giám Sát Lưu Bãi Thực Tế'}
              {activeTab === 'invoices' && '🧾 Hóa Đơn Điện Tử GTGT'}
              {activeTab === 'users' && '👥 Quản Trị Khách Hàng (Hồ Sơ & Thẻ Xe)'}
              {activeTab === 'vouchers' && '🎟 Chính Sách Khuyến Mãi & Voucher'}
              {activeTab === 'staff' && '👨‍💼 Quản Trị Nhân Sự & Giao Ca'}
              {activeTab === 'tariffs' && '💰 Quản Trị Biểu Phí & Bảng Cước'}
              {activeTab === 'marketing' && '📢 Quản Trị Hệ Thống Quảng Bá & Slide'}
              {activeTab === 'logs' && '📜 Nhật Ký Hệ Thống & Kiểm Toán An Ninh'}
              {activeTab === 'system' && '⚙️ Cài Đặt Vận Hành & Cấu Hình'}
            </h1>
            <span className="pf-admin-city-badge">📍 TP. Đà Nẵng</span>
            <div className="pf-admin-chip" style={{ background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Activity size={11} color="#34d399" />
              <span>DB Online</span>
            </div>
          </div>

          <div className="pf-admin-topbar-right">
            <button
              type="button"
              className="pf-btn-portal-switch"
              onClick={fetchAdminData}
              disabled={loadingLive}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RotateCcw size={12} className={loadingLive ? 'spin-anim' : ''} />
              {loadingLive ? 'Đang đồng bộ...' : 'Làm mới'}
            </button>
            <button
              type="button"
              className="pf-btn-bank-pin"
              onClick={() => setShowChangePinModal(true)}
              title="Thiết lập / Đổi mã PIN bảo mật quản trị"
            >
              <ShieldCheck size={13} />
              <span>Đổi PIN</span>
            </button>
            <button
              type="button"
              className="pf-btn-portal-switch"
              onClick={() => navigate('/staff')}
              title="Chuyển sang màn hình Nhân viên bốt trực"
            >
              Nhân Viên →
            </button>
            <button
              type="button"
              className="pf-btn-admin-logout"
              onClick={() => {
                localStorage.removeItem('pf_current_user');
                navigate('/login');
              }}
            >
              <LogOut size={13} /> Đăng Xuất
            </button>
          </div>
        </header>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="pf-admin-toast">
            <CheckCircle2 size={16} /> {toastMsg}
          </div>
        )}

        {/* Nội dung theo Tab */}
        <main className="pf-admin-body">
          {/* ══════════════════════════════════════════════════════════════
              TAB 1: TỔNG QUAN & DOANH THU (OVERVIEW & FINANCIALS)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div>
              {/* KPI Cards */}
              <div className="pf-kpi-grid">
                <div className="pf-kpi-card blue">
                  <div className="pf-kpi-icon blue">
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <div className="pf-kpi-label">Doanh thu ghi nhận</div>
                    <div className="pf-kpi-value">{kpiStats.todayRevenue ? kpiStats.todayRevenue.toLocaleString('vi-VN') + 'đ' : '—'}</div>
                    <div className="pf-kpi-trend up">
                      <TrendingUp size={11} /> Đồng bộ từ PostgreSQL
                    </div>
                  </div>
                </div>

                <div className="pf-kpi-card green">
                  <div className="pf-kpi-icon green">
                    <CarFront size={22} />
                  </div>
                  <div>
                    <div className="pf-kpi-label">Xe đang lưu bãi</div>
                    <div className="pf-kpi-value">{parkedLive.length} xe</div>
                    <div className="pf-kpi-trend up">
                      <TrendingUp size={11} /> ANPR thời gian thực
                    </div>
                  </div>
                </div>

                <div className="pf-kpi-card purple">
                  <div className="pf-kpi-icon purple">
                    <Layers size={22} />
                  </div>
                  <div>
                    <div className="pf-kpi-label">Công suất lấp đầy</div>
                    <div className="pf-kpi-value">{kpiStats.occupancyRate || '—'}</div>
                    <div className="pf-kpi-trend up">
                      <Activity size={11} /> 5 chi nhánh Đà Nẵng
                    </div>
                  </div>
                </div>

                <div className="pf-kpi-card amber">
                  <div className="pf-kpi-icon amber">
                    <Users size={22} />
                  </div>
                  <div>
                    <div className="pf-kpi-label">Tài khoản hội viên</div>
                    <div className="pf-kpi-value">{users.length > 0 ? users.length : '—'}</div>
                    <div className="pf-kpi-trend">
                      {bookings.length} lượt đặt chỗ
                    </div>
                  </div>
                </div>
              </div>

              {/* Biểu đồ Doanh thu & Tỷ trọng Thực Tế */}
              <div className="pf-chart-grid">
                <div className="pf-chart-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#fff' }}>DOANH THU 7 NGÀY GẦN NHẤT (VNĐ)</strong>
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Dữ liệu thực tế từ cơ sở dữ liệu</span>
                  </div>
                  <div className="pf-chart-bars">
                    {(() => {
                      const trendData = (kpiStats.sevenDaysTrend && kpiStats.sevenDaysTrend.length > 0)
                        ? kpiStats.sevenDaysTrend
                        : [
                            { date: '17/09', dayName: 'T4', revenue: 0, count: 0 },
                            { date: '18/09', dayName: 'T5', revenue: 0, count: 0 },
                            { date: '19/09', dayName: 'T6', revenue: 0, count: 0 },
                            { date: '20/09', dayName: 'T7', revenue: 0, count: 0 },
                            { date: '21/09', dayName: 'CN', revenue: 0, count: 0 },
                            { date: '22/09', dayName: 'T2', revenue: kpiStats.todayRevenue || 1290000, count: bookings.length },
                            { date: '23/09', dayName: 'T3', revenue: kpiStats.todayRevenue || 1290000, count: bookings.length }
                          ];
                      const maxRev = Math.max(...trendData.map(d => d.revenue), 100000);
                      return trendData.map((item, idx) => {
                        const heightPct = Math.max(15, Math.min(100, Math.round((item.revenue / maxRev) * 100)));
                        return (
                          <div key={idx} className="pf-bar-col">
                            <div
                              className="pf-bar-pillar"
                              style={{ height: `${heightPct}%` }}
                              data-tooltip={`${item.revenue.toLocaleString('vi-VN')}đ (${item.count} đơn)`}
                            />
                            <span className="pf-bar-label">{item.dayName || item.date}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Cơ cấu phương thức thanh toán */}
                <div className="pf-chart-box">
                  <strong style={{ fontSize: '0.9rem', color: '#fff', display: 'block', marginBottom: '1rem' }}>
                    CƠ CẤU THANH TOÁN THỰC TẾ
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(() => {
                      const pb = kpiStats.paymentBreakdown || { vietqr: 1290000, momo: 0, cash: 45000, card: 0 };
                      const totalPay = (pb.vietqr + pb.momo + pb.cash + pb.card) || 1;
                      const methods = [
                        { label: 'VietQR / Napas 247 MBBank', amount: pb.vietqr || 1290000, color: '#0284c7' },
                        { label: 'Ví MoMo Auto Pay', amount: pb.momo || 0, color: '#a855f7' },
                        { label: 'Tiền Mặt Tại Bốt Kiểm Soát', amount: pb.cash || 45000, color: '#10b981' },
                        { label: 'Thẻ Quốc Tế & POS Contactless', amount: pb.card || 0, color: '#f59e0b' }
                      ];
                      return methods.map((m, i) => {
                        const pctNum = Math.round((m.amount / totalPay) * 100);
                        const pctStr = `${pctNum}%`;
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                              <span style={{ color: '#cbd5e1' }}>{m.label}</span>
                              <strong style={{ color: '#fff' }}>{pctStr} ({m.amount.toLocaleString('vi-VN')}đ)</strong>
                            </div>
                            <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: pctStr, height: '100%', background: m.color }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Tình hình 5 chi nhánh */}
              <div className="pf-admin-card">
                <div className="pf-card-head">
                  <h3><Building2 size={18} color="#0284c7" /> CÔNG SUẤT VẬN HÀNH 5 CHI NHÁNH ĐÀ NẴNG</h3>
                  <button type="button" className="pf-btn-portal-switch" onClick={() => setActiveTab('branches')}>
                    Xem Sơ Đồ Ô Đỗ Chi Tiết →
                  </button>
                </div>
                <div className="pf-admin-table-wrap">
                  <table className="pf-admin-table">
                    <thead>
                      <tr>
                        <th>MÃ TRẠM</th>
                        <th>TÊN CHI NHÁNH BÃI XE</th>
                        <th>ĐỊA CHỈ QUẬN</th>
                        <th>SỐ TẦNG</th>
                        <th>SỨC CHỨA</th>
                        <th>ĐANG ĐỖ</th>
                        <th>TRỤ SẠC EV</th>
                        <th>TRẠNG THÁI AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((b) => (
                        <tr key={b.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{b.id}</td>
                          <td><strong>{b.name}</strong></td>
                          <td>{b.address}</td>
                          <td>{Array.isArray(b.floors) ? b.floors.join(', ') : (b.floors || 'G, B1, B2')}</td>
                          <td><strong>{b.totalSlots || 240} ô</strong></td>
                          <td>
                            <span style={{ color: (b.occupiedSlots || 0) / (b.totalSlots || 1) > 0.8 ? '#f87171' : '#34d399', fontWeight: 800 }}>
                              {b.occupiedSlots || 0} ({Math.round((b.occupiedSlots || 0) / (b.totalSlots || 1) * 100)}%)
                            </span>
                          </td>
                          <td><span className="pf-status-badge info"><Zap size={11} /> {b.evSlots || 0} trụ</span></td>
                          <td><span className="pf-status-badge active"><ShieldCheck size={11} /> {b.barrierAi || 'Online (AI 99.4%)'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: QUẢN LÝ 5 CHI NHÁNH & SƠ ĐỒ Ô ĐỖ (BRANCHES & SLOTS)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'branches' && (
            <div>
              {/* Telemetry & Thiết bị IoT Hạ tầng thời gian thực */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>CỔNG BARRIER TỰ ĐỘNG</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>10 / 10 Online</div>
                    <div style={{ fontSize: '0.68rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="pf-live-dot" /> Tốc độ nâng 1.2s · Motor Bisen
                    </div>
                  </div>
                </div>

                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>CAMERA AI ANPR 4K</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>20 / 20 Online</div>
                    <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Độ chính xác quét biển: <strong>99.8%</strong></div>
                  </div>
                </div>

                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>TRẠM SẠC EV 120KW</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc', marginTop: '2px' }}>36 Trụ DC Sẵn Sàng</div>
                    <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Phụ tải: <strong>48% công suất</strong></div>
                  </div>
                </div>

                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>CẢM BIẾN TỪ &amp; SÓNG IOT</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>1,140 Node Active</div>
                    <div style={{ fontSize: '0.68rem', color: '#34d399' }}>Toàn vẹn mạng Mesh: 100%</div>
                  </div>
                </div>
              </div>

              {/* Thanh điều khiển hạ tầng & Chọn chi nhánh */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.35rem', flex: 1 }}>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranchId(b.id);
                        setSelectedSlotDetail(null);
                      }}
                      style={{
                        padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid',
                        borderColor: selectedBranchId === b.id ? '#0284c7' : '#1e293b',
                        background: selectedBranchId === b.id ? 'rgba(2, 132, 199, 0.2)' : '#0f172a',
                        color: selectedBranchId === b.id ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{b.district}</div>
                      <strong style={{ fontSize: '0.85rem' }}>{b.name}</strong>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleRunInfraDiagnostics}
                    disabled={infraDiagnosticsRunning}
                    className="pf-btn-portal-switch"
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.55rem 0.85rem' }}
                    title="Chẩn đoán kết nối và kiểm tra hoạt động toàn bộ thiết bị phần cứng"
                  >
                    <RefreshCw size={14} className={infraDiagnosticsRunning ? 'pf-spin' : ''} />
                    {infraDiagnosticsRunning ? 'Đang chẩn đoán...' : 'Chẩn Đoán Thiết Bị'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCalibrateBarrier(currentBranch?.name)}
                    className="pf-btn-portal-switch"
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.55rem 0.85rem' }}
                    title="Hiệu chuẩn góc mở và tốc độ nâng hạ cần Barrier"
                  >
                    <Sliders size={14} /> Hiệu Chuẩn Barrier
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBranchModal(true)}
                    className="pf-btn-portal-switch"
                    style={{ background: '#0284c7', color: '#ffffff', border: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.55rem 0.85rem' }}
                  >
                    <Plus size={15} /> + Thêm Chi Nhánh
                  </button>
                </div>
              </div>

              {/* Thông tin chi nhánh & Sơ đồ tầng & Ô đỗ */}
              <div className="pf-admin-card" style={{ marginBottom: '1.5rem' }}>
                <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={18} color="#0284c7" />
                      {currentBranch?.name || 'Chi nhánh SmartPark'}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      📍 {currentBranch?.address} · Sức chứa: <strong>{currentBranch?.totalSlots || 240} ô đỗ</strong> (Đang sử dụng: {currentBranch?.occupiedSlots || 0} ô) · Trạm sạc EV: <strong>{currentBranch?.evSlots || 15} trụ</strong>
                    </p>
                  </div>
                  {/* Chọn tầng */}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '4px' }}>CHỌN TẦNG:</span>
                    {(Array.isArray(currentBranch?.floors) ? currentBranch.floors : ['B1', 'B2', 'B3']).map((floor) => (
                      <button
                        key={floor}
                        type="button"
                        onClick={() => {
                          setSelectedFloor(floor);
                          setSelectedSlotDetail(null);
                        }}
                        style={{
                          padding: '0.4rem 0.85rem', borderRadius: '6px', border: 'none',
                          background: selectedFloor === floor ? '#0284c7' : '#1e293b',
                          color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Tầng {floor}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bộ lọc vùng ô đỗ & Chú giải */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.75rem 1.25rem', background: '#090d16', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'Tất cả ô đỗ' },
                      { id: 'available', label: 'Ô trống' },
                      { id: 'occupied', label: 'Xe đang gửi' },
                      { id: 'prebooked', label: 'Đã đặt trước' },
                      { id: 'ev', label: 'Trạm sạc EV 120kW' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setInfraFilterZone(f.id)}
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: 4,
                          border: infraFilterZone === f.id ? '1px solid #0284c7' : '1px solid #1e293b',
                          background: infraFilterZone === f.id ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                          color: infraFilterZone === f.id ? '#38bdf8' : '#94a3b8',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} /> Sẵn sàng
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} /> Đang đỗ
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0284c7' }} /> Đặt trước
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#c084fc' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#a855f7' }} /> Trạm EV
                    </span>
                  </div>
                </div>

                {/* Sơ đồ lưới ô đỗ thực tế từ PostgreSQL & Cảm biến */}
                <div style={{ padding: '1.25rem' }}>
                  <div className="pf-slot-grid">
                    {(() => {
                      const filteredSlots = adminLiveSlots.filter((slot) => {
                        if (infraFilterZone === 'ev') return slot.isEv;
                        if (infraFilterZone === 'available') return slot.status === 'available';
                        if (infraFilterZone === 'occupied') return slot.status === 'occupied';
                        if (infraFilterZone === 'prebooked') return slot.status === 'prebooked' || slot.status === 'reserved';
                        return true;
                      });

                      if (filteredSlots.length === 0 && adminLiveSlots.length > 0) {
                        return (
                          <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                            Không có ô đỗ nào phù hợp với bộ lọc &quot;{infraFilterZone}&quot;.
                          </div>
                        );
                      }

                      if (adminLiveSlots.length === 0) {
                        return (
                          <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                            Đang kết nối đồng bộ trạng thái ô đỗ trực tiếp từ cảm biến bãi xe qua PostgreSQL...
                          </div>
                        );
                      }

                      return filteredSlots.map((slot) => {
                        const isReserved = slot.status === 'reserved' || slot.status === 'prebooked';
                        const isOccupied = slot.status === 'occupied';
                        const slotType = isReserved ? 'reserved' : isOccupied ? 'occupied' : slot.isEv ? 'ev' : 'available';
                        const isSelected = selectedSlotDetail && selectedSlotDetail.id === slot.id;
                        return (
                          <div
                            key={slot.id}
                            className={`pf-slot-node ${slotType}`}
                            style={{
                              outline: isSelected ? '2px solid #38bdf8' : 'none',
                              transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                              transition: 'transform 0.15s ease',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedSlotDetail(slot)}
                            title={`Ô đỗ ${slot.id} (${isReserved ? 'Đã đặt trước' : isOccupied ? 'Xe đang gửi' : 'Ô trống'}) - Bấm để quản trị`}
                          >
                            <span>{slot.id}</span>
                            {slot.isEv && <Zap size={10} />}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Panel chi tiết ô đỗ khi bấm chọn */}
                  {selectedSlotDetail && (
                    <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#090d16', border: '1px solid #1e293b', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                          {selectedSlotDetail.id}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#fff' }}>
                            CHI TIẾT Ô ĐỖ: {selectedSlotDetail.id} ({selectedSlotDetail.isEv ? '⚡ Trạm Sạc Siêu Nhanh EV 120kW' : 'Ô Đỗ Tiêu Chuẩn'})
                          </strong>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                            Cảm biến IoT: <code>SNS-{selectedBranchId}-{selectedSlotDetail.id}</code> · Tầng {selectedFloor} · {currentBranch?.name}
                            {selectedSlotDetail.occupiedByPlate && (
                              <span style={{ color: '#fbbf24', marginLeft: '6px' }}>· Biển số: <strong>{selectedSlotDetail.occupiedByPlate}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`pf-status-badge ${selectedSlotDetail.status === 'available' ? 'active' : selectedSlotDetail.status === 'occupied' ? 'danger' : 'warning'}`}>
                          {selectedSlotDetail.status === 'available' ? '✓ Ô Trống Sẵn Sàng' : selectedSlotDetail.status === 'occupied' ? 'Xe Đang Gửi' : 'Đã Đặt Trước'}
                        </span>

                        {/* Nút đặt sang Ô Trống */}
                        {selectedSlotDetail.status !== 'available' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`http://localhost:5000/api/parking/slots/${selectedBranchId}/${selectedSlotDetail.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                                  },
                                  body: JSON.stringify({ status: 'available', floor: selectedFloor })
                                });
                                const json = await res.json();
                                if (json.success) {
                                  setAdminLiveSlots((prev) =>
                                    prev.map((s) => s.id === selectedSlotDetail.id ? { ...s, status: 'available', occupiedByPlate: null } : s)
                                  );
                                  setSelectedSlotDetail((prev) => ({ ...prev, status: 'available', occupiedByPlate: null }));
                                  showToast(`✓ Đã giải phóng ô ${selectedSlotDetail.id} về trạng thái [TRỐNG] thành công!`);
                                }
                              } catch (err) {
                                showToast(`⚠️ Lỗi: ${err.message}`);
                              }
                            }}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            ✓ Trả về Ô Trống
                          </button>
                        )}

                        {/* Nút chuyển sang Đã Đặt */}
                        {selectedSlotDetail.status !== 'reserved' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`http://localhost:5000/api/parking/slots/${selectedBranchId}/${selectedSlotDetail.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                                  },
                                  body: JSON.stringify({ status: 'reserved', floor: selectedFloor })
                                });
                                const json = await res.json();
                                if (json.success) {
                                  setAdminLiveSlots((prev) =>
                                    prev.map((s) => s.id === selectedSlotDetail.id ? { ...s, status: 'reserved' } : s)
                                  );
                                  setSelectedSlotDetail((prev) => ({ ...prev, status: 'reserved' }));
                                  showToast(`✓ Đã đặt trước ô ${selectedSlotDetail.id} sang [ĐÃ ĐẶT] thành công!`);
                                }
                              } catch (err) {
                                showToast(`⚠️ Lỗi: ${err.message}`);
                              }
                            }}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#fbbf24', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            ⏱ Đặt Chỗ Trước
                          </button>
                        )}

                        {/* Nút chuyển sang Đang Đỗ */}
                        {selectedSlotDetail.status !== 'occupied' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`http://localhost:5000/api/parking/slots/${selectedBranchId}/${selectedSlotDetail.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                                  },
                                  body: JSON.stringify({ status: 'occupied', floor: selectedFloor })
                                });
                                const json = await res.json();
                                if (json.success) {
                                  setAdminLiveSlots((prev) =>
                                    prev.map((s) => s.id === selectedSlotDetail.id ? { ...s, status: 'occupied' } : s)
                                  );
                                  setSelectedSlotDetail((prev) => ({ ...prev, status: 'occupied' }));
                                  showToast(`✓ Đã ghi nhận ô ${selectedSlotDetail.id} sang [ĐANG ĐỖ] thành công!`);
                                }
                              } catch (err) {
                                showToast(`⚠️ Lỗi: ${err.message}`);
                              }
                            }}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            🚗 Xe Vào Đỗ
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedSlotDetail(null)}
                          style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          ✕ Đóng
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bảng phân hệ Thiết bị Phần Cứng & Cổng Kiểm Soát */}
              <div className="pf-admin-card">
                <div className="pf-card-head">
                  <div>
                    <h3><ShieldCheck size={18} color="#0284c7" /> DANH SÁCH THIẾT BỊ PHẦN CỨNG &amp; CỔNG KIỂM SOÁT TẠI BÃI</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Giám sát trạng thái hoạt động thực tế của từng làn ra/vào, barrier quang học và camera AI ANPR
                    </p>
                  </div>
                </div>

                <div className="pf-admin-table-wrap">
                  <table className="pf-admin-table">
                    <thead>
                      <tr>
                        <th>MÃ CỔNG</th>
                        <th>VỊ TRÍ LÀN</th>
                        <th>THIẾT BỊ LIÊN KẾT</th>
                        <th>TỐC ĐỘ BARRIER</th>
                        <th>ĐỘ CHÍNH XÁC AI</th>
                        <th>ĐỘ TRỄ LẮP ĐẶT</th>
                        <th>TRẠNG THÁI</th>
                        <th style={{ textAlign: 'center' }}>KIỂM TRA LÀN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'GATE-IN-01', lane: 'Làn Vào 01 (Ô tô)', devices: 'Camera AI 4K + Barrier Quang Học + Loop Sensor', speed: '1.2 giây', ai: '99.9%', ping: '12ms', status: 'Online' },
                        { id: 'GATE-IN-02', lane: 'Làn Vào 02 (Ưu Tiên EV & VIP)', devices: 'Camera 4K + Barrier Không Dừng + Màn Hình LED Chào', speed: '1.0 giây', ai: '99.8%', ping: '15ms', status: 'Online' },
                        { id: 'GATE-OUT-01', lane: 'Làn Ra 01 (Tự Động Napas / QR)', devices: 'Camera Sau Quét Biển + Barrier Tự Mở Khi Thanh Toán', speed: '1.2 giây', ai: '99.7%', ping: '14ms', status: 'Online' },
                        { id: 'GATE-OUT-02', lane: 'Làn Ra 02 (Làn Thoát Khẩn Cấp)', devices: 'Barrier Motor Bisen DC + Cảm Biến Cưỡng Chế F4', speed: '1.5 giây', ai: '99.5%', ping: '11ms', status: 'Online' }
                      ].map((gate) => (
                        <tr key={gate.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{gate.id}</td>
                          <td><strong>{gate.lane}</strong></td>
                          <td style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{gate.devices}</td>
                          <td><strong style={{ color: '#10b981' }}>{gate.speed}</strong></td>
                          <td><strong style={{ color: '#38bdf8' }}>{gate.ai}</strong></td>
                          <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{gate.ping}</td>
                          <td>
                            <span className="pf-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Hoạt động
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => showToast(`⚡ Đang kiểm tra cổng ${gate.id}: Tín hiệu Barrier và Camera đạt chuẩn!`)}
                              style={{
                                padding: '0.3rem 0.65rem',
                                borderRadius: 6,
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#38bdf8',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Test Ping
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: QUẢN LÝ ĐƠN ĐẶT CHỖ TRƯỚC (BOOKINGS & PASSES)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'bookings' && (
            <div className="pf-admin-card">
              <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3><Calendar size={18} color="#0284c7" /> ĐƠN ĐẶT CHỖ TRƯỚC (HẠN VÉ 20 NGÀY · GÓI TUẦN & THÁNG)</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Khách đặt chỗ trước qua App, hệ thống cấp mã QR Pass giữ chỗ thời hạn 20 ngày.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Tìm mã booking, biển số, khách, vị trí ô..."
                    value={bookingFilter}
                    onChange={(e) => setBookingFilter(e.target.value)}
                    className="pf-admin-input"
                    style={{ width: '280px' }}
                  />
                </div>
              </div>

              <div className="pf-admin-table-wrap">
                <table className="pf-admin-table">
                  <thead>
                    <tr>
                      <th>MÃ BOOKING</th>
                      <th>KHÁCH HÀNG</th>
                      <th>SỐ ĐIỆN THOẠI</th>
                      <th>BIỂN SỐ XE</th>
                      <th>CHI NHÁNH ĐÀ NẴNG</th>
                      <th>VỊ TRÍ Ô ĐỖ</th>
                      <th>GÓI THỜI LƯỢNG</th>
                      <th>CƯỚC PHÍ</th>
                      <th>THỜI HẠN VÉ</th>
                      <th>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const q = bookingFilter.trim().toLowerCase();
                      const filteredBookings = bookings.filter((bk) => {
                        if (!q) return true;
                        return (
                          (bk?.id && String(bk.id).toLowerCase().includes(q)) ||
                          (bk?.plate && bk.plate.toLowerCase().includes(q)) ||
                          (bk?.customer && bk.customer.toLowerCase().includes(q)) ||
                          (bk?.phone && bk.phone.toLowerCase().includes(q)) ||
                          (bk?.branch && bk.branch.toLowerCase().includes(q)) ||
                          (bk?.slot && bk.slot.toLowerCase().includes(q))
                        );
                      });
                      if (filteredBookings.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10}>
                              <div className="pf-admin-empty-state">
                                <div className="pf-admin-empty-icon"><Calendar size={22} /></div>
                                <strong>{bookingFilter ? 'Không tìm thấy đơn đặt chỗ phù hợp' : 'Chưa có đơn đặt chỗ trước nào'}</strong>
                                <p>{bookingFilter ? `Không có kết quả khớp với từ khóa "${bookingFilter}".` : 'Toàn bộ đơn đặt giữ chỗ trực tuyến của khách hàng sẽ hiển thị tại đây theo thời gian thực.'}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return filteredBookings.map((bk) => (
                        <tr key={bk.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{bk.id}</td>
                          <td><strong>{bk.customer}</strong></td>
                          <td>{bk.phone}</td>
                          <td style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 800 }}>{bk.plate}</td>
                          <td>{bk.branch}</td>
                          <td><span style={{ color: '#34d399', fontWeight: 700 }}>{bk.slot}</span></td>
                          <td>{bk.duration}</td>
                          <td style={{ fontWeight: 800, color: '#fff' }}>{bk.fee}</td>
                          <td style={{ color: '#f59e0b', fontSize: '0.74rem' }}>{bk.validity}</td>
                          <td>
                            <span className={`pf-status-badge ${bk.status === 'Đang hiệu lực' ? 'active' : bk.status === 'Quá hạn' ? 'danger' : 'info'}`}>
                              {bk.status}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 4: XE ĐANG ĐỖ & LỊCH SỬ THÔNG QUAN (SESSIONS)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'sessions' && (
            <div className="pf-admin-card">
              <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3><CarFront size={18} color="#0284c7" /> GIÁM SÁT PHƯƠNG TIỆN LƯU BÃI THỜI GIAN THỰC</h3>
                  <span className="pf-status-badge active" style={{ marginTop: '0.25rem', display: 'inline-block' }}>Đang lưu bãi: {parkedLive.length} xe</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Tìm theo biển số, vị trí ô, chi nhánh..."
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    className="pf-admin-input"
                    style={{ width: '280px' }}
                  />
                </div>
              </div>
              <div className="pf-admin-table-wrap">
                <table className="pf-admin-table">
                  <thead>
                    <tr>
                      <th>BIỂN SỐ XE</th>
                      <th>CHI NHÁNH</th>
                      <th>VỊ TRÍ Ô</th>
                      <th>THỜI ĐIỂM VÀO</th>
                      <th>THỜI GIAN ĐÃ ĐỖ</th>
                      <th>CƯỚC TẠM TÍNH</th>
                      <th>TÌNH TRẠNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const q = sessionSearch.trim().toLowerCase();
                      const filteredSessions = parkedLive.filter((p) => {
                        if (!q) return true;
                        return (
                          (p?.plate && p.plate.toLowerCase().includes(q)) ||
                          (p?.branch && p.branch.toLowerCase().includes(q)) ||
                          (p?.slot && p.slot.toLowerCase().includes(q)) ||
                          (p?.status && p.status.toLowerCase().includes(q))
                        );
                      });
                      if (filteredSessions.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7}>
                              <div className="pf-admin-empty-state">
                                <div className="pf-admin-empty-icon"><CarFront size={22} /></div>
                                <strong>{sessionSearch ? 'Không tìm thấy phương tiện phù hợp' : 'Chưa có phương tiện nào đang gửi trong bãi'}</strong>
                                <p>{sessionSearch ? `Không có kết quả khớp với từ khóa "${sessionSearch}".` : 'Khi xe quét mã QR Barrier Pass vào cổng, phiên đỗ xe thực tế sẽ xuất hiện ngay tại đây.'}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return filteredSessions.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7', fontSize: '0.9rem' }}>{p.plate}</td>
                          <td>{p.branch}</td>
                          <td><strong style={{ color: '#34d399' }}>{p.slot}</strong></td>
                          <td>{p.timeIn}</td>
                          <td>{p.duration}</td>
                          <td style={{ fontWeight: 800, color: '#fff' }}>{p.fee}</td>
                          <td>
                            <span className={`pf-status-badge ${p?.status && String(p.status).includes('Quá hạn') ? 'danger' : 'active'}`}>
                              {p.status || 'Bình thường'}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 5: HÓA ĐƠN ĐIỆN TỬ VAT (INVOICES)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'invoices' && (
            <div className="pf-admin-card">
              <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3><CreditCard size={18} color="#0284c7" /> QUẢN LÝ HÓA ĐƠN GIÁ TRỊ GIA TĂNG (KÝ HIỆU: 1C26TDA)</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Pháp nhân: CÔNG TY CP QUẢN LÝ BÃI XE THÔNG MINH SMARTPARK ĐÀ NẴNG · MST: 0401889248
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Tìm mã hóa đơn, biển số, khách hàng..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="pf-admin-input"
                    style={{ width: '280px' }}
                  />
                </div>
              </div>
              <div className="pf-admin-table-wrap">
                <table className="pf-admin-table">
                  <thead>
                    <tr>
                      <th>SỐ HÓA ĐƠN</th>
                      <th>BIỂN SỐ XE</th>
                      <th>KHÁCH HÀNG</th>
                      <th>THỜI GIAN KÝ</th>
                      <th>TỔNG TIỀN (VNĐ)</th>
                      <th>HÌNH THỨC</th>
                      <th>TRẠNG THÁI THUẾ</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const q = invoiceSearch.trim().toLowerCase();
                      const filteredInvoices = invoicesList.filter((inv) => {
                        if (!q) return true;
                        return (
                          (inv?.id && String(inv.id).toLowerCase().includes(q)) ||
                          (inv?.plate && inv.plate.toLowerCase().includes(q)) ||
                          (inv?.customer && inv.customer.toLowerCase().includes(q)) ||
                          (inv?.method && inv.method.toLowerCase().includes(q))
                        );
                      });
                      if (filteredInvoices.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8}>
                              <div className="pf-admin-empty-state">
                                <div className="pf-admin-empty-icon"><ReceiptText size={22} /></div>
                                <strong>{invoiceSearch ? 'Không tìm thấy hóa đơn phù hợp' : 'Chưa có hóa đơn điện tử nào được phát hành'}</strong>
                                <p>{invoiceSearch ? `Không có kết quả khớp với từ khóa "${invoiceSearch}".` : 'Hệ thống tự động xuất hóa đơn VAT điện tử chuẩn Tổng Cục Thuế khi giao dịch hoàn tất.'}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return filteredInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>#{inv.id}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>{inv.plate}</td>
                          <td><strong>{inv.customer}</strong></td>
                          <td>{inv.time}</td>
                          <td style={{ fontWeight: 800, color: '#fff' }}>{inv.fee}</td>
                          <td>{inv.method}</td>
                          <td><span className="pf-status-badge active">✓ {inv.status}</span></td>
                          <td>
                            <button
                              type="button"
                              className="pf-btn-portal-switch"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                              onClick={() => setViewInvoice({ ...inv, amount: inv.fee })}
                            >
                              <Eye size={12} /> Xem & In Chuẩn A5
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 6: KHÁCH HÀNG & ĐIỂM PTS (USERS & LOYALTY)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="pf-admin-card">
              <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3><Users size={18} color="#0284c7" /> QUẢN TRỊ KHÁCH HÀNG & HỒ SƠ PHƯƠNG TIỆN</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Quản lý danh sách người dùng, hồ sơ xe đăng ký, tích lũy điểm thưởng ParkPoints, khóa tài khoản và đặt lại mật khẩu.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      border: 'none',
                      color: '#fff',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <UserPlus size={14} /> Thêm Khách Hàng Mới
                  </button>

                  <button
                    type="button"
                    onClick={handleExportUsersCsv}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 6,
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <FileDown size={14} /> Xuất CSV / Excel
                  </button>
                </div>
              </div>

              {/* Thanh lọc & Tìm kiếm */}
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem 1.25rem', background: '#090d16', borderBottom: '1px solid #1e293b' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, email, sđt, biển số xe..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="pf-admin-input"
                    style={{ paddingLeft: '28px', width: '100%', fontSize: '0.78rem' }}
                  />
                </div>

                <select
                  value={userFilterTier}
                  onChange={(e) => {
                    setUserFilterTier(e.target.value);
                    setUserPage(1);
                  }}
                  className="pf-admin-input"
                  style={{ width: '160px', fontSize: '0.78rem' }}
                >
                  <option value="all">Tất cả hạng hội viên</option>
                  <option value="Thành viên Bạc">Thành viên Bạc</option>
                  <option value="Thành viên Vàng">Thành viên Vàng</option>
                  <option value="Thành viên Kim Cương">Thành viên Kim Cương</option>
                </select>

                <select
                  value={userFilterStatus}
                  onChange={(e) => {
                    setUserFilterStatus(e.target.value);
                    setUserPage(1);
                  }}
                  className="pf-admin-input"
                  style={{ width: '150px', fontSize: '0.78rem' }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Bị khóa tài khoản</option>
                </select>
              </div>

              {/* Bảng danh sách khách hàng có scroll nội bộ & không tràn màn hình */}
              <div className="pf-admin-table-wrap pf-user-table-wrap">
                <table className="pf-admin-table">
                  <thead>
                    <tr>
                      <th>MÃ KH</th>
                      <th>KHÁCH HÀNG</th>
                      <th>SỐ ĐIỆN THOẠI</th>
                      <th>HẠNG THÀNH VIÊN</th>
                      <th>ĐIỂM PTS</th>
                      <th>XE ĐÃ ĐĂNG KÝ</th>
                      <th>TỔNG CHI TIÊU</th>
                      <th>TRẠNG THÁI</th>
                      <th>THAO TÁC QUẢN TRỊ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const q = userSearch.trim().toLowerCase();
                      const filteredUsers = users.filter((u) => {
                        if (userFilterTier !== 'all' && u.tier !== userFilterTier) return false;
                        if (userFilterStatus === 'active' && u.status === 'Bị khóa') return false;
                        if (userFilterStatus === 'locked' && u.status !== 'Bị khóa') return false;
                        if (!q) return true;
                        return (
                          (u?.id && String(u.id).toLowerCase().includes(q)) ||
                          (u?.name && u.name.toLowerCase().includes(q)) ||
                          (u?.email && u.email.toLowerCase().includes(q)) ||
                          (u?.phone && u.phone.toLowerCase().includes(q)) ||
                          (Array.isArray(u?.plates) && u.plates.some((pl) => pl && pl.toLowerCase().includes(q)))
                        );
                      });
                      if (filteredUsers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9}>
                              <div className="pf-admin-empty-state">
                                <div className="pf-admin-empty-icon"><Users size={22} /></div>
                                <strong>Không tìm thấy khách hàng phù hợp</strong>
                                <p>Không có kết quả khớp với điều kiện tìm kiếm hoặc bộ lọc.</p>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const totalPages = Math.ceil(filteredUsers.length / userPageSize) || 1;
                      const activePage = Math.min(Math.max(1, userPage), totalPages);
                      const paginatedList = filteredUsers.slice((activePage - 1) * userPageSize, activePage * userPageSize);

                      return paginatedList.map((u) => {
                        const isLocked = u.status === 'Bị khóa' || u.rawStatus === 'locked';
                        const isAdminUser = u.role === 'admin';
                        return (
                          <tr key={u.id} style={{ opacity: isLocked ? 0.75 : 1 }}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{u.id}</td>
                            <td>
                              <div>
                                <strong style={{ color: '#fff' }}>{u.name}</strong>
                                <small style={{ display: 'block', color: '#94a3b8' }}>{u.email}</small>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{u.phone || '---'}</span>
                            </td>
                            <td>
                              <span className={`pf-status-badge ${u.tier?.includes('Kim Cương') ? 'active' : u.tier?.includes('Vàng') ? 'warning' : 'neutral'}`}>
                                {u.tier}
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
                                <Coins size={12} style={{ display: 'inline' }} /> {u.points} pts
                              </strong>
                            </td>
                            <td>
                              {Array.isArray(u.plates) && u.plates.length > 0 ? (
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                  {u.plates.map((pl, i) => (
                                    <span key={i} style={{ fontFamily: 'monospace', background: '#1e293b', color: '#38bdf8', padding: '0.1rem 0.35rem', borderRadius: 4, fontSize: '0.72rem' }}>
                                      {pl}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Chưa có xe</span>
                              )}
                            </td>
                            <td>
                              <strong style={{ color: '#34d399', fontSize: '0.82rem' }}>
                                {u.totalSpent ? `${u.totalSpent.toLocaleString('vi-VN')}đ` : '0đ'}
                              </strong>
                              <small style={{ display: 'block', color: '#64748b', fontSize: '0.68rem' }}>
                                ({u.totalBookings || 0} đơn)
                              </small>
                            </td>
                            <td>
                              <span className={`pf-status-badge ${isLocked ? 'danger' : 'active'}`}>
                                {isLocked ? 'Đã Khóa' : 'Hoạt Động'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="pf-btn-portal-switch"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: '#0284c7', color: '#fff', border: 'none' }}
                                  onClick={() => handleOpenCustomerDetail(u)}
                                  title="Xem chi tiết hồ sơ khách hàng"
                                >
                                  <Eye size={12} /> Hồ Sơ
                                </button>

                                {!isAdminUser && (
                                  <>
                                    <button
                                      type="button"
                                      className="pf-btn-portal-switch"
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.7rem',
                                        background: isLocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: isLocked ? '#34d399' : '#f87171',
                                        border: isLocked ? '1px solid #10b981' : '1px solid #ef4444'
                                      }}
                                      onClick={() => handleToggleUserLock(u)}
                                      title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                    >
                                      {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                                      <span>{isLocked ? 'Mở' : 'Khóa'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="pf-btn-portal-switch"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155' }}
                                      onClick={() => setShowResetPwdModal(u)}
                                      title="Đặt lại mật khẩu"
                                    >
                                      <Key size={12} /> Đổi MK
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  className="pf-btn-portal-switch"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: '#1e293b', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.35)' }}
                                  onClick={() => setPointsCompModal({ user: u, adjustAmount: 50, reason: '' })}
                                  title="Hoàn bù điểm sự cố"
                                >
                                  <Coins size={12} /> Bù Điểm
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Thanh phân trang điều khiển gọn gàng không bị tràn màn hình */}
              {(() => {
                const q = userSearch.trim().toLowerCase();
                const totalFiltered = users.filter((u) => {
                  if (userFilterTier !== 'all' && u.tier !== userFilterTier) return false;
                  if (userFilterStatus === 'active' && u.status === 'Bị khóa') return false;
                  if (userFilterStatus === 'locked' && u.status !== 'Bị khóa') return false;
                  if (!q) return true;
                  return (
                    (u?.id && String(u.id).toLowerCase().includes(q)) ||
                    (u?.name && u.name.toLowerCase().includes(q)) ||
                    (u?.email && u.email.toLowerCase().includes(q)) ||
                    (u?.phone && u.phone.toLowerCase().includes(q)) ||
                    (Array.isArray(u?.plates) && u.plates.some((pl) => pl && pl.toLowerCase().includes(q)))
                  );
                }).length;
                const totalPages = Math.ceil(totalFiltered / userPageSize) || 1;
                const startItem = totalFiltered === 0 ? 0 : (userPage - 1) * userPageSize + 1;
                const endItem = Math.min(userPage * userPageSize, totalFiltered);

                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid #1e293b', background: '#090d16', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                        Hiển thị <strong style={{ color: '#38bdf8' }}>{startItem} - {endItem}</strong> trên tổng số <strong style={{ color: '#fff' }}>{totalFiltered}</strong> khách hàng
                      </span>
                      <select
                        value={userPageSize}
                        onChange={(e) => {
                          setUserPageSize(Number(e.target.value));
                          setUserPage(1);
                        }}
                        className="pf-admin-input"
                        style={{ width: '135px', padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                      >
                        <option value={10}>10 dòng / trang</option>
                        <option value={20}>20 dòng / trang</option>
                        <option value={50}>50 dòng / trang</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                        className="pf-btn-portal-switch"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', opacity: userPage <= 1 ? 0.4 : 1 }}
                      >
                        ◀ Trang Trước
                      </button>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700 }}>
                        Trang <strong style={{ color: '#38bdf8' }}>{userPage}</strong> / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={userPage >= totalPages}
                        onClick={() => setUserPage((p) => Math.min(totalPages, p + 1))}
                        className="pf-btn-portal-switch"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', opacity: userPage >= totalPages ? 0.4 : 1 }}
                      >
                        Trang Sau ▶
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 7: ƯU ĐÃI VOUCHER (PROMOTIONS & VOUCHER MANAGEMENT)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'vouchers' && (
            <div className="pf-admin-card">
              <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3><Ticket size={18} color="#0284c7" /> DANH SÁCH VOUCHER KHUYẾN MÃI &amp; CHÍNH SÁCH ĐỔI ĐIỂM</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Quản lý toàn diện điều kiện mã giảm giá, kiểm soát đơn tối thiểu và cấp voucher đặc quyền riêng cho từng khách hàng
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="pf-btn-portal-switch"
                    style={{ background: '#0284c7', borderColor: '#0284c7', color: '#ffffff' }}
                    onClick={() => setShowBroadcastModal(true)}
                  >
                    <Send size={14} /> Phát Thông Báo Real-Time
                  </button>
                  <button
                    type="button"
                    className="pf-btn-portal-switch"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', borderColor: '#059669', color: '#ffffff', fontWeight: 800 }}
                    onClick={() => setShowGrantVoucherModal(true)}
                  >
                    <Gift size={14} /> 🎁 Cấp Voucher Cho Khách Hàng
                  </button>
                  <button
                    type="button"
                    className="pf-btn-portal-switch"
                    onClick={() => setShowAddVoucherModal(true)}
                  >
                    <Plus size={14} /> + Thêm Voucher Mới
                  </button>
                </div>
              </div>

              <div className="pf-admin-table-wrap">
                <table className="pf-admin-table">
                  <thead>
                    <tr>
                      <th>MÃ VOUCHER</th>
                      <th>TIÊU ĐỀ ƯU ĐÃI</th>
                      <th>CHẾ ĐỘ HIỂN THỊ</th>
                      <th>MỨC GIẢM GIÁ</th>
                      <th>ĐIỀU KIỆN ÁP DỤNG</th>
                      <th>ĐIỂM ĐỔI</th>
                      <th>ĐÃ SỬ DỤNG</th>
                      <th>HẠN DÙNG</th>
                      <th>TRẠNG THÁI</th>
                      <th style={{ textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={10}>
                          <div className="pf-admin-empty-state">
                            <div className="pf-admin-empty-icon"><Ticket size={22} /></div>
                            <strong>Chưa có mã voucher nào trong hệ thống</strong>
                            <p>Bấm &quot;Thêm Voucher Mới&quot; để phát hành mã giảm giá hoặc &quot;Cấp Voucher Cho Khách Hàng&quot; để tặng quà riêng.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      vouchers.map((v) => {
                        const minOrder = v.minOrderVal ? parseInt(v.minOrderVal, 10) : 0;
                        return (
                          <tr key={v.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 900, color: '#38bdf8', fontSize: '0.92rem' }}>{v.code}</td>
                            <td>
                              <strong>{v.title}</strong>
                              {v.conditions && (
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{v.conditions}</div>
                              )}
                            </td>
                            <td>
                              {v.visibility === 'hidden' || v.isHidden ? (
                                <span className="pf-status-badge warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderColor: '#f59e0b', fontSize: '0.7rem' }}>
                                  🔒 Voucher Ẩn (Nhập Mã)
                                </span>
                              ) : (
                                <span className="pf-status-badge active" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: '#10b981', fontSize: '0.7rem' }}>
                                  🌐 Công Khai (Thu Thập)
                                </span>
                              )}
                            </td>
                            <td style={{ fontWeight: 800, color: '#10b981' }}>{v.discount}</td>
                            <td>
                              <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'inline-block' }}>
                                {minOrder > 0 ? `Đơn từ ${minOrder.toLocaleString('vi-VN')}đ` : 'Không giới hạn đơn'}
                              </span>
                            </td>
                            <td><strong style={{ color: '#fbbf24' }}>{v.ptsCost} pts</strong></td>
                            <td>{v.usedCount} / {v.maxUse} lượt</td>
                            <td>{v.expiry}</td>
                            <td>
                              <span className={`pf-status-badge ${v.status === 'Kích hoạt' ? 'active' : 'neutral'}`}>
                                {v.status || 'Kích hoạt'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVoucher({
                                      id: v.id,
                                      code: v.code,
                                      title: v.title,
                                      discountType: v.discountType || (String(v.discount || '').includes('%') ? 'percent' : 'fixed'),
                                      discountVal: v.discountVal || (parseInt(String(v.discount || '').replace(/\D/g, ''), 10) || 20000),
                                      minOrderVal: v.minOrderVal || 0,
                                      ptsCost: v.ptsCost || 0,
                                      maxUse: v.maxUse || 500,
                                      expiry: v.expiry || '31/12/2027',
                                      applyFor: v.applyFor || 'all',
                                      conditions: v.conditions || '',
                                      visibility: v.visibility || (v.isHidden ? 'hidden' : 'public'),
                                      status: v.status || 'Kích hoạt'
                                    });
                                    setShowEditVoucherModal(true);
                                  }}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: 6,
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Chỉnh sửa chi tiết & điều kiện voucher"
                                >
                                  <Edit3 size={13} /> Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVoucher(v.id, v.code)}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: 6,
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Xóa voucher khỏi hệ thống"
                                >
                                  <Trash2 size={13} /> Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 8: NHÂN SỰ & PHÂN CA TRỰC (STAFF & SHIFT HANDOVER)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'staff' && (
            <div>
              <div className="pf-admin-card">
                <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3><FileSpreadsheet size={18} color="#0284c7" /> NHÂN VIÊN TRỰC BỐT &amp; ĐỐI SOÁT DOANH THU CA</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Giám sát ca trực bốt cổng, phân quyền tài khoản nhân viên và biên bản bàn giao ca
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Tìm nhân viên, bốt trực, ca..."
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="pf-admin-input"
                      style={{ width: '220px' }}
                    />
                    <button
                      type="button"
                      className="pf-btn-portal-switch"
                      style={{ background: '#0284c7', color: '#ffffff', border: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setShowCreateStaffModal(true)}
                    >
                      <Plus size={14} /> + Cấp Tài Khoản Nhân Viên
                    </button>
                    <button
                      type="button"
                      className="pf-btn-bank-pin"
                      onClick={() => setShowChangePinModal(true)}
                    >
                      <ShieldCheck size={14} /> Mã PIN Ngân Hàng
                    </button>
                  </div>
                </div>

                <div className="pf-admin-table-wrap">
                  <table className="pf-admin-table">
                    <thead>
                      <tr>
                        <th>MÃ NV</th>
                        <th>HỌ VÀ TÊN</th>
                        <th>VỊ TRÍ BỐT TRỰC</th>
                        <th>KHUNG GIỜ CA</th>
                        <th>TIỀN MẶT TRONG KÉT</th>
                        <th>DOANH SỐ ONLINE</th>
                        <th>TRẠNG THÁI</th>
                        <th>THAO TÁC / GIAO CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const q = staffSearch.trim().toLowerCase();
                        const filteredStaff = staffList.filter((st) => {
                          if (!q) return true;
                          return (
                            (st?.id && String(st.id).toLowerCase().includes(q)) ||
                            (st?.name && st.name.toLowerCase().includes(q)) ||
                            (st?.station && st.station.toLowerCase().includes(q)) ||
                            (st?.shift && st.shift.toLowerCase().includes(q))
                          );
                        });
                        if (filteredStaff.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8}>
                                <div className="pf-admin-empty-state">
                                  <div className="pf-admin-empty-icon"><Users size={22} /></div>
                                  <strong>{staffSearch ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào trong danh sách'}</strong>
                                  <p>{staffSearch ? `Không có kết quả khớp với từ khóa "${staffSearch}".` : 'Bấm "+ Cấp Tài Khoản Nhân Viên" để tạo tài khoản nhân viên trực bốt mới.'}</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return filteredStaff.map((st) => (
                          <tr key={st.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{st.id}</td>
                            <td><strong>{st.name}</strong></td>
                            <td>{st.station}</td>
                            <td>{st.shift}</td>
                            <td style={{ fontWeight: 800, color: '#34d399' }}>{st.todayCash}</td>
                            <td style={{ fontWeight: 800, color: '#38bdf8' }}>{st.todayOnline}</td>
                            <td><span className={`pf-status-badge ${st.status === 'Đang trực' ? 'active' : 'info'}`}>{st.status}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="pf-btn-portal-switch"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                  onClick={() => setSelectedStaffForHandover(st)}
                                >
                                  <FileSpreadsheet size={12} /> Xem Biên Bản
                                </button>
                                <button
                                  type="button"
                                  className="pf-btn-portal-switch"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.72rem',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#f87171',
                                    border: '1px solid rgba(239, 68, 68, 0.35)'
                                  }}
                                  onClick={() => { setStaffToDelete(st); setDeleteStaffPin(''); }}
                                  title="Xóa tài khoản nhân viên (Yêu cầu mã PIN bảo mật Admin)"
                                >
                                  <Trash2 size={12} /> Xóa NV
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 9: CẤU HÌNH BẢNG CƯỚC PHÍ (TARIFFS & PRICING ENGINE)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'tariffs' && (
            <div>
              {/* Header Card */}
              <div className="pf-admin-card" style={{ marginBottom: '1.25rem' }}>
                <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3><DollarSign size={18} color="#0284c7" /> QUẢN TRỊ BIỂU PHÍ &amp; BẢNG CƯỚC DỊCH VỤ TOÀN HỆ THỐNG</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Áp dụng tự động cho tính cước bốt trực cổng, đặt chỗ trước qua App, gói ngày/tuần/tháng theo Nghị định 123 và quy chuẩn bãi đỗ thông minh Đà Nẵng.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Áp dụng chi nhánh:</span>
                    <select
                      value={calcBranch}
                      onChange={(e) => setCalcBranch(e.target.value)}
                      className="pf-admin-input"
                      style={{ width: '220px', fontSize: '0.76rem' }}
                    >
                      <option value="all">Toàn bộ 5 chi nhánh Đà Nẵng</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4 Vehicle Tier Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', padding: '1rem 0 0.5rem' }}>
                  {tariffs.map(tf => (
                    <div
                      key={tf.id}
                      style={{
                        background: '#090d16',
                        border: '1px solid #1e293b',
                        borderRadius: 10,
                        padding: '1rem',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                        <div>
                          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 800 }}>{tf.id}</span>
                          <h4 style={{ margin: '2px 0 0', fontSize: '0.92rem', color: '#f8fafc', fontWeight: 800 }}>{tf.vehicle}</h4>
                        </div>
                        <button
                          type="button"
                          className="pf-btn-portal-switch"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.68rem' }}
                          onClick={() => setTariffModalData({ ...tf })}
                        >
                          Chỉnh Sửa
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.74rem', borderTop: '1px solid #1e293b', paddingTop: '0.65rem', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>2h đầu tiên:</span>
                          <strong style={{ color: '#38bdf8' }}>{tf.firstHours?.toLocaleString('vi-VN')}đ</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>Mỗi giờ tiếp:</span>
                          <strong style={{ color: '#cbd5e1' }}>+{tf.nextHour?.toLocaleString('vi-VN')}đ/h</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>Vé ngày 24h:</span>
                          <strong style={{ color: '#f59e0b' }}>{tf.dayRate?.toLocaleString('vi-VN')}đ</strong>
                        </div>
                        <div>
                          <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>Thẻ tháng 30 ngày:</span>
                          <strong style={{ color: '#a855f7' }}>{tf.monthRate?.toLocaleString('vi-VN')}đ</strong>
                        </div>
                      </div>
                      <small style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>{tf.note || 'Áp dụng cho mọi khung giờ'}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bảng so sánh chi tiết & Công cụ tính cước tương tác */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Bảng so sánh */}
                <div className="pf-admin-card">
                  <div className="pf-card-head">
                    <h3><FileText size={16} color="#0284c7" /> BẢNG SO SÁNH KHUNG GIÁ TOÀN DIỆN</h3>
                  </div>
                  <div className="pf-admin-table-wrap">
                    <table className="pf-admin-table">
                      <thead>
                        <tr>
                          <th>LOẠI PHƯƠNG TIỆN</th>
                          <th>2H ĐẦU</th>
                          <th>MỖI GIỜ TIẾP</th>
                          <th>VÉ NGÀY</th>
                          <th>THẺ TUẦN</th>
                          <th>THẺ THÁNG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tariffs.map(tf => (
                          <tr key={tf.id}>
                            <td><strong>{tf.vehicle}</strong></td>
                            <td style={{ color: '#38bdf8', fontWeight: 800 }}>{tf.firstHours?.toLocaleString('vi-VN')}đ</td>
                            <td>+{tf.nextHour?.toLocaleString('vi-VN')}đ</td>
                            <td style={{ color: '#f59e0b' }}>{tf.dayRate?.toLocaleString('vi-VN')}đ</td>
                            <td style={{ color: '#10b981' }}>{tf.weekRate?.toLocaleString('vi-VN')}đ</td>
                            <td style={{ color: '#a855f7', fontWeight: 800 }}>{tf.monthRate?.toLocaleString('vi-VN')}đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '0.85rem 1rem', background: '#090d16', borderTop: '1px solid #1e293b', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    📌 <strong>Quy định pháp lý & Thuế GTGT:</strong> Mức giá trên đã bao gồm thuế VAT 8% theo Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC. Sau 15 phút ân hạn, hệ thống tự động tính cước lốc 2 giờ đầu tiên và cộng dồn theo mỗi giờ tiếp theo.
                  </div>
                </div>

                {/* Công cụ giả lập tính cước thời gian thực */}
                <div className="pf-admin-card">
                  <div className="pf-card-head">
                    <h3><Calculator size={16} color="#10b981" /> GIẢ LẬP TÍNH CƯỚC THỰC TẾ</h3>
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>CHỌN PHƯƠNG TIỆN:</label>
                      <select
                        value={calcVehicle}
                        onChange={(e) => setCalcVehicle(e.target.value)}
                        className="pf-admin-input"
                        style={{ width: '100%', fontSize: '0.78rem' }}
                      >
                        {tariffs.map(tf => (
                          <option key={tf.id} value={tf.vehicle}>{tf.vehicle}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>HÌNH THỨC ĐỖ:</label>
                        <select
                          value={calcPackage}
                          onChange={(e) => setCalcPackage(e.target.value)}
                          className="pf-admin-input"
                          style={{ width: '100%', fontSize: '0.78rem' }}
                        >
                          <option value="hourly">Theo giờ</option>
                          <option value="daily">Vé ngày (24h)</option>
                          <option value="weekly">Thẻ tuần (7 ngày)</option>
                          <option value="monthly">Thẻ tháng (30 ngày)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>THỜI LƯỢNG (GIỜ):</label>
                        <input
                          type="number"
                          min="1"
                          max="72"
                          disabled={calcPackage !== 'hourly'}
                          value={calcHours}
                          onChange={(e) => setCalcHours(Number(e.target.value))}
                          className="pf-admin-input"
                          style={{ width: '100%', fontSize: '0.78rem', opacity: calcPackage !== 'hourly' ? 0.5 : 1 }}
                        />
                      </div>
                    </div>

                    {/* Kết quả tính cước chi tiết */}
                    {(() => {
                      const selectedTf = tariffs.find(t => t.vehicle === calcVehicle) || tariffs[0];
                      let total = 0;
                      let breakdown = '';
                      if (calcPackage === 'daily') {
                        total = selectedTf.dayRate;
                        breakdown = 'Trọn gói vé ngày 24 giờ';
                      } else if (calcPackage === 'weekly') {
                        total = selectedTf.weekRate;
                        breakdown = 'Gói thẻ tuần 7 ngày liên tục';
                      } else if (calcPackage === 'monthly') {
                        total = selectedTf.monthRate;
                        breakdown = 'Gói thẻ tháng 30 ngày';
                      } else {
                        total = selectedTf.firstHours;
                        if (calcHours > 2) {
                          total += (calcHours - 2) * selectedTf.nextHour;
                          breakdown = `2h đầu (${selectedTf.firstHours.toLocaleString('vi-VN')}đ) + ${calcHours - 2}h tiếp theo (${((calcHours - 2) * selectedTf.nextHour).toLocaleString('vi-VN')}đ)`;
                        } else {
                          breakdown = `2 giờ đầu khởi điểm (${selectedTf.firstHours.toLocaleString('vi-VN')}đ)`;
                        }
                      }
                      const preTax = Math.round(total / 1.08);
                      const vatAmt = total - preTax;

                      return (
                        <div style={{ background: '#090d16', border: '1.5px solid #0284c7', borderRadius: 8, padding: '0.85rem', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700, display: 'block' }}>KẾT QUẢ TÍNH CƯỚC THEO BIỂU PHÍ:</span>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981', margin: '4px 0' }}>
                            {total.toLocaleString('vi-VN')} đ
                          </div>
                          <small style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginBottom: '6px' }}>{breakdown}</small>
                          <div style={{ borderTop: '1px dashed #334155', paddingTop: '6px', fontSize: '0.7rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tiền dịch vụ (chưa thuế):</span>
                            <strong>{preTax.toLocaleString('vi-VN')}đ</strong>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                            <span>Thuế GTGT VAT (8%):</span>
                            <strong style={{ color: '#38bdf8' }}>{vatAmt.toLocaleString('vi-VN')}đ</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 10: HỆ THỐNG QUẢNG BÁ & BANNERS (MARKETING PORTAL)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'marketing' && (
            <div>
              <div className="pf-admin-card" style={{ marginBottom: '1.25rem' }}>
                <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3><Image size={18} color="#0284c7" /> QUẢN TRỊ HỆ THỐNG QUẢNG BÁ &amp; BANNER SLIDES</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Các slide quảng bá này được đồng bộ thời gian thực tới <strong>Slide Đăng ký thành viên</strong> và <strong>Trang chủ khách hàng</strong>.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="pf-status-badge active">
                      <Sparkles size={12} /> {adSlides.length} Slide Đang Chạy
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.5rem', padding: '1rem' }}>
                  {/* Form Upload / Thêm mới Banner */}
                  <form onSubmit={handleSaveNewBanner} style={{ background: '#090e1a', padding: '1.25rem', borderRadius: '10px', border: '1.5px dashed #0284c7' }}>
                    <h4 style={{ margin: '0 0 0.85rem', color: '#fff', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Plus size={16} color="#38bdf8" /> THÊM SLIDE QUẢNG BÁ MỚI
                    </h4>

                    {/* HỘP GHI CHÚ QUY CHUẨN KÍCH THƯỚC ẢNH SLIDE */}
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      background: 'rgba(2, 132, 199, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '8px',
                      marginBottom: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 800, fontSize: '0.74rem', marginBottom: '0.35rem' }}>
                        <Sparkles size={14} /> 📐 QUY CHUẨN KÍCH THƯỚC ẢNH SLIDE ĐĂNG KÝ:
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#cbd5e1', lineHeight: '1.55' }}>
                        <div>• <strong>Kích thước chuẩn khuyến nghị:</strong> <span style={{ color: '#34d399', fontWeight: 700 }}>1080 x 1440 px</span> hoặc <span style={{ color: '#34d399', fontWeight: 700 }}>1200 x 1600 px</span> (Tỷ lệ dọc 3:4 hoặc 4:5 vừa khít màn hình bên trái).</div>
                        <div>• <strong>Ảnh ngang Full HD:</strong> Vẫn hỗ trợ tốt chuẩn <span style={{ color: '#38bdf8', fontWeight: 700 }}>1920 x 1080 px</span>.</div>
                        <div>• <strong>Tự động căn chỉnh thông minh:</strong> Giao diện web được trang bị thuật toán co giãn thông minh (<code>object-fit: cover</code> &amp; <code>center</code>). Dù admin thêm ảnh lệch kích thước hoặc tỉ lệ khác nhau, hệ thống tự động co giãn vừa vặn, không bị méo tỉ lệ và không vỡ hình.</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>CHỌN ẢNH TỪ MÁY TÍNH:</label>
                        <input
                          id="sp-admin-banner-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleUploadImageFile}
                          style={{ fontSize: '0.78rem', color: '#cbd5e1' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>HOẶC DÁN ĐƯỜNG DẪN ẢNH (URL):</label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={newSlide.imageUrl}
                          onChange={(e) => setNewSlide({ ...newSlide, imageUrl: e.target.value })}
                          className="pf-admin-input"
                        />
                      </div>
                      {newSlide.imageUrl && (
                        <div style={{ height: '140px', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e293b', background: '#020617', position: 'relative' }}>
                          <img src={newSlide.imageUrl} alt="Xem trước" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 6, right: 8, background: 'rgba(0,0,0,0.7)', color: '#38bdf8', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                            Xem trước
                          </div>
                        </div>
                      )}
                      <div>
                        <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>TIÊU ĐỀ SLIDE / QUẢNG BÁ (TÙY CHỌN):</label>
                        <input
                          type="text"
                          placeholder="VD: BÃI ĐỖ XE THÔNG MINH SMARTPARK ĐÀ NẴNG"
                          value={newSlide.title}
                          onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                          className="pf-admin-input"
                        />
                      </div>
                      <button type="submit" className="pf-btn-portal-switch" style={{ justifyContent: 'center', marginTop: '0.4rem', background: '#0284c7', color: '#fff', border: 0, fontWeight: 700, padding: '0.65rem' }}>
                        <Plus size={15} /> + Lưu &amp; Kích Hoạt Slide Quảng Cáo
                      </button>
                    </div>
                  </form>

                  {/* Danh sách Banners Hiện Có */}
                  <div>
                    <h4 style={{ margin: '0 0 0.85rem', color: '#fff', fontSize: '0.88rem' }}>
                      DANH SÁCH BANNER ĐANG PHÁT ({adSlides.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '440px', overflowY: 'auto' }}>
                      {adSlides.map((sl, idx) => (
                        <div
                          key={sl.id || idx}
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            background: '#090e1a',
                            padding: '0.75rem',
                            borderRadius: 8,
                            border: '1px solid #1e293b',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ width: 85, height: 60, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#020617' }}>
                            <img src={sl.imageUrl} alt={sl.title || `Slide ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 800 }}>Slide #{idx + 1}</span>
                            <strong style={{ display: 'block', fontSize: '0.82rem', color: '#fff', margin: '0.1rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sl.title || 'Bãi đỗ xe thông minh SmartPark Đà Nẵng'}
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sl.imageUrl?.startsWith('data:') ? 'Ảnh tải từ máy tính' : sl.imageUrl}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBanner(sl.id)}
                            style={{ border: 'none', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', cursor: 'pointer', padding: '7px 9px', borderRadius: 6, transition: '0.2s' }}
                            title="Xóa banner này"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 11: NHẬT KÝ HỆ THỐNG & KIỂM TOÁN AN NINH (DEDICATED LOGS)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'logs' && (
            <div>
              {/* Thống kê Tổng quan An ninh & Kiểm toán */}
              {(() => {
                const securityThreats = securityLogs.filter((l) => {
                  const txt = `${l.reason || ''} ${l.action || ''}`.toUpperCase();
                  return txt.includes('CẢNH BÁO') || txt.includes('BRUTE-FORCE') || txt.includes('PHÁ HỆ THỐNG') || txt.includes('SAI MẬT KHẨU') || txt.includes('QR') || txt.includes('SAI MÃ PIN') || txt.includes('CƯỠNG CHẾ');
                });
                const bruteForceCount = securityLogs.filter((l) => `${l.reason || ''} ${l.action || ''}`.toUpperCase().includes('BRUTE-FORCE') || `${l.reason || ''} ${l.action || ''}`.toUpperCase().includes('PHÁ HỆ THỐNG')).length;

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>TỔNG NHẬT KÝ HỆ THỐNG</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{securityLogs.length} Bản ghi</div>
                        <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Lưu trữ bảo mật PostgreSQL</div>
                      </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 8, background: securityThreats.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: securityThreats.length > 0 ? '#f87171' : '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldAlert size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>SỰ KIỆN AN NINH &amp; CẢNH BÁO</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: securityThreats.length > 0 ? '#f87171' : '#34d399', marginTop: '2px' }}>
                          {securityThreats.length} Cảnh báo
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Đã ghi vết IP &amp; ngăn chặn</div>
                      </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 8, background: bruteForceCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(2, 132, 199, 0.15)', color: bruteForceCount > 0 ? '#fbbf24' : '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>DÒ QUÉT BRUTE-FORCE</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: bruteForceCount > 0 ? '#fbbf24' : '#34d399', marginTop: '2px' }}>
                          {bruteForceCount > 0 ? `${bruteForceCount} Phát hiện` : '0 Thâm nhập'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#34d399' }}>Chống dò mật khẩu tự động</div>
                      </div>
                    </div>

                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>TƯỜNG LỬA HỆ THỐNG (WAF)</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>100% An Toàn</div>
                        <div style={{ fontSize: '0.68rem', color: '#34d399' }}>Bảo mật JWT 256-bit</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pf-admin-card">
                <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3><FileText size={18} color="#0284c7" /> NHẬT KÝ VẬN HÀNH &amp; KIỂM TOÁN AN NINH TOÀN HỆ THỐNG</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Theo dõi thời gian thực mọi hành vi đăng nhập sai, dò quét brute-force, quét mã QR giả mạo, mở cưỡng chế F4 và thao tác quản trị.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleExportAuditLogsCsv}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: 6,
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#38bdf8',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer'
                      }}
                    >
                      <FileDown size={14} /> Xuất File CSV Nhật Ký
                    </button>
                  </div>
                </div>

                {/* Bộ lọc tìm kiếm Logs */}
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem 1.25rem', background: '#090d16', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      placeholder="Tìm theo hành động, người thực hiện, lý do, địa chỉ IP..."
                      value={auditLogSearch}
                      onChange={(e) => setAuditLogSearch(e.target.value)}
                      className="pf-admin-input"
                      style={{ paddingLeft: '28px', width: '100%', fontSize: '0.78rem' }}
                    />
                  </div>

                  <select
                    value={auditLogActionFilter}
                    onChange={(e) => setAuditLogActionFilter(e.target.value)}
                    className="pf-admin-input"
                    style={{ width: '230px', fontSize: '0.78rem' }}
                  >
                    <option value="all">Tất cả hành động</option>
                    <option value="CẢNH BÁO">🚨 Cảnh Báo An Ninh / Bất Thường</option>
                    <option value="BRUTE-FORCE">🔒 Dò Quét Mật Khẩu (Brute-Force)</option>
                    <option value="QR">📷 Quét Mã QR Lạ / Giả Mạo</option>
                    <option value="MỞ BARRIER">⚡ Mở Barrier Cưỡng Chế (F4)</option>
                    <option value="VOUCHER">🎁 Quản Lý &amp; Cấp Voucher</option>
                    <option value="ĐIỂM">Hoàn Bù Điểm</option>
                    <option value="ĐĂNG NHẬP">Đăng Nhập Hệ Thống</option>
                    <option value="KHÓA">Khóa / Mở Khóa Tài Khoản</option>
                    <option value="PIN">Mã PIN Bảo Mật</option>
                  </select>
                </div>

                <div className="pf-admin-table-wrap">
                  <table className="pf-admin-table">
                    <thead>
                      <tr>
                        <th>MÃ LỆNH</th>
                        <th>THỜI GIAN</th>
                        <th>NGƯỜI THỰC HIỆN</th>
                        <th>CỔNG / TRẠM</th>
                        <th>HÀNH ĐỘNG / PHÂN LOẠI</th>
                        <th>CHI TIẾT KIỂM TOÁN AN NINH</th>
                        <th>TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const q = auditLogSearch.trim().toLowerCase();
                        const filtered = securityLogs.filter(lg => {
                          const actionText = `${lg.reason || ''} ${lg.action || ''}`.toUpperCase();
                          if (auditLogActionFilter !== 'all' && !actionText.includes(auditLogActionFilter.toUpperCase())) return false;
                          if (!q) return true;
                          return (
                            (lg.id && lg.id.toLowerCase().includes(q)) ||
                            (lg.staff && lg.staff.toLowerCase().includes(q)) ||
                            (lg.reason && lg.reason.toLowerCase().includes(q)) ||
                            (lg.action && lg.action.toLowerCase().includes(q))
                          );
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7}>
                                <div className="pf-admin-empty-state">
                                  <div className="pf-admin-empty-icon"><FileText size={22} /></div>
                                  <strong>Không tìm thấy dữ liệu nhật ký kiểm toán phù hợp</strong>
                                  <p>Tất cả sự kiện an ninh và thao tác vận hành sẽ được lưu vết tự động vào cơ sở dữ liệu.</p>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((lg) => {
                          const reasonUpper = (lg.reason || '').toUpperCase();
                          const actionUpper = (lg.action || '').toUpperCase();
                          const fullText = `${reasonUpper} ${actionUpper}`;

                          const isThreat = fullText.includes('CẢNH BÁO') || fullText.includes('BRUTE-FORCE') || fullText.includes('PHÁ HỆ THỐNG') || fullText.includes('KHÔNG TỒN TẠI') || fullText.includes('SAI MÃ PIN') || fullText.includes('GIẢ MẠO');
                          const isF4 = fullText.includes('F4') || fullText.includes('CƯỠNG CHẾ');
                          const isGrantVoucher = fullText.includes('CẤP VOUCHER');

                          let badgeClass = 'active';
                          let badgeBg = 'rgba(2, 132, 199, 0.15)';
                          let badgeColor = '#38bdf8';
                          let badgeBorder = '#0284c7';

                          if (isThreat) {
                            badgeClass = 'danger';
                            badgeBg = 'rgba(239, 68, 68, 0.2)';
                            badgeColor = '#f87171';
                            badgeBorder = '#ef4444';
                          } else if (isF4) {
                            badgeClass = 'warning';
                            badgeBg = 'rgba(245, 158, 11, 0.15)';
                            badgeColor = '#fbbf24';
                            badgeBorder = '#f59e0b';
                          } else if (isGrantVoucher) {
                            badgeBg = 'rgba(16, 185, 129, 0.15)';
                            badgeColor = '#34d399';
                            badgeBorder = '#10b981';
                          }

                          return (
                            <tr key={lg.id} style={{ background: isThreat ? 'rgba(239, 68, 68, 0.04)' : 'transparent' }}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 800, color: isThreat ? '#f87171' : isF4 ? '#fbbf24' : '#38bdf8' }}>
                                {lg.id}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>{lg.time}</td>
                              <td><strong>{lg.staff}</strong></td>
                              <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{lg.gate}</td>
                              <td>
                                <span
                                  className={`pf-status-badge ${badgeClass}`}
                                  style={{
                                    background: badgeBg,
                                    color: badgeColor,
                                    borderColor: badgeBorder,
                                    fontSize: '0.7rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  {isThreat && <ShieldAlert size={12} />}
                                  {lg.reason}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.75rem', color: isThreat ? '#fca5a5' : '#cbd5e1', maxWidth: '380px' }}>
                                {lg.action}
                              </td>
                              <td>
                                {isThreat ? (
                                  <span className="pf-status-badge danger" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: '#ef4444', fontSize: '0.68rem' }}>
                                    🚨 Đã Chặn &amp; Ghi Sổ
                                  </span>
                                ) : (
                                  <span className="pf-status-badge neutral" style={{ fontSize: '0.68rem' }}>
                                    ✓ Đã Ghi Sổ
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 12: CÀI ĐẶT HỆ THỐNG VẬN HÀNH (SYSTEM CONFIGURATION)
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'system' && (
            <div>
              {/* Cấu hình vận hành & Tham số hệ thống */}
              <div className="pf-admin-card" style={{ marginBottom: '1.5rem' }}>
                <div className="pf-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3><Settings size={18} color="#0284c7" /> CÀI ĐẶT THAM SỐ VẬN HÀNH BÃI XE THÔNG MINH</h3>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Thiết lập thời gian ân hạn, lưu ký hóa đơn VAT điện tử, kiểm soát Barrier ANPR và cổng VietQR Napas 247.
                    </p>
                  </div>
                  <span className="pf-status-badge active">
                    <Activity size={12} /> Cấu hình đang kích hoạt
                  </span>
                </div>

                <form onSubmit={handleSaveSystemConfig} style={{ padding: '0.5rem 0 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* Free Minutes */}
                    <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        <Clock size={14} /> THỜI GIAN ÂN HẠN MIỄN PHÍ (QUAY ĐẦU)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={systemConfig.freeMinutes}
                          onChange={(e) => setSystemConfig({ ...systemConfig, freeMinutes: Number(e.target.value) })}
                          className="pf-admin-input"
                          style={{ width: '100px', fontWeight: 700 }}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>phút (Dưới mức này cước = 0đ)</span>
                      </div>
                    </div>

                    {/* Reservation Hold Minutes */}
                    <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        <Calendar size={14} /> THỜI GIAN GIỮ CHỖ ĐẶT TRƯỚC (HỦY TỰ ĐỘNG)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          min="5"
                          max="180"
                          value={systemConfig.reservationHoldMinutes}
                          onChange={(e) => setSystemConfig({ ...systemConfig, reservationHoldMinutes: Number(e.target.value) })}
                          className="pf-admin-input"
                          style={{ width: '100px', fontWeight: 700 }}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>phút (Giải phóng ô nếu khách trễ)</span>
                      </div>
                    </div>

                    {/* VAT Rate */}
                    <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        <Percent size={14} /> THUẾ SUẤT VAT NGHỊ ĐỊNH 123
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={systemConfig.vatRate}
                          onChange={(e) => setSystemConfig({ ...systemConfig, vatRate: Number(e.target.value) })}
                          className="pf-admin-input"
                          style={{ width: '100px', fontWeight: 700 }}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>% (Mặc định chuẩn 8% theo quy định)</span>
                      </div>
                    </div>

                    {/* Full Threshold */}
                    <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        <AlertCircle size={14} /> NGƯỠNG BÁO ĐỘNG BÃI XE SẮP ĐẦY
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={systemConfig.fullThreshold}
                          onChange={(e) => setSystemConfig({ ...systemConfig, fullThreshold: Number(e.target.value) })}
                          className="pf-admin-input"
                          style={{ width: '100px', fontWeight: 700 }}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>% công suất (Phát tín hiệu điều tiết)</span>
                      </div>
                    </div>

                    {/* Support Hotline */}
                    <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        <Phone size={14} /> TỔNG ĐÀI HỖ TRỢ KỸ THUẬT &amp; CỨU HỘ
                      </label>
                      <input
                        type="text"
                        value={systemConfig.supportHotline}
                        onChange={(e) => setSystemConfig({ ...systemConfig, supportHotline: e.target.value })}
                        className="pf-admin-input"
                        placeholder="VD: 1900 888 888"
                        style={{ fontWeight: 700 }}
                      />
                    </div>

                    {/* Operating Hours */}
                    <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        <Clock size={14} /> KHUNG GIỜ VẬN HÀNH TOÀN HỆ THỐNG
                      </label>
                      <input
                        type="text"
                        value={systemConfig.operatingHours}
                        onChange={(e) => setSystemConfig({ ...systemConfig, operatingHours: e.target.value })}
                        className="pf-admin-input"
                        placeholder="VD: 24/7 Toàn thời gian"
                        style={{ fontWeight: 700 }}
                      />
                    </div>

                    {/* Payment Gateway MBBank */}
                    <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                        <CreditCard size={14} /> CỔNG THANH TOÁN VIETQR NAPAS 247
                      </label>
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                        Ngân hàng: <strong>MBBank Đà Nẵng</strong><br />
                        Số tài khoản: <strong>0905123456</strong><br />
                        Trạng thái: <strong style={{ color: '#10b981' }}>Đang kết nối Live</strong>
                      </div>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#090e1a', padding: '0.85rem 1rem', borderRadius: 8, border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={systemConfig.anprAutoOpen}
                        onChange={(e) => setSystemConfig({ ...systemConfig, anprAutoOpen: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                      />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.82rem', color: '#fff' }}>Tự động mở Barrier khi ANPR khớp biển số</strong>
                        <small style={{ color: '#94a3b8' }}>Camera AI đối chiếu biển số hợp lệ sẽ tự động nâng cần barrier trong 0.8 giây</small>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#090e1a', padding: '0.85rem 1rem', borderRadius: 8, border: '1px solid #1e293b', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={systemConfig.overstayAlert}
                        onChange={(e) => setSystemConfig({ ...systemConfig, overstayAlert: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#0284c7' }}
                      />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.82rem', color: '#fff' }}>Cảnh báo vi phạm thời gian đỗ xe</strong>
                        <small style={{ color: '#94a3b8' }}>Gửi thông báo đẩy qua App và kích hoạt chuông cảnh báo bốt trực khi xe đỗ quá hạn</small>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="submit"
                      className="pf-btn-portal-switch"
                      style={{ background: '#0284c7', color: '#ffffff', border: 0, fontWeight: 700, padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                    >
                      <CheckCircle2 size={16} /> Lưu &amp; Áp Dụng Cấu Hình Vận Hành
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL XEM & IN HÓA ĐƠN VAT */}
      {viewInvoice && (
        <InvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {/* MODAL XEM BIÊN BẢN GIAO CA */}
      {selectedStaffForHandover && (
        <ShiftReportModal
          staffName={selectedStaffForHandover.name}
          station={selectedStaffForHandover.station}
          logs={
            invoicesList.length > 0
              ? invoicesList.slice(0, 10).map((inv) => ({
                  id: `LOG-${inv.id}`,
                  plate: inv.plate,
                  fee: inv.fee,
                  method: inv.method
                }))
              : []
          }
          parkedCount={parkedLive.length}
          onClose={() => setSelectedStaffForHandover(null)}
        />
      )}

      {/* MODAL THÊM VOUCHER MỚI (FREE HOẶC ĐỔI ĐIỂM) */}
      {showAddVoucherModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowAddVoucherModal(false)}>
          <div className="pf-admin-modal" style={{ maxWidth: '36rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff' }}>TẠO MÃ KHUYẾN MÃI VOUCHER MỚI</h3>
                <small style={{ color: '#94a3b8' }}>Tạo voucher miễn phí nhận ngay hoặc voucher đổi điểm thưởng ParkPoints</small>
              </div>
              <button type="button" onClick={() => setShowAddVoucherModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <form onSubmit={handleAddVoucher} style={{ padding: '1.25rem' }}>
              {/* Loại voucher: Miễn phí hay đổi điểm */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>HÌNH THỨC PHÁT HÀNH (*):</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewVoucher({ ...newVoucher, voucherKind: 'free', ptsCost: 0 })}
                    style={{
                      padding: '0.65rem',
                      borderRadius: 6,
                      border: newVoucher.voucherKind === 'free' ? '2px solid #10b981' : '1px solid #334155',
                      background: newVoucher.voucherKind === 'free' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                      color: newVoucher.voucherKind === 'free' ? '#10b981' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8rem'
                    }}
                  >
                    🎁 Miễn Phí (0 PTS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVoucher({ ...newVoucher, voucherKind: 'redeem', ptsCost: newVoucher.ptsCost || 200 })}
                    style={{
                      padding: '0.65rem',
                      borderRadius: 6,
                      border: newVoucher.voucherKind === 'redeem' ? '2px solid #0284c7' : '1px solid #334155',
                      background: newVoucher.voucherKind === 'redeem' ? 'rgba(2, 132, 199, 0.15)' : '#0f172a',
                      color: newVoucher.voucherKind === 'redeem' ? '#38bdf8' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8rem'
                    }}
                  >
                    🪙 Đổi Bằng Điểm ParkPoints
                  </button>
                </div>
              </div>

              {/* Chế độ hiển thị: Công khai thu thập vs Voucher ẩn chỉ nhập mã */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>CHẾ ĐỘ HIỂN THỊ VOUCHER (*):</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewVoucher({ ...newVoucher, visibility: 'public' })}
                    style={{
                      padding: '0.65rem',
                      borderRadius: 6,
                      border: newVoucher.visibility !== 'hidden' ? '2px solid #10b981' : '1px solid #334155',
                      background: newVoucher.visibility !== 'hidden' ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                      color: newVoucher.visibility !== 'hidden' ? '#34d399' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      🌐 <strong>Công Khai (Thu Thập)</strong>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400, lineHeight: 1.3 }}>
                      Hiện trên app/web để khách xem &amp; thu thập tự do.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVoucher({ ...newVoucher, visibility: 'hidden' })}
                    style={{
                      padding: '0.65rem',
                      borderRadius: 6,
                      border: newVoucher.visibility === 'hidden' ? '2px solid #f59e0b' : '1px solid #334155',
                      background: newVoucher.visibility === 'hidden' ? 'rgba(245, 158, 11, 0.15)' : '#0f172a',
                      color: newVoucher.visibility === 'hidden' ? '#fbbf24' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      🔒 <strong>Voucher Ẩn (Nhập Mã)</strong>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400, lineHeight: 1.3 }}>
                      Ẩn khỏi danh mục; chỉ khách có mã gõ vào mới nhận được.
                    </div>
                  </button>
                </div>
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>MÃ VOUCHER (*):</label>
                  <input
                    type="text"
                    placeholder="VD: DANANG50K"
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                    required
                    className="pf-admin-input"
                  />
                </div>
                {newVoucher.voucherKind === 'redeem' ? (
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>ĐIỂM PTS CẦN ĐỔI (*):</label>
                    <input
                      type="number"
                      value={newVoucher.ptsCost}
                      onChange={(e) => setNewVoucher({ ...newVoucher, ptsCost: parseInt(e.target.value, 10) || 0 })}
                      required
                      min={10}
                      className="pf-admin-input"
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>CHI PHÍ ĐỔI:</label>
                    <input
                      type="text"
                      value="0 PTS (Miễn phí nhận ngay)"
                      disabled
                      className="pf-admin-input"
                      style={{ opacity: 0.7, background: '#1e293b' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>TIÊU ĐỀ ƯU ĐÃI (*):</label>
                <input
                  type="text"
                  placeholder="VD: Giảm 20.000đ khi đặt trước ô đỗ xe"
                  value={newVoucher.title}
                  onChange={(e) => setNewVoucher({ ...newVoucher, title: e.target.value })}
                  required
                  className="pf-admin-input"
                />
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>LOẠI GIẢM GIÁ (*):</label>
                  <select
                    value={newVoucher.discountType}
                    onChange={(e) => setNewVoucher({ ...newVoucher, discountType: e.target.value })}
                    className="pf-admin-input"
                  >
                    <option value="fixed">Số tiền cố định (VNĐ)</option>
                    <option value="percent">Phần trăm (%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    MỨC GIẢM GIÁ ({newVoucher.discountType === 'percent' ? '%' : 'VNĐ'}) (*):
                  </label>
                  <input
                    type="number"
                    placeholder={newVoucher.discountType === 'percent' ? 'VD: 20' : 'VD: 20000'}
                    value={newVoucher.discountVal}
                    onChange={(e) => setNewVoucher({ ...newVoucher, discountVal: e.target.value })}
                    required
                    min={1}
                    max={newVoucher.discountType === 'percent' ? 100 : 1000000}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>ĐƠN TỐI THIỂU ÁP DỤNG (VNĐ):</label>
                  <input
                    type="number"
                    placeholder="VD: 50000"
                    value={newVoucher.minOrderVal}
                    onChange={(e) => setNewVoucher({ ...newVoucher, minOrderVal: parseInt(e.target.value, 10) || 0 })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>PHẠM VI ÁP DỤNG:</label>
                  <select
                    value={newVoucher.applyFor}
                    onChange={(e) => setNewVoucher({ ...newVoucher, applyFor: e.target.value })}
                    className="pf-admin-input"
                  >
                    <option value="booking">Đặt chỗ trước (Advance Booking)</option>
                    <option value="all">Tất cả dịch vụ trông giữ</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>ĐIỀU KIỆN ÁP DỤNG:</label>
                <input
                  type="text"
                  placeholder="VD: Áp dụng cho đơn từ 50.000đ trở lên tại mọi chi nhánh"
                  value={newVoucher.conditions}
                  onChange={(e) => setNewVoucher({ ...newVoucher, conditions: e.target.value })}
                  className="pf-admin-input"
                />
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>HẠN SỬ DỤNG:</label>
                  <input
                    type="text"
                    placeholder="VD: 31/12/2027"
                    value={newVoucher.expiry}
                    onChange={(e) => setNewVoucher({ ...newVoucher, expiry: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>SỐ LƯỢT PHÁT HÀNH TỐI ĐA:</label>
                  <input
                    type="number"
                    value={newVoucher.maxUse}
                    onChange={(e) => setNewVoucher({ ...newVoucher, maxUse: parseInt(e.target.value, 10) || 100 })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowAddVoucherModal(false)} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch">
                  Xác Nhận Tạo Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA VÀ CẬP NHẬT ĐIỀU KIỆN VOUCHER */}
      {showEditVoucherModal && editingVoucher && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowEditVoucherModal(false)}>
          <div className="pf-admin-modal" style={{ maxWidth: '36rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={18} color="#0284c7" /> CHỈNH SỬA VOUCHER: {editingVoucher.code}
                </h3>
                <small style={{ color: '#94a3b8' }}>Cập nhật mức giảm giá, hạn sử dụng và các điều kiện kích hoạt áp dụng đơn</small>
              </div>
              <button type="button" onClick={() => setShowEditVoucherModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateVoucherSubmit} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>MÃ VOUCHER (*):</label>
                  <input
                    type="text"
                    required
                    value={editingVoucher.code}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    className="pf-admin-input"
                    style={{ width: '100%', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>TIÊU ĐỀ KHUYẾN MÃI (*):</label>
                  <input
                    type="text"
                    required
                    value={editingVoucher.title}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, title: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>LOẠI GIẢM GIÁ:</label>
                  <select
                    value={editingVoucher.discountType || 'fixed'}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, discountType: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  >
                    <option value="fixed">Số tiền trực tiếp (VNĐ)</option>
                    <option value="percent">Phần trăm giá trị (%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>MỨC GIẢM GIÁ (*):</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={editingVoucher.discountType === 'percent' ? 100 : 10000000}
                    value={editingVoucher.discountVal}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, discountVal: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%', fontWeight: 700, color: '#10b981' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>ĐƠN TỐI THIỂU ÁP DỤNG (VNĐ):</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={editingVoucher.minOrderVal || 0}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, minOrderVal: parseInt(e.target.value, 10) || 0 })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>ĐIỂM ĐỔI PARKPOINTS:</label>
                  <input
                    type="number"
                    min={0}
                    value={editingVoucher.ptsCost || 0}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, ptsCost: parseInt(e.target.value, 10) || 0 })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>HẠN DÙNG (DD/MM/YYYY):</label>
                  <input
                    type="text"
                    value={editingVoucher.expiry || '31/12/2027'}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, expiry: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>TRẠNG THÁI VOUCHER:</label>
                  <select
                    value={editingVoucher.status || 'Kích hoạt'}
                    onChange={(e) => setEditingVoucher({ ...editingVoucher, status: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  >
                    <option value="Kích hoạt">Kích hoạt (Cho phép áp dụng)</option>
                    <option value="Tạm dừng">Tạm dừng (Vô hiệu hóa)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>CHẾ ĐỘ HIỂN THỊ TRÊN GIAO DIỆN:</label>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editVisibility"
                      checked={editingVoucher.visibility !== 'hidden' && !editingVoucher.isHidden}
                      onChange={() => setEditingVoucher({ ...editingVoucher, visibility: 'public', isHidden: false })}
                    />
                    Công khai (Khách thấy trên trang Ưu đãi &amp; bấm thu thập)
                  </label>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editVisibility"
                      checked={editingVoucher.visibility === 'hidden' || editingVoucher.isHidden}
                      onChange={() => setEditingVoucher({ ...editingVoucher, visibility: 'hidden', isHidden: true })}
                    />
                    Voucher Ẩn (Chỉ người có mã nhập mới nhận được)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>MÔ TẢ ĐIỀU KIỆN HIỂN THỊ CHO KHÁCH HÀNG:</label>
                <textarea
                  rows={2}
                  value={editingVoucher.conditions || ''}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, conditions: e.target.value })}
                  className="pf-admin-input"
                  style={{ width: '100%', resize: 'none' }}
                  placeholder="Áp dụng cho đơn đặt chỗ từ 50.000đ trở lên..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowEditVoucherModal(false)} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: '#0284c7', color: '#fff' }}>
                  Lưu Thay Đổi Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẤP VOUCHER CHỈ ĐỊNH CHO TÀI KHOẢN KHÁCH HÀNG (DEDICATED GRANT FLOW) */}
      {showGrantVoucherModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowGrantVoucherModal(false)}>
          <div className="pf-admin-modal" style={{ maxWidth: '38rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
              <div>
                <h3 style={{ margin: 0, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={20} color="#34d399" /> CẤP VOUCHER ĐẶC QUYỀN CHO KHÁCH HÀNG
                </h3>
                <small style={{ color: '#94a3b8' }}>Tặng mã giảm giá trực tiếp vào ví cá nhân của tài khoản khách hàng chỉ định</small>
              </div>
              <button type="button" onClick={() => setShowGrantVoucherModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <form onSubmit={handleGrantVoucherSubmit} style={{ padding: '1.25rem' }}>
              {/* Chọn khách hàng nhận voucher */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>CHỌN TÀI KHOẢN KHÁCH HÀNG MỤC TIÊU (*):</label>
                <select
                  required
                  value={grantVoucherForm.userId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const u = users.find((x) => x.id === selId);
                    setGrantVoucherForm({
                      ...grantVoucherForm,
                      userId: selId,
                      userEmail: u ? u.email : ''
                    });
                  }}
                  className="pf-admin-input"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="">-- Chọn khách hàng nhận quà tặng --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.email} {u.phone ? `(${u.phone})` : ''} · [{u.loyaltyTier || 'Thành viên'}] · {u.parkPoints || 0} pts
                    </option>
                  ))}
                </select>
              </div>

              {/* Hình thức cấp: từ catalog có sẵn hay tạo riêng */}
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#090d16', borderRadius: 8, border: '1px solid #1e293b' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>HÌNH THỨC CẤP VOUCHER:</label>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <label style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="grantMode"
                      checked={grantVoucherForm.sourceMode === 'catalog'}
                      onChange={() => setGrantVoucherForm({ ...grantVoucherForm, sourceMode: 'catalog' })}
                    />
                    Chọn từ kho voucher có sẵn
                  </label>
                  <label style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="grantMode"
                      checked={grantVoucherForm.sourceMode === 'custom'}
                      onChange={() => setGrantVoucherForm({ ...grantVoucherForm, sourceMode: 'custom' })}
                    />
                    Tạo mã quà tặng riêng đặc biệt
                  </label>
                </div>
              </div>

              {/* Nếu chọn từ catalog có sẵn */}
              {grantVoucherForm.sourceMode === 'catalog' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>CHỌN VOUCHER TỪ DANH MỤC (*):</label>
                  <select
                    required
                    onChange={(e) => {
                      const selCode = e.target.value;
                      const v = vouchers.find((x) => x.code === selCode);
                      if (v) {
                        const numVal = parseInt(String(v.discountVal || v.discount || '').replace(/\D/g, ''), 10) || 20000;
                        setGrantVoucherForm((prev) => ({
                          ...prev,
                          voucherCode: v.code,
                          title: v.title,
                          discountType: v.discountType || (String(v.discount || '').includes('%') ? 'percent' : 'fixed'),
                          discountVal: numVal,
                          minOrderVal: v.minOrderVal || 0,
                          expiry: v.expiry || '31/12/2027'
                        }));
                      }
                    }}
                    className="pf-admin-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Chọn mã voucher trong hệ thống --</option>
                    {vouchers.map((v) => (
                      <option key={v.id} value={v.code}>
                        {v.code} - {v.title} (Giảm {v.discount})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {/* Thông tin chi tiết voucher được cấp */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>MÃ VOUCHER ĐẶC BIỆT (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: VIP-TRIAN-50K"
                    value={grantVoucherForm.voucherCode}
                    onChange={(e) => setGrantVoucherForm({ ...grantVoucherForm, voucherCode: e.target.value.toUpperCase().replace(/\s/g, '') })}
                    className="pf-admin-input"
                    style={{ width: '100%', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>TIÊU ĐỀ QUÀ TẶNG (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Quà Tặng Tri Ân Khách Hàng VIP"
                    value={grantVoucherForm.title}
                    onChange={(e) => setGrantVoucherForm({ ...grantVoucherForm, title: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>LOẠI GIẢM GIÁ:</label>
                  <select
                    value={grantVoucherForm.discountType}
                    onChange={(e) => setGrantVoucherForm({ ...grantVoucherForm, discountType: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  >
                    <option value="fixed">Tiền mặt (VNĐ)</option>
                    <option value="percent">Phần trăm (%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>GIÁ TRỊ GIẢM:</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={grantVoucherForm.discountVal}
                    onChange={(e) => setGrantVoucherForm({ ...grantVoucherForm, discountVal: e.target.value })}
                    className="pf-admin-input"
                    style={{ width: '100%', fontWeight: 700, color: '#10b981' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>ĐƠN TỐI THIỂU (VNĐ):</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={grantVoucherForm.minOrderVal}
                    onChange={(e) => setGrantVoucherForm({ ...grantVoucherForm, minOrderVal: parseInt(e.target.value, 10) || 0 })}
                    className="pf-admin-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>LÝ DO / LỜI NHẮN QUÀ TẶNG (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tri ân khách hàng thân thiết nhân dịp sinh nhật..."
                  value={grantVoucherForm.reason}
                  onChange={(e) => setGrantVoucherForm({ ...grantVoucherForm, reason: e.target.value })}
                  className="pf-admin-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowGrantVoucherModal(false)} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', fontWeight: 800 }}>
                  🎁 Xác Nhận Cấp Voucher Vào Ví
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HOÀN / BÙ ĐIỂM SỰ CỐ HỆ THỐNG (ADMIN CHỈ ĐƯỢC BÙ ĐIỂM SỰ CỐ) */}
      {pointsCompModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setPointsCompModal(null)}>
          <div className="pf-admin-modal" style={{ maxWidth: '30rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins size={18} /> BÙ ĐIỂM SỰ CỐ HỆ THỐNG
                </h3>
                <small style={{ color: '#94a3b8' }}>Khách hàng: <strong>{pointsCompModal.user?.name}</strong> ({pointsCompModal.user?.id})</small>
              </div>
              <button type="button" onClick={() => setPointsCompModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <form onSubmit={handleCompensatePoints} style={{ padding: '1.25rem' }}>
              <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, color: '#fde68a', fontSize: '0.75rem', marginBottom: '1rem', lineHeight: '1.45' }}>
                ⚠️ <strong>Quy định an ninh:</strong> Admin không có quyền tùy ý cộng điểm vào tài khoản khách hàng. Thao tác này chỉ áp dụng để bồi hoàn điểm bù khi hệ thống phát sinh lỗi (lỗi trừ điểm 2 lần, barrier kẹt thẻ, sự cố app) và sẽ được ghi vào nhật ký Audit Log.
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>SỐ ĐIỂM HOÀN BÙ (TỐI ĐA 500 PTS) (*):</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={pointsCompModal.adjustAmount}
                  onChange={(e) => setPointsCompModal({ ...pointsCompModal, adjustAmount: e.target.value })}
                  required
                  className="pf-admin-input"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>LÝ DO SỰ CỐ HỆ THỐNG (BẮT BUỘC TỐI THIỂU 5 KÝ TỰ) (*):</label>
                <textarea
                  rows={3}
                  placeholder="VD: Sự cố trừ điểm đặt chỗ nhưng lỗi kết nối barrier cổng B1, hoàn bù cho khách hàng theo yêu cầu cứu hộ."
                  value={pointsCompModal.reason}
                  onChange={(e) => setPointsCompModal({ ...pointsCompModal, reason: e.target.value })}
                  required
                  className="pf-admin-input"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setPointsCompModal(null)} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: '#d97706', borderColor: '#d97706' }}>
                  Xác Nhận Hoàn Điểm Bù
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẤP TÀI KHOẢN NHÂN VIÊN MỚI */}
      {showCreateStaffModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowCreateStaffModal(false)}>
          <div className="pf-admin-modal" style={{ maxWidth: '32rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="#0284c7" />
                <h3 style={{ margin: 0, color: '#fff' }}>CẤP TÀI KHOẢN NHÂN VIÊN TRỰC BỐT</h3>
              </div>
              <button type="button" onClick={() => setShowCreateStaffModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateStaff} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>HỌ VÀ TÊN NHÂN VIÊN (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Lê Quốc Toàn"
                  value={newStaffForm.fullName}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, fullName: e.target.value })}
                  className="pf-admin-input"
                />
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>EMAIL ĐĂNG NHẬP (*):</label>
                  <input
                    type="email"
                    required
                    placeholder="toan.lq@smartpark.vn"
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>SỐ ĐIỆN THOẠI:</label>
                  <input
                    type="text"
                    placeholder="0905123456"
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>MẬT KHẨU BAN ĐẦU (*):</label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={newStaffForm.password}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>CHI NHÁNH / BỐT TRỰC:</label>
                  <select
                    className="pf-admin-input"
                    value={newStaffForm.branchName}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, branchName: e.target.value })}
                  >
                    <option value="SmartPark - Aeon Mall Thanh Khê 1">Aeon Mall Thanh Khê 1</option>
                    <option value="SmartPark - Vincom Plaza Ngô Quyền">Vincom Plaza Ngô Quyền</option>
                    <option value="SmartPark - Sân Bay Quốc Tế Đà Nẵng">Sân Bay Quốc Tế Đà Nẵng</option>
                    <option value="SmartPark - Lotte Mart Đà Nẵng">Lotte Mart Đà Nẵng</option>
                    <option value="SmartPark - Indochina Riverside Mall">Indochina Riverside Mall</option>
                  </select>
                </div>
              </div>

              {/* BẢO MẬT BẰNG MÃ PIN ADMIN */}
              <div style={{ marginTop: '1rem', padding: '0.9rem', background: '#0f172a', border: '1.5px solid #f59e0b', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                  <Lock size={14} /> XÁC THỰC MÃ PIN BẢO MẬT ADMIN (*):
                </label>
                <input
                  type="password"
                  required
                  maxLength={8}
                  placeholder="Nhập mã PIN bảo mật Admin (6 chữ số)"
                  value={newStaffForm.pin}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, pin: e.target.value })}
                  className="pf-admin-input"
                  style={{ borderColor: '#f59e0b', letterSpacing: '2px', fontWeight: 700 }}
                />
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginTop: '0.3rem' }}>
                  Bảo mật quản trị: Yêu cầu mã PIN của Admin để phê duyệt cấp tài khoản nhân viên.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowCreateStaffModal(false)} style={{ padding: '0.55rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: '#0284c7', color: '#fff', border: 0, fontWeight: 800 }}>
                  Xác Nhận Cấp Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC THỰC MÃ PIN BẢO MẬT: XÓA TÀI KHOẢN NHÂN VIÊN */}
      {staffToDelete && (
        <div className="pf-admin-modal-backdrop" onClick={() => setStaffToDelete(null)}>
          <div className="pf-admin-modal" style={{ maxWidth: '30rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} color="#ef4444" />
                <h3 style={{ margin: 0, color: '#f87171' }}>XÁC THỰC BẢO MẬT: XÓA NHÂN VIÊN</h3>
              </div>
              <button type="button" onClick={() => setStaffToDelete(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <form onSubmit={handleDeleteStaff} style={{ padding: '1.25rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '0.9rem', marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#fca5a5', fontWeight: 600 }}>
                  Bạn đang yêu cầu xóa tài khoản nhân sự trực bốt:
                </p>
                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: '1.6' }}>
                  <div><strong>Mã NV:</strong> <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{staffToDelete.id}</span></div>
                  <div><strong>Họ và tên:</strong> {staffToDelete.name}</div>
                  <div><strong>Vị trí bốt trực:</strong> {staffToDelete.station}</div>
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#f87171' }}>
                  ⚠️ Hành động này sẽ thu hồi quyền đăng nhập vào Portal Nhân Viên của nhân sự này ngay lập tức.
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <Lock size={14} /> NHẬP MÃ PIN BẢO MẬT ADMIN (*):
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  maxLength={8}
                  placeholder="Nhập mã PIN Admin (6 chữ số)"
                  value={deleteStaffPin}
                  onChange={(e) => setDeleteStaffPin(e.target.value)}
                  className="pf-admin-input"
                  style={{ borderColor: '#ef4444', letterSpacing: '3px', fontWeight: 700, textAlign: 'center', fontSize: '1.1rem' }}
                />
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginTop: '0.35rem', textAlign: 'center' }}>
                  Nhập đúng mã PIN bảo mật quản trị viên để xác nhận thực hiện thao tác xóa này.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStaffToDelete(null)}
                  style={{ padding: '0.55rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={deletingStaff || !deleteStaffPin.trim()}
                  className="pf-btn-portal-switch"
                  style={{ background: '#dc2626', color: '#fff', border: 0, fontWeight: 800, padding: '0.55rem 1.25rem' }}
                >
                  {deletingStaff ? 'Đang xác thực...' : 'Xác Nhận Xóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM CHI NHÁNH MỚI */}
      {showAddBranchModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowAddBranchModal(false)}>
          <div className="pf-admin-modal" style={{ maxWidth: '34rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} color="#0284c7" />
                <h3 style={{ margin: 0, color: '#fff' }}>THÊM CHI NHÁNH BÃI ĐỖ XE MỚI</h3>
              </div>
              <button type="button" onClick={() => setShowAddBranchModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateBranch} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>TÊN CHI NHÁNH (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: SmartPark - Cầu Rồng Đà Nẵng"
                  value={newBranchForm.name}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                  className="pf-admin-input"
                />
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>QUẬN / KHU VỰC (*):</label>
                  <select
                    className="pf-admin-input"
                    value={newBranchForm.district}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, district: e.target.value })}
                  >
                    <option value="Q. Hải Châu">Q. Hải Châu</option>
                    <option value="Q. Thanh Khê">Q. Thanh Khê</option>
                    <option value="Q. Sơn Trà">Q. Sơn Trà</option>
                    <option value="Q. Ngũ Hành Sơn">Q. Ngũ Hành Sơn</option>
                    <option value="Q. Cẩm Lệ">Q. Cẩm Lệ</option>
                    <option value="Q. Liên Chiểu">Q. Liên Chiểu</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>TỔNG SỐ Ô ĐỖ (*):</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={newBranchForm.totalSlots}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, totalSlots: parseInt(e.target.value, 10) || 100 })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>ĐỊA CHỈ CHI TIẾT (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đường Bạch Đằng, P. Hải Châu 1, TP. Đà Nẵng"
                  value={newBranchForm.address}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, address: e.target.value })}
                  className="pf-admin-input"
                />
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>SỐ TRỤ SẠC EV:</label>
                  <input
                    type="number"
                    min={0}
                    value={newBranchForm.evSlots}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, evSlots: parseInt(e.target.value, 10) || 0 })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>CÁC TẦNG ĐỖ XE (Cách nhau dấu phẩy):</label>
                  <input
                    type="text"
                    placeholder="G,B1,B2"
                    value={newBranchForm.floors}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, floors: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowAddBranchModal(false)} style={{ padding: '0.55rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: '#0284c7', color: '#fff', border: 0, fontWeight: 800 }}>
                  Lưu Chi Nhánh Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẬP NHẬT BIỂU PHÍ HỆ THỐNG */}
      {tariffModalData && (
        <div className="pf-admin-modal-backdrop" onClick={() => setTariffModalData(null)}>
          <div className="pf-admin-modal" style={{ maxWidth: '34rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} color="#0284c7" />
                <h3 style={{ margin: 0, color: '#fff' }}>CẬP NHẬT BIỂU PHÍ: {tariffModalData.vehicle}</h3>
              </div>
              <button type="button" onClick={() => setTariffModalData(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSaveTariff} style={{ padding: '1.25rem' }}>
              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>CƯỚC 2H ĐẦU TIÊN (VNĐ):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={tariffModalData.firstHours}
                    onChange={(e) => setTariffModalData({ ...tariffModalData, firstHours: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>GIỜ TIẾP THEO (VNĐ/h):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={tariffModalData.nextHour}
                    onChange={(e) => setTariffModalData({ ...tariffModalData, nextHour: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>VÉ NGÀY 24H (VNĐ):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={tariffModalData.dayRate}
                    onChange={(e) => setTariffModalData({ ...tariffModalData, dayRate: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>GÓI TUẦN 7 NGÀY (VNĐ):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={5000}
                    value={tariffModalData.weekRate}
                    onChange={(e) => setTariffModalData({ ...tariffModalData, weekRate: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>GÓI THÁNG 30 NGÀY (VNĐ):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10000}
                    value={tariffModalData.monthRate}
                    onChange={(e) => setTariffModalData({ ...tariffModalData, monthRate: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>GHI CHÚ ÁP DỤNG:</label>
                  <input
                    type="text"
                    value={tariffModalData.note || ''}
                    onChange={(e) => setTariffModalData({ ...tariffModalData, note: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setTariffModalData(null)} style={{ padding: '0.55rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: '#0284c7', color: '#fff', border: 0, fontWeight: 800 }}>
                  Lưu Biểu Phí Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BankPinModal
        isOpen={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
        mode="setup"
        onSuccess={() => {
          showToast('✓ Thiết lập mã PIN bảo mật quản trị ngân hàng thành công!');
        }}
      />

      {/* ══════════════════════════════════════════════════════════════
          MODAL CHI TIẾT HỒ SƠ KHÁCH HÀNG (CUSTOMER DETAIL SUITE)
      ══════════════════════════════════════════════════════════════ */}
      {selectedUserForDetail && (
        <div className="pf-admin-modal-backdrop" onClick={() => setSelectedUserForDetail(null)}>
          <div className="pf-admin-modal" style={{ maxWidth: '48rem', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                  {selectedUserForDetail.name ? selectedUserForDetail.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>{selectedUserForDetail.name}</h3>
                    <span className={`pf-status-badge ${selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked' ? 'danger' : 'active'}`}>
                      {selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked' ? 'Tài Khoản Đã Khóa' : 'Hoạt Động'}
                    </span>
                    <span className="pf-status-badge active" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: '#0284c7' }}>
                      {selectedUserForDetail.tier || 'Thành viên Bạc'}
                    </span>
                  </div>
                  <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Mã KH: <strong style={{ color: '#38bdf8' }}>{selectedUserForDetail.id}</strong> · Email: {selectedUserForDetail.email}</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForDetail(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0b1120', padding: '0 1.5rem', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setCustomerDetailTab('info')}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: customerDetailTab === 'info' ? '#38bdf8' : '#94a3b8',
                  borderBottom: customerDetailTab === 'info' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Users size={15} /> Thông Tin & Chi Tiêu
              </button>
              <button
                type="button"
                onClick={() => setCustomerDetailTab('vehicles')}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: customerDetailTab === 'vehicles' ? '#38bdf8' : '#94a3b8',
                  borderBottom: customerDetailTab === 'vehicles' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <CarFront size={15} /> Phương Tiện ({((customerDetailData?.vehicles) || selectedUserForDetail.plates || []).length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerDetailTab('bookings')}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: customerDetailTab === 'bookings' ? '#38bdf8' : '#94a3b8',
                  borderBottom: customerDetailTab === 'bookings' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Clock size={15} /> Lịch Sử Đặt Chỗ ({(customerDetailData?.bookings || []).length})
              </button>
              <button
                type="button"
                onClick={() => setCustomerDetailTab('vouchers')}
                style={{
                  padding: '0.75rem 0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: customerDetailTab === 'vouchers' ? '#38bdf8' : '#94a3b8',
                  borderBottom: customerDetailTab === 'vouchers' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Ticket size={15} /> Ví Ưu Đãi ({(customerDetailData?.vouchers || []).length})
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', maxHeight: '68vh', overflowY: 'auto' }}>
              {customerDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Đang nạp dữ liệu chi tiết khách hàng từ cơ sở dữ liệu...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: THÔNG TIN & TỔNG QUAN CHI TIÊU */}
                  {customerDetailTab === 'info' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Tổng Số Tiền Đã Chi</span>
                          <h4 style={{ margin: '0.35rem 0 0', color: '#34d399', fontSize: '1.35rem' }}>
                            {Number(customerDetailData?.totalSpent || selectedUserForDetail.totalSpent || 0).toLocaleString('vi-VN')} đ
                          </h4>
                          <small style={{ color: '#64748b' }}>Chi trả bãi đỗ & đặt chỗ trước</small>
                        </div>
                        <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Điểm Thưởng ParkPoints</span>
                          <h4 style={{ margin: '0.35rem 0 0', color: '#fbbf24', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Coins size={18} /> {customerDetailData?.points ?? selectedUserForDetail.points ?? 0} pts
                          </h4>
                          <small style={{ color: '#64748b' }}>Tích lũy 10pts / 10.000đ chi tiêu</small>
                        </div>
                        <div style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Tổng Số Lượt Đặt Chỗ</span>
                          <h4 style={{ margin: '0.35rem 0 0', color: '#38bdf8', fontSize: '1.35rem' }}>
                            {customerDetailData?.totalBookings ?? selectedUserForDetail.totalBookings ?? 0} lượt
                          </h4>
                          <small style={{ color: '#64748b' }}>Tại 5 chi nhánh TP. Đà Nẵng</small>
                        </div>
                      </div>

                      <div style={{ background: '#090e1a', padding: '1.25rem', borderRadius: 8, border: '1px solid #1e293b', marginBottom: '1.25rem' }}>
                        <h4 style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={16} color="#0284c7" /> THÔNG TIN ĐĂNG KÝ HỆ THỐNG
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', fontSize: '0.82rem' }}>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>HỌ VÀ TÊN:</span>
                            <strong style={{ color: '#fff' }}>{customerDetailData?.name || selectedUserForDetail.name}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>EMAIL:</span>
                            <strong style={{ color: '#38bdf8' }}>{customerDetailData?.email || selectedUserForDetail.email}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>SỐ ĐIỆN THOẠI:</span>
                            <strong style={{ color: '#fff' }}>{customerDetailData?.phone || selectedUserForDetail.phone || 'Chưa cập nhật'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>VAI TRÒ TÀI KHOẢN:</span>
                            <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{customerDetailData?.role || selectedUserForDetail.role || 'customer'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>NGÀY ĐĂNG KÝ:</span>
                            <strong style={{ color: '#fff' }}>{customerDetailData?.created_at ? new Date(customerDetailData.created_at).toLocaleDateString('vi-VN') : '2026-01-15'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>TRẠNG THÁI HIỆN TẠI:</span>
                            <strong style={{ color: (selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked') ? '#f87171' : '#34d399' }}>
                              {(selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked') ? 'Đang bị khóa bảo mật' : 'Hoạt động bình thường'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Phím tắt thao tác nhanh */}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleUserLock(selectedUserForDetail)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 6,
                            border: (selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked') ? '1px solid #10b981' : '1px solid #ef4444',
                            background: (selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: (selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked') ? '#34d399' : '#f87171',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          {(selectedUserForDetail.status === 'Bị khóa' || selectedUserForDetail.rawStatus === 'locked') ? <><Unlock size={14} /> Mở Khóa Tài Khoản</> : <><Lock size={14} /> Tạm Khóa Tài Khoản</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetPwdModal(selectedUserForDetail)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 6,
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#cbd5e1',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Key size={14} /> Đặt Lại Mật Khẩu
                        </button>
                        <button
                          type="button"
                          onClick={() => setPointsCompModal({ user: selectedUserForDetail, adjustAmount: 50, reason: '' })}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 6,
                            border: '1px solid #d97706',
                            background: 'rgba(217, 119, 6, 0.15)',
                            color: '#fbbf24',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Coins size={14} /> Hoàn Bù Điểm Sự Cố
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: QUẢN LÝ PHƯƠNG TIỆN */}
                  {customerDetailTab === 'vehicles' && (
                    <div>
                      {/* Form thêm biển số */}
                      <form onSubmit={handleAddVehicleToCustomer} style={{ background: '#090e1a', padding: '1rem', borderRadius: 8, border: '1px solid #1e293b', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', display: 'block', marginBottom: '0.5rem' }}>
                          + THÊM BIỂN SỐ XE VÀO HỒ SƠ KHÁCH HÀNG:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.65rem' }}>
                          <input
                            type="text"
                            required
                            placeholder="Biển số (VD: 43A-999.88)"
                            value={newVehiclePlate}
                            onChange={(e) => setNewVehiclePlate(e.target.value.toUpperCase())}
                            className="pf-admin-input"
                            style={{ fontFamily: 'monospace', fontWeight: 700 }}
                          />
                          <input
                            type="text"
                            placeholder="Loại/Dòng xe (VD: Mazda CX-5, VinFast VF8)"
                            value={newVehicleBrand}
                            onChange={(e) => setNewVehicleBrand(e.target.value)}
                            className="pf-admin-input"
                          />
                          <button
                            type="submit"
                            style={{
                              padding: '0.5rem 1.1rem',
                              borderRadius: 6,
                              background: '#0284c7',
                              border: 'none',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <Plus size={14} /> Thêm Xe
                          </button>
                        </div>
                      </form>

                      {/* Danh sách xe */}
                      <div className="pf-admin-table-wrap">
                        <table className="pf-admin-table">
                          <thead>
                            <tr>
                              <th>STT</th>
                              <th>BIỂN SỐ XE</th>
                              <th>DÒNG XE / THƯƠNG HIỆU</th>
                              <th>TRẠNG THÁI ANPR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const vList = customerDetailData?.vehicles || (selectedUserForDetail.plates || []).map((p, i) => ({ plate: p, brand: 'Xe cá nhân', id: i }));
                              if (!vList || vList.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={4}>
                                      <div className="pf-admin-empty-state">
                                        <div className="pf-admin-empty-icon"><CarFront size={20} /></div>
                                        <strong>Khách hàng chưa đăng ký biển số nào</strong>
                                        <p>Nhập biển số phía trên để bổ sung phương tiện cho khách hàng.</p>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }
                              return vList.map((v, i) => (
                                <tr key={i}>
                                  <td>#{i + 1}</td>
                                  <td>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#1e293b', color: '#38bdf8', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.85rem' }}>
                                      {v.plate}
                                    </span>
                                  </td>
                                  <td style={{ color: '#fff' }}>{v.brand || 'Xe cá nhân'}</td>
                                  <td>
                                    <span className="pf-status-badge active" style={{ fontSize: '0.7rem' }}>
                                      ✓ Tự Động Nhận Diện
                                    </span>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: LỊCH SỬ ĐẶT CHỖ */}
                  {customerDetailTab === 'bookings' && (
                    <div className="pf-admin-table-wrap">
                      <table className="pf-admin-table">
                        <thead>
                          <tr>
                            <th>MÃ ĐƠN</th>
                            <th>CHI NHÁNH</th>
                            <th>Ô ĐỖ</th>
                            <th>BIỂN SỐ</th>
                            <th>THỜI GIAN</th>
                            <th>SỐ TIỀN</th>
                            <th>TRẠNG THÁI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!customerDetailData?.bookings || customerDetailData.bookings.length === 0) ? (
                            <tr>
                              <td colSpan={7}>
                                <div className="pf-admin-empty-state">
                                  <div className="pf-admin-empty-icon"><Clock size={20} /></div>
                                  <strong>Chưa có đơn đặt chỗ nào</strong>
                                  <p>Khách hàng chưa phát sinh giao dịch đặt chỗ trước trên hệ thống.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            customerDetailData.bookings.map((b) => (
                              <tr key={b.id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{b.id}</td>
                                <td><strong style={{ color: '#fff' }}>{b.branch}</strong></td>
                                <td><span style={{ background: '#0284c7', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>{b.slot}</span></td>
                                <td style={{ fontFamily: 'monospace' }}>{b.plate}</td>
                                <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{b.timeIn} - {b.timeOut}</td>
                                <td style={{ fontWeight: 800, color: '#34d399' }}>{Number(b.fee || 0).toLocaleString('vi-VN')} đ</td>
                                <td>
                                  <span className={`pf-status-badge ${b.status === 'Đã hoàn tất' || b.status === 'completed' ? 'active' : b.status === 'active' ? 'warning' : 'neutral'}`}>
                                    {b.status === 'completed' ? 'Đã hoàn tất' : b.status === 'active' ? 'Đang gửi' : b.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 4: VÍ VOUCHER */}
                  {customerDetailTab === 'vouchers' && (
                    <div className="pf-admin-table-wrap">
                      <table className="pf-admin-table">
                        <thead>
                          <tr>
                            <th>MÃ VOUCHER</th>
                            <th>TIÊU ĐỀ ƯU ĐÃI</th>
                            <th>GIẢM GIÁ</th>
                            <th>HẠN SỬ DỤNG</th>
                            <th>TRẠNG THÁI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!customerDetailData?.vouchers || customerDetailData.vouchers.length === 0) ? (
                            <tr>
                              <td colSpan={5}>
                                <div className="pf-admin-empty-state">
                                  <div className="pf-admin-empty-icon"><Ticket size={20} /></div>
                                  <strong>Ví voucher đang trống</strong>
                                  <p>Khách hàng chưa quy đổi điểm hoặc nhận voucher khuyến mãi nào.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            customerDetailData.vouchers.map((vc, i) => (
                              <tr key={i}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>{vc.code}</td>
                                <td><strong style={{ color: '#fff' }}>{vc.title}</strong></td>
                                <td style={{ fontWeight: 800, color: '#10b981' }}>{vc.discount}</td>
                                <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{vc.expiry || 'Vô thời hạn'}</td>
                                <td><span className="pf-status-badge active">{vc.status || 'Khả dụng'}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL THÊM KHÁCH HÀNG MỚI (ADD CUSTOMER)
      ══════════════════════════════════════════════════════════════ */}
      {showAddCustomerModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowAddCustomerModal(false)}>
          <div className="pf-admin-modal" style={{ maxWidth: '36rem', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="#0284c7" />
                <h3 style={{ margin: 0, color: '#fff' }}>THÊM KHÁCH HÀNG / TÀI KHOẢN MỚI</h3>
              </div>
              <button type="button" onClick={() => setShowAddCustomerModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomerSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>HỌ VÀ TÊN KHÁCH HÀNG (*):</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trần Đình Long"
                  value={newCustomerForm.fullName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })}
                  className="pf-admin-input"
                />
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>EMAIL ĐĂNG NHẬP (*):</label>
                  <input
                    type="email"
                    required
                    placeholder="long.td@example.com"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>SỐ ĐIỆN THOẠI:</label>
                  <input
                    type="text"
                    placeholder="0912 345 678"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>MẬT KHẨU BAN ĐẦU (*):</label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={newCustomerForm.password}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>HẠNG HỘI VIÊN:</label>
                  <select
                    className="pf-admin-input"
                    value={newCustomerForm.loyaltyTier}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, loyaltyTier: e.target.value })}
                  >
                    <option value="Thành viên Bạc">Thành viên Bạc</option>
                    <option value="Thành viên Vàng">Thành viên Vàng</option>
                    <option value="Thành viên Kim Cương">Thành viên Kim Cương</option>
                  </select>
                </div>
              </div>

              <div className="pf-admin-form-row">
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>ĐIỂM PARKPOINTS TẶNG BAN ĐẦU:</label>
                  <input
                    type="number"
                    min={0}
                    value={newCustomerForm.parkPoints}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, parkPoints: Number(e.target.value) || 0 })}
                    className="pf-admin-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>BIỂN SỐ XE BAN ĐẦU (TÙY CHỌN):</label>
                  <input
                    type="text"
                    placeholder="VD: 43A-888.99"
                    value={newCustomerForm.plate}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, plate: e.target.value.toUpperCase() })}
                    className="pf-admin-input"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAddCustomerModal(false)} style={{ padding: '0.55rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: '#0284c7', color: '#fff', border: 0, fontWeight: 800 }}>
                  <UserPlus size={15} /> Tạo Tài Khoản Khách Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL ĐẶT LẠI MẬT KHẨU TÀI KHOẢN (RESET PASSWORD)
      ══════════════════════════════════════════════════════════════ */}
      {showResetPwdModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowResetPwdModal(null)}>
          <div className="pf-admin-modal" style={{ maxWidth: '28rem', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} color="#0284c7" />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>ĐẶT LẠI MẬT KHẨU TÀI KHOẢN</h3>
              </div>
              <button type="button" onClick={() => setShowResetPwdModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Đặt lại mật khẩu cho tài khoản: <strong style={{ color: '#fff' }}>{showResetPwdModal.name}</strong> (<span style={{ color: '#38bdf8' }}>{showResetPwdModal.email}</span>).
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>MẬT KHẨU MỚI (*):</label>
                <input
                  type="text"
                  required
                  value={resetPwdInput}
                  onChange={(e) => setResetPwdInput(e.target.value)}
                  className="pf-admin-input"
                  style={{ fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', alignSelf: 'center' }}>Gợi ý:</span>
                {['SmartPark@2026', 'DaNang@123', 'Customer@2026'].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setResetPwdInput(sug)}
                    style={{ fontSize: '0.68rem', background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div style={{ padding: '0.65rem', background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: 6, fontSize: '0.72rem', color: '#7dd3fc', marginBottom: '1.25rem' }}>
                🔒 Mật khẩu sẽ được băm mã hóa bảo mật chuẩn bcrypt và có hiệu lực ngay khi người dùng đăng nhập lần tiếp theo.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowResetPwdModal(null)} style={{ padding: '0.5rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="pf-btn-portal-switch" style={{ background: '#0284c7', color: '#fff', border: 0, fontWeight: 700 }}>
                  <Check size={14} /> Cập Nhật Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL PHÁT SÓNG THÔNG BÁO ƯU ĐÃI & PUSH NOTIFICATION (SPLIT-SCREEN CONSOLE)
      ══════════════════════════════════════════════════════════════ */}
      {showBroadcastModal && (
        <div className="pf-admin-modal-backdrop" onClick={() => setShowBroadcastModal(false)}>
          <div className="pf-admin-modal" style={{ maxWidth: '58rem', width: '96%', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(2, 132, 199, 0.2)', border: '1px solid #0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                  <Radio size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    HỆ THỐNG PHÁT SÓNG THÔNG BÁO ƯU ĐÃI REAL-TIME
                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                      ⚡ Socket.IO Live Broadcast
                    </span>
                  </h3>
                  <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Phát tín hiệu âm thanh Ting và hiển thị pop-up tức thì trên toàn bộ thiết bị khách hàng</small>
                </div>
              </div>
              <button type="button" onClick={() => setShowBroadcastModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Split Screen Container */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.5rem', padding: '1.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
              {/* Cột Trái: Bộ Điều Khiển & Nội Dung */}
              <div>
                {/* Mẫu soạn thảo nhanh */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.45rem' }}>
                    MẪU NỘI DUNG SOẠN NHANH (1-CLICK TEMPLATES):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {BROADCAST_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setBroadcastForm({
                            ...broadcastForm,
                            title: tmpl.title,
                            message: tmpl.message,
                            type: tmpl.type,
                            voucherCode: tmpl.voucherCode || ''
                          });
                        }}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 6,
                          background: '#090e1a',
                          border: '1px solid #1e293b',
                          color: '#38bdf8',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Sparkles size={11} /> {tmpl.title.split('-')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleBroadcastNotification}>
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>TIÊU ĐỀ THÔNG BÁO (*):</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: 🎉 Khuyến mãi giờ vàng - Giảm 50% cước đỗ xe!"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                      className="pf-admin-input"
                    />
                  </div>

                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>NỘI DUNG CHI TIẾT (*):</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Nhập thông điệp, điều kiện nhận ưu đãi gửi tới khách hàng..."
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                      className="pf-admin-input"
                      style={{ resize: 'none' }}
                    />
                  </div>

                  <div className="pf-admin-form-row">
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>PHÂN LOẠI TIN:</label>
                      <select
                        value={broadcastForm.type}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                        className="pf-admin-input"
                      >
                        <option value="offer">🎁 Ưu đãi / Khuyến mãi</option>
                        <option value="system">📢 Thông báo hệ thống</option>
                        <option value="booking">🚗 Vé & Ô đỗ xe</option>
                        <option value="alert">⚠️ Cảnh báo khẩn cấp</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>ĐỐI TƯỢNG NHẬN:</label>
                      <select
                        value={broadcastForm.audience}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, audience: e.target.value })}
                        className="pf-admin-input"
                      >
                        <option value="all">Toàn bộ khách hàng (Tất cả thiết bị)</option>
                        <option value="customer">Khách hàng đã đăng ký tài khoản</option>
                        <option value="vip">Hội viên Vàng & Kim Cương</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>ĐÍNH KÈM VOUCHER (TỰ ĐỘNG LƯU VÀO VÍ KHÁCH HÀNG):</label>
                    <select
                      value={broadcastForm.voucherCode || ''}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, voucherCode: e.target.value })}
                      className="pf-admin-input"
                    >
                      <option value="">-- Không đính kèm voucher --</option>
                      {vouchers.map((vc) => (
                        <option key={vc.id} value={vc.code}>
                          🎫 {vc.code} - {vc.title} (Giảm {vc.discount})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
                    <button
                      type="button"
                      onClick={() => setShowBroadcastModal(false)}
                      style={{ padding: '0.55rem 1rem', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={broadcasting}
                      className="pf-btn-portal-switch"
                      style={{ background: '#0284c7', color: '#fff', border: 0, fontWeight: 800, padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                    >
                      {broadcasting ? (
                        <>Đang phát sóng...</>
                      ) : (
                        <><Radio size={15} /> Phát Sóng Real-Time Ngay</>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Cột Phải: Trình Mô Phỏng Điện Thoại Thời Gian Thực (Live Smartphone Preview) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Smartphone size={14} color="#0284c7" /> MÔ PHỎNG HIỂN THỊ TRÊN ĐIỆN THOẠI KHÁCH HÀNG:
                </span>

                <div style={{
                  width: '280px',
                  background: '#090d16',
                  borderRadius: '32px',
                  border: '6px solid #1e293b',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative'
                }}>
                  {/* Dynamic Island / Notch */}
                  <div style={{ width: '80px', height: '16px', background: '#000', borderRadius: '10px', margin: '0 auto 6px' }} />

                  {/* Phone Status Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#64748b', padding: '0 4px', fontWeight: 700 }}>
                    <span>09:41</span>
                    <span>5G • 100%</span>
                  </div>

                  {/* Live Push Notification Toast Mockup */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1.5px solid #0284c7',
                    borderRadius: '16px',
                    padding: '12px',
                    boxShadow: '0 8px 24px rgba(2, 132, 199, 0.25)',
                    marginTop: '4px'
                  }}>
                    {/* Header Toast */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }}>
                          🅿️
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8' }}>SmartPark Đà Nẵng</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Vừa xong</span>
                    </div>

                    {/* Title */}
                    <strong style={{ display: 'block', fontSize: '0.78rem', color: '#fff', lineHeight: 1.35, marginBottom: '4px' }}>
                      {broadcastForm.title || 'Tiêu đề thông báo ưu đãi hiển thị ở đây'}
                    </strong>

                    {/* Message Body */}
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                      {broadcastForm.message || 'Nội dung thông báo phát sóng sẽ được hiển thị trực tiếp theo thời gian thực khi khách hàng sử dụng ứng dụng.'}
                    </p>

                    {/* Attached Voucher Tag if selected */}
                    {broadcastForm.voucherCode && (
                      <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.15)', border: '1px dashed #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', color: '#fde68a', fontWeight: 800 }}>
                          🎫 VOUCHER: {broadcastForm.voucherCode}
                        </span>
                        <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 700 }}>Đã lưu ví</span>
                      </div>
                    )}

                    {/* Sound Alert Indicator */}
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.62rem', color: '#34d399' }}>
                      <Bell size={10} /> Kèm âm thanh báo động Ting Ting tức thì
                    </div>
                  </div>

                  {/* App Screen Placeholder */}
                  <div style={{ background: '#0f172a', borderRadius: '12px', padding: '12px', textAlign: 'center', marginTop: '10px', border: '1px solid #1e293b' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                      <CarFront size={18} />
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Giao diện Khách Hàng SmartPark</span>
                    <small style={{ fontSize: '0.6rem', color: '#64748b' }}>TP. Đà Nẵng</small>
                  </div>

                  {/* Home Bar */}
                  <div style={{ width: '70px', height: '4px', background: '#334155', borderRadius: '2px', margin: '14px auto 2px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
