import React, { useState, useEffect, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  CarFront,
  UserPlus,
  FileText,
  Search,
  Printer,
  Moon,
  Sun,
  LogOut,
  Video,
  QrCode,
  ParkingSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
  Sparkles,
  Zap,
  Calendar,
  CreditCard
} from 'lucide-react';

import ComputerCameraScanner from './staff/ComputerCameraScanner';
import SecurityCameraMonitor from './staff/SecurityCameraMonitor';
import GuestEntryDialog from './staff/GuestEntryDialog';
import InvoiceModal from './staff/InvoiceModal';
import ShiftReportModal from './staff/ShiftReportModal';
import VietQrPaymentModal from './staff/VietQrPaymentModal';

import './StaffPortal.css';

class ScannerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ScannerErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: '12px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 0.5rem auto' }} />
          <h4 style={{ color: '#b91c1c', margin: '0 0 0.5rem 0' }}>Có lỗi hiển thị tại máy quét</h4>
          <p style={{ color: '#7f1d1d', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
            {this.state.error?.message || 'Đã khôi phục trạng thái an toàn. Bạn có thể bấm nút bên dưới để tải lại máy quét.'}
          </p>
          <button
            type="button"
            className="sp-btn-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Khôi phục máy quét
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ScannerErrorBoundary.propTypes = {
  children: PropTypes.node
};

export default function StaffPortal() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => localStorage.getItem('pf_staff_theme') || 'light');
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('pf_staff_theme', next);
  };

  const [currentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pf_current_user');
      return saved ? JSON.parse(saved) : { fullName: 'Nhân Viên Trực Bốt', role: 'staff', station: 'SmartPark - Aeon Mall Thanh Khê 1' };
    } catch {
      return { fullName: 'Nhân Viên Trực Bốt', role: 'staff', station: 'SmartPark - Aeon Mall Thanh Khê 1' };
    }
  });

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('vi-VN'));
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('vi-VN')), 1000);
    return () => clearInterval(timer);
  }, []);

  // Gate barrier state
  const [gateInStatus, setGateInStatus] = useState('CLOSED');
  const handleAutoPulseGate = (gate) => {
    if (gate === 'IN') {
      setGateInStatus('OPENING');
      setTimeout(() => setGateInStatus('CLOSED'), 4000);
    }
  };

  const [activeMainTab, setActiveMainTab] = useState('workstation');
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('sp_clearance_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [logDateFilter, setLogDateFilter] = useState('');
  const [parkedVehicles, setParkedVehicles] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [inLotSearch, setInLotSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [showShiftReport, setShowShiftReport] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [scanToast, setScanToast] = useState(null);

  const showScanToast = (type, message) => {
    setScanToast({ type, message });
    setTimeout(() => setScanToast(null), 4000);
  };

  // Hàm lưu log thông quan bền vững (vừa lưu LocalStorage vừa đồng bộ PostgreSQL)
  const appendClearanceLog = (newLog) => {
    setLogs((prev) => {
      const updated = [newLog, ...prev.filter((l) => l.id !== newLog.id)];
      try {
        localStorage.setItem('sp_clearance_logs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Đồng bộ vào cơ sở dữ liệu PostgreSQL
    fetch('http://localhost:5000/api/parking/clearance-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    }).catch(() => {});
  };

  // 1. Tải và đồng bộ Nhật ký thông quan thực tế từ PostgreSQL (kèm lọc theo ngày)
  useEffect(() => {
    const fetchClearanceLogs = async () => {
      try {
        const url = logDateFilter
          ? `http://localhost:5000/api/parking/clearance-logs?date=${encodeURIComponent(logDateFilter)}`
          : 'http://localhost:5000/api/parking/clearance-logs';
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setLogs((prev) => {
            const map = new Map();
            json.data.forEach((item) => {
              const dStr = item.log_date ? new Date(item.log_date).toISOString().split('T')[0] : (item.date || '');
              const dDisp = item.date_display || (item.log_date ? new Date(item.log_date).toLocaleDateString('vi-VN') : '');
              map.set(item.id, {
                id: item.id,
                date: dStr,
                dateDisplay: dDisp,
                timeIn: item.time_in || item.timeIn || '08:00',
                timeOut: item.time_out || item.timeOut || '--:--',
                duration: item.duration || 'Vừa vào bãi',
                plate: item.plate,
                slot: item.slot,
                customer: item.customer,
                ticketType: item.ticket_type || item.ticketType,
                status: item.status,
                method: item.method,
                fee: item.fee,
                gateIn: item.gate_in || item.gateIn || 'Cổng Vào 01',
                gateOut: item.gate_out || item.gateOut || '--'
              });
            });
            // Giữ lại các bản ghi cục bộ chưa kịp đồng bộ
            prev.forEach((item) => {
              if (!map.has(item.id)) map.set(item.id, item);
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('sp_clearance_logs', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch {}
    };
    fetchClearanceLogs();
    const timer = setInterval(fetchClearanceLogs, 4000);
    return () => clearInterval(timer);
  }, [logDateFilter]);

  // 2. Fetch real parking sessions from PostgreSQL with real-time polling
  useEffect(() => {
    const fetchLiveSessions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('http://localhost:5000/api/admin/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setParkedVehicles(json.data.map((s, idx) => ({
            id: s.id || `PARK-${idx + 1}`,
            plate: s.plate,
            slot: s.slot || 'Bãi đỗ',
            timeIn: s.timeIn || 'Vừa vào',
            duration: s.duration || 'Đang gửi',
            customer: s.vehicleType || 'Khách hàng',
            model: s.vehicleType || 'Ô tô',
            fee: s.fee || '35.000đ',
            ticketType: s.ticketType || 'Vé hệ thống',
            isOverstay: s.isOverstay,
            overstayMinutes: s.overstayMinutes,
            overstaySurcharge: s.overstaySurcharge,
            isEarlyArrival: Boolean(s.isEarlyArrival),
            isPaid: Boolean(s.isPaid),
            isPrebooked: Boolean(s.isPrebooked),
            paymentStatus: s.paymentStatus || 'Chưa thanh toán'
          })));
        }
      } catch {}
    };
    fetchLiveSessions();
    const timer = setInterval(fetchLiveSessions, 4000);
    return () => clearInterval(timer);
  }, []);

  // Xử lý thanh toán thành công qua modal VietQR / Tiền mặt
  const handlePaymentSuccess = async (paymentResult) => {
    if (!paymentResult) return;
    const paymentType = paymentResult.paymentType || 'WALK_IN_CHECKOUT';

    if (paymentType === 'EARLY_ARRIVAL') {
      // Khách đặt trước đến sớm: thu cước đến sớm
      try {
        await fetch('http://localhost:5000/api/parking/pay-early', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: paymentResult.id,
            plate: paymentResult.plate,
            fee: paymentResult.fee,
            paymentMethod: paymentResult.method
          })
        });
      } catch {}

      setParkedVehicles((prev) => prev.map((p) => {
        if (p.id === paymentResult.id || p.plate === paymentResult.plate) {
          return { ...p, isPaid: true, paymentStatus: 'Đã thanh toán (Đến sớm)' };
        }
        return p;
      }));

      setLogs((prev) => {
        const updated = prev.map((l) => {
          if (l.plate === paymentResult.plate && l.timeOut === '--:--') {
            return { ...l, status: 'Đã thanh toán (Đến sớm)', method: paymentResult.method };
          }
          return l;
        });
        try { localStorage.setItem('sp_clearance_logs', JSON.stringify(updated)); } catch {}
        return updated;
      });

      showScanToast('success', `✓ Đã thu cước đến sớm cho xe ${paymentResult.plate}! Bạn có thể in hóa đơn.`);

      setSelectedInvoice({
        id: `INV-${paymentResult.id || Date.now().toString().slice(-4)}`,
        plate: paymentResult.plate,
        customer: paymentResult.customer || 'Khách hàng SmartPark',
        slot: paymentResult.slot,
        time: `${paymentResult.timeIn} - Hiện tại`,
        amount: paymentResult.fee,
        method: paymentResult.method
      });
    } else {
      // Khách vãng lai hoặc xe ra bãi: thanh toán và mở barrier làn ra, giải phóng ô đỗ về TRỐNG
      try {
        await fetch('http://localhost:5000/api/parking/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: paymentResult.id,
            plate: paymentResult.plate,
            slot: paymentResult.slot,
            fee: paymentResult.fee,
            paymentMethod: paymentResult.method,
            ticketType: paymentResult.ticketType
          })
        });
      } catch {}

      // Xóa xe khỏi danh sách đang lưu bãi
      setParkedVehicles((prev) => prev.filter((p) => p.id !== paymentResult.id && p.plate !== paymentResult.plate));

      const nowTimeStr = new Date().toLocaleTimeString('vi-VN');
      setLogs((prev) => {
        const updated = prev.map((l) => {
          if (l.plate === paymentResult.plate && l.timeOut === '--:--') {
            return {
              ...l,
              timeOut: nowTimeStr,
              status: 'Đã thanh toán & Ra bãi',
              gateOut: 'Cổng Ra 01',
              method: paymentResult.method
            };
          }
          return l;
        });
        try { localStorage.setItem('sp_clearance_logs', JSON.stringify(updated)); } catch {}
        return updated;
      });

      showScanToast('success', `✓ Đã thanh toán & Mở barrier ra cho xe ${paymentResult.plate}. Ô đỗ đã cập nhật về trống!`);

      setSelectedInvoice({
        id: `INV-${paymentResult.id || Date.now().toString().slice(-4)}`,
        plate: paymentResult.plate,
        customer: paymentResult.customer || 'Khách vãng lai',
        slot: paymentResult.slot,
        time: `${paymentResult.timeIn} - ${nowTimeStr}`,
        amount: paymentResult.fee,
        method: paymentResult.method
      });
    }
    setSelectedPayment(null);
  };

  // Mở barrier cưỡng chế khẩn cấp (12s) và ghi log an ninh
  const handleEmergencyBarrierOpen = (reason = 'Xe ưu tiên / Xe khẩn cấp') => {
    setGateInStatus('OPENING');
    setTimeout(() => setGateInStatus('CLOSED'), 12000);
    const today = new Date();
    const emergencyLog = {
      id: `EMG-${Math.floor(1000 + Math.random() * 9000)}`,
      date: today.toISOString().split('T')[0],
      dateDisplay: today.toLocaleDateString('vi-VN'),
      plate: 'XE KHẨN CẤP / CỨU HỘ',
      timeIn: today.toLocaleTimeString('vi-VN'),
      timeOut: '--:--',
      duration: 'Ưu tiên',
      slot: 'Làn khẩn cấp',
      gateIn: 'Cổng Vào 01',
      gateOut: '--',
      status: 'MỞ CƯỠNG CHẾ',
      method: reason,
      fee: '0đ (Miễn phí)',
      customer: 'Xe đặc nhiệm / Khẩn cấp',
      ticketType: 'Lệnh cưỡng chế cổng'
    };
    appendClearanceLog(emergencyLog);
    setShowEmergencyModal(false);
  };

  // Keyboard shortcuts (F1: Mở barrier, F3: Cấp vé vãng lai, F4: Khẩn cấp, F9: Báo cáo ca)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') { e.preventDefault(); setShowGuestDialog(true); }
      if (e.key === 'F1') { e.preventDefault(); handleAutoPulseGate('IN'); }
      if (e.key === 'F4') { e.preventDefault(); setShowEmergencyModal(true); }
      if (e.key === 'F9') { e.preventDefault(); setShowShiftReport(true); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // QR verified handler
  const handleQrVerified = (verification) => {
    try {
      if (!verification) return;

      if (verification.success && verification.data) {
        const v = verification.data;
        const plateStr = String(v.plate || '---');
        const customerStr = typeof v.customer === 'string' ? v.customer : (v.customer?.name || 'Khách hàng SmartPark');
        const slotStr = String(v.slot || '---');
        const feeStr = typeof v.fee === 'string' ? v.fee : (typeof v.fee === 'number' ? `${v.fee.toLocaleString('vi-VN')}đ` : '35.000đ');

        setLastScanned({
          ...v,
          plate: plateStr,
          customer: customerStr,
          slot: slotStr,
          fee: feeStr
        });

        if (v.canOpenBarrier) {
          handleAutoPulseGate('IN');
          if (v.isEarlyArrival) {
            showScanToast('success', `⚡ Khách đến sớm ${v.earlyMinutes || 0}p: ${plateStr} · Chuyển vé vãng lai · Đã mở barrier`);
          } else {
            showScanToast('success', `✓ Hợp lệ: ${plateStr} · ${customerStr} · Ô ${slotStr}`);
          }
        } else {
          showScanToast('error', `⚠️ Vé hết hạn hoặc không được phép vào: ${plateStr}`);
        }

        const today = new Date();
        const newLog = {
          id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
          date: today.toISOString().split('T')[0],
          dateDisplay: today.toLocaleDateString('vi-VN'),
          plate: plateStr,
          timeIn: today.toLocaleTimeString('vi-VN'),
          timeOut: '--:--',
          duration: 'Vừa vào bãi',
          slot: slotStr,
          gateIn: 'Cổng Vào 01',
          gateOut: '--',
          status: v.paymentStatus || (v.isEarlyArrival ? 'Đến sớm (Chờ thanh toán)' : 'Đã vào bãi'),
          method: v.isEarlyArrival ? 'Vé vãng lai tạm thời (Đến sớm)' : (v.depositPaid ? 'Đã thanh toán qua App' : 'Thu cước khi ra'),
          fee: feeStr,
          customer: customerStr,
          ticketType: v.isEarlyArrival ? 'Vé vãng lai (Đến sớm)' : (v.isPrebooked ? 'Vé đặt trước app' : 'Vé vãng lai')
        };
        appendClearanceLog(newLog);

        setParkedVehicles((prev) => [
          {
            id: `PARK-${Math.floor(100 + Math.random() * 900)}`,
            plate: plateStr,
            slot: slotStr,
            timeIn: today.toLocaleTimeString('vi-VN'),
            duration: '1 phút',
            customer: customerStr,
            model: String(v.model || 'Ô tô tiêu chuẩn'),
            fee: feeStr,
            ticketType: v.isEarlyArrival ? 'Vé vãng lai (Đến sớm)' : (v.isPrebooked ? 'Vé đặt trước app' : 'Vé vãng lai'),
            isEarlyArrival: Boolean(v.isEarlyArrival),
            isPaid: Boolean(v.depositPaid && !v.isEarlyArrival),
            isPrebooked: Boolean(v.isPrebooked)
          },
          ...prev
        ]);
      } else {
        // XỬ LÝ KHI MÃ QR ĐÃ QUA SỬ DỤNG HOẶC KHÔNG HỢP LỆ (CHỐNG QUÉT LẶP LẠI LẦN 2)
        const v = verification.data || {};
        const isAlreadyUsed = Boolean(verification.alreadyUsed || v.status === 'ALREADY_USED');
        const plateStr = String(v.plate || '---');
        const errStr = typeof verification.error === 'string'
          ? verification.error
          : (verification.error?.message || (isAlreadyUsed ? 'Vé QR này đã quét sử dụng trước đó' : 'Mã QR không hợp lệ'));

        setLastScanned({
          status: isAlreadyUsed ? 'ALREADY_USED' : 'INVALID',
          plate: plateStr,
          customer: isAlreadyUsed ? (typeof v.customer === 'string' ? v.customer : 'Khách hàng SmartPark') : errStr,
          slot: String(v.slot || '---'),
          bookingTime: isAlreadyUsed ? 'Đã quét sử dụng' : 'Từ chối thông quan',
          usedAt: String(v.usedAt || 'trước đó'),
          canOpenBarrier: false
        });

        showScanToast(
          'error',
          isAlreadyUsed
            ? `🚫 CẢNH BÁO: Vé QR này đã quét sử dụng lúc ${v.usedAt || 'trước đó'}! Không thể quét lại lần 2.`
            : errStr
        );
      }
    } catch (handlerErr) {
      console.error('Lỗi khi xử lý vé QR đã quét:', handlerErr);
      showScanToast('error', 'Có lỗi khi phân tích kết quả quét vé!');
    }
  };

  // Guest registered handler
  const handleGuestRegistered = (guestRecord) => {
    const today = new Date();
    const guestLog = {
      id: guestRecord.id || `LOG-VL-${Math.floor(1000 + Math.random() * 9000)}`,
      date: today.toISOString().split('T')[0],
      dateDisplay: today.toLocaleDateString('vi-VN'),
      timeIn: guestRecord.timeIn || today.toLocaleTimeString('vi-VN'),
      timeOut: '--:--',
      duration: 'Vừa vào bãi',
      plate: guestRecord.plate,
      slot: guestRecord.slot,
      gateIn: 'Cổng Vào 01',
      gateOut: '--',
      status: 'Đang đỗ (Vé lượt)',
      method: guestRecord.fee === '0đ (Miễn phí)' ? 'Miễn phí' : 'Thu cước khi ra',
      fee: guestRecord.fee || '25.000đ',
      customer: guestRecord.customer || 'Khách vãng lai',
      ticketType: 'Vé lượt giấy'
    };
    appendClearanceLog(guestLog);

    setParkedVehicles((prev) => [
      {
        id: guestRecord.id,
        plate: guestRecord.plate,
        slot: guestRecord.slot,
        timeIn: guestRecord.timeIn || today.toLocaleTimeString('vi-VN'),
        duration: 'Vừa vào bãi',
        customer: guestRecord.customer || 'Khách vãng lai',
        model: guestRecord.vehicleType || 'Ô tô',
        fee: guestRecord.fee || '25.000đ',
        ticketType: 'Vé lượt giấy',
        isPaid: false,
        isPrebooked: false,
        isEarlyArrival: false
      },
      ...prev
    ]);
    setShowGuestDialog(false);
    handleAutoPulseGate('IN');
  };

  const filteredLogs = logs.filter((l) => {
    // 1. Bộ lọc theo ngày
    if (logDateFilter) {
      const itemDate = l.date || (l.dateDisplay ? l.dateDisplay.split('/').reverse().join('-') : '');
      if (itemDate && itemDate !== logDateFilter) {
        return false;
      }
    }

    // 2. Tìm kiếm theo từ khóa
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase().trim();
    const customerStr = typeof l.customer === 'string' ? l.customer : (l.customer?.name || '');
    return (
      (l.plate || '').toLowerCase().includes(term) ||
      (l.id || '').toLowerCase().includes(term) ||
      (l.slot || '').toLowerCase().includes(term) ||
      (l.dateDisplay || '').toLowerCase().includes(term) ||
      (l.date || '').toLowerCase().includes(term) ||
      customerStr.toLowerCase().includes(term)
    );
  });

  const filteredParkedList = parkedVehicles.filter((pv) => {
    if (!inLotSearch) return true;
    const term = inLotSearch.toLowerCase().trim();
    const customerStr = typeof pv.customer === 'string' ? pv.customer : (pv.customer?.name || '');
    return (
      (pv.plate || '').toLowerCase().includes(term) ||
      (pv.slot || '').toLowerCase().includes(term) ||
      customerStr.toLowerCase().includes(term)
    );
  });

  return (
    <div className="sp-root" data-theme={theme}>

      {/* Floating QR Scan Toast Alert at Top */}
      {scanToast && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 22px',
          borderRadius: '12px',
          background: scanToast.type === 'success' ? '#059669' : '#dc2626',
          color: '#ffffff',
          fontWeight: '700',
          fontSize: '0.92rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
          minWidth: '320px',
          maxWidth: '560px',
          animation: 'slideDown 0.25s ease'
        }}>
          {scanToast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{typeof scanToast.message === 'string' ? scanToast.message : (scanToast.message?.message || JSON.stringify(scanToast.message || ''))}</span>
        </div>
      )}

      {/* ── TOPBAR ── */}
      <header className="sp-topbar">
        <div className="sp-topbar-brand">
          <div className="sp-brand-logo-wrap">
            <img src="/smartpark-logo.png" alt="SmartPark" className="sp-brand-logo" />
            <span className="sp-online-dot" />
          </div>
          <div className="sp-brand-info">
            <div className="sp-brand-name">SMARTPARK</div>
            <div className="sp-brand-sub">
              <span className="sp-live-pulse" />
              Aeon Mall Thanh Khê 1 · Đà Nẵng
            </div>
          </div>
        </div>

        <nav className="sp-tab-nav">
          {[
            { key: 'workstation', icon: QrCode, label: 'Quét Vé QR & Nhật Ký' },
            { key: 'inLot', icon: ParkingSquare, label: `Xe Trong Bãi (${parkedVehicles.length})` },
            { key: 'cctv', icon: Video, label: 'Camera An Ninh' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              className={`sp-tab-btn ${activeMainTab === key ? 'active' : ''}`}
              onClick={() => setActiveMainTab(key)}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sp-topbar-right">
          <div className="sp-stat-chip">
            <Clock size={12} />
            <span className="sp-clock-mono">{currentTime}</span>
          </div>
          <div className="sp-stat-chip">
            <ParkingSquare size={12} />
            <span>{parkedVehicles.length} xe / 240 chỗ</span>
          </div>
          <button type="button" className="sp-btn-icon" onClick={toggleTheme} title="Đổi giao diện">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className="sp-user-chip">
            <div className="sp-user-avatar">NV</div>
            <div>
              <strong>{currentUser.fullName}</strong>
              <small>Ca sáng · 06:00–14:00</small>
            </div>
          </div>
          <button
            type="button"
            className="sp-btn-logout"
            onClick={() => setShowShiftReport(true)}
          >
            <FileSpreadsheet size={13} /> Bàn Giao Ca
          </button>
        </div>
      </header>

      {/* ── QUICK ACTION BAR ── */}
      <div className="sp-action-bar">
        <button
          type="button"
          className="sp-guest-btn"
          onClick={() => setShowGuestDialog(true)}
        >
          <UserPlus size={15} />
          <span>Phát Vé Khách Vãng Lai</span>
          <kbd>F3</kbd>
        </button>

        <div className="sp-gate-status">
          <div className={`sp-gate-pill ${gateInStatus !== 'CLOSED' ? 'open' : 'closed'}`}>
            <span className="sp-gate-dot" />
            Barrier Vào: {gateInStatus === 'CLOSED' ? 'ĐÓNG' : 'ĐANG MỞ'}
          </div>
          <button
            type="button"
            className="sp-btn-open-gate"
            onClick={() => handleAutoPulseGate('IN')}
            title="Mở barrier cho xe qua bình thường"
          >
            Mở Barrier Vào <kbd>F1</kbd>
          </button>
          <button
            type="button"
            className="sp-btn-open-gate"
            style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#ffffff' }}
            onClick={() => setShowEmergencyModal(true)}
            title="Mở barrier cưỡng chế cho xe ưu tiên / cứu hỏa / cấp cứu"
          >
            <ShieldAlert size={14} /> Mở Khẩn Cấp <kbd>F4</kbd>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            className="sp-btn-secondary"
            onClick={() => setShowShiftReport(true)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileSpreadsheet size={14} color="#0284c7" />
            <span>Biên Bản Ca Trực</span>
            <kbd>F9</kbd>
          </button>
          <div className="sp-topbar-meta">
            <AlertCircle size={12} color="#f59e0b" />
            <span>Hôm nay: <strong>38 vào · 35 ra</strong></span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1: QUÉT VÉ QR & NHẬT KÝ THÔNG QUAN
      ══════════════════════════════════════════════ */}
      {activeMainTab === 'workstation' && (
        <main className="sp-workstation-layout">

          {/* LEFT: QR SCANNER PANEL */}
          <section className="sp-scanner-panel">
            <div className="sp-panel-head">
              <div className="sp-panel-title">
                <QrCode size={16} color="#0284c7" />
                <div>
                  <strong>QUÉT VÉ QR TẠI CỔNG VÀO</strong>
                  <p>Camera máy tính quét vé điện tử khách đặt trước hoặc vé lượt giấy</p>
                </div>
              </div>
              <span className={`sp-lane-badge ${gateInStatus !== 'CLOSED' ? 'open' : ''}`}>
                CỔNG VÀO · LÀN 1
              </span>
            </div>

            <div className="sp-scanner-body">
              <ScannerErrorBoundary>
                <ComputerCameraScanner
                  onVerified={handleQrVerified}
                  onManualPulseGate={handleAutoPulseGate}
                />
              </ScannerErrorBoundary>
            </div>

            {/* Last scan result banner */}
            {lastScanned && (
              <div
                className={`sp-last-scan-banner ${lastScanned.status === 'ACTIVE' ? (lastScanned.isEarlyArrival ? 'warning' : 'success') : 'error'}`}
                style={lastScanned.isEarlyArrival ? { background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' } : {}}
              >
                {lastScanned.isEarlyArrival ? (
                  <Zap size={16} color="#d97706" />
                ) : lastScanned.status === 'ACTIVE' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <div>
                  <strong>
                    {lastScanned.isEarlyArrival
                      ? `⚡ Khách đến sớm ${lastScanned.earlyMinutes || 0} phút · Chuyển vé vãng lai · ${lastScanned.plate || 'Xe khách'}`
                      : lastScanned.status === 'ACTIVE'
                      ? `✓ Vé hợp lệ · ${lastScanned.plate || 'Xe khách'} · ${typeof lastScanned.customer === 'string' ? lastScanned.customer : 'Khách hàng'}`
                      : lastScanned.status === 'ALREADY_USED'
                      ? `🚫 Vé đã sử dụng trước đó · Không được vào lại: ${lastScanned.plate || 'Xe khách'}`
                      : `✗ Vé không hợp lệ hoặc quá hạn · ${lastScanned.plate || 'Xe khách'}`}
                  </strong>
                  <small>
                    {lastScanned.isEarlyArrival
                      ? `Chưa tới giờ đặt. Hệ thống tự động chuyển sang vé vãng lai tạm thời và đã mở barrier cho xe vào.`
                      : lastScanned.status === 'ALREADY_USED'
                      ? `Đã quét thông quan lúc ${lastScanned.usedAt || 'trước đó'}. Mỗi mã QR chỉ quét được 1 lần duy nhất!`
                      : `${lastScanned.slot || '---'} · ${lastScanned.bookingTime || '---'}${lastScanned.depositPaid ? ' · Đã thanh toán' : ' · Thu cước khi ra'}`}
                  </small>
                </div>
                <button
                  type="button"
                  className="sp-btn-dismiss"
                  onClick={() => setLastScanned(null)}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </section>

          {/* RIGHT: LOG TABLE */}
          <section className="sp-log-panel">
            <div className="sp-panel-head">
              <div className="sp-panel-title">
                <FileText size={16} color="#0284c7" />
                <strong>NHẬT KÝ THÔNG QUAN CA TRỰC</strong>
              </div>
              <small className="sp-log-count">{filteredLogs.length} lượt</small>
            </div>

            {/* Date filter bar for durable clearance logs */}
            <div className="sp-log-date-bar">
              <div className="sp-log-date-input-wrap">
                <Calendar size={13} color="#0284c7" />
                <input
                  type="date"
                  className="sp-log-date-input"
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  title="Chọn ngày tra cứu nhật ký thông quan"
                />
                {logDateFilter && (
                  <button
                    type="button"
                    className="sp-btn-clear-date"
                    onClick={() => setLogDateFilter('')}
                    title="Xem tất cả các ngày"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="sp-log-date-chips">
                <button
                  type="button"
                  className={`sp-date-chip ${!logDateFilter ? 'active' : ''}`}
                  onClick={() => setLogDateFilter('')}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`sp-date-chip ${logDateFilter === new Date().toISOString().split('T')[0] ? 'active' : ''}`}
                  onClick={() => setLogDateFilter(new Date().toISOString().split('T')[0])}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className={`sp-date-chip ${logDateFilter === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'active' : ''}`}
                  onClick={() => {
                    const y = new Date(Date.now() - 86400000);
                    setLogDateFilter(y.toISOString().split('T')[0]);
                  }}
                >
                  Hôm qua
                </button>
              </div>
            </div>

            <div className="sp-log-search">
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm theo biển số, mã phiên, ngày, khách..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <div className="sp-log-list">
              {filteredLogs.length === 0 ? (
                <div className="sp-log-empty">
                  <CarFront size={32} color="#cbd5e1" />
                  <p>Không có dữ liệu thông quan cho ngày đã chọn</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="sp-log-item">
                    <div className="sp-li-main">
                      <div className="sp-li-top">
                        <strong className="sp-li-plate">{log.plate}</strong>
                        <span className="sp-li-id">{log.id}</span>
                        <span className={`sp-ticket-pill ${log.ticketType?.includes('app') ? 'app' : 'walk'}`}>
                          {log.ticketType || 'Vé lượt'}
                        </span>
                        <span className="sp-li-date-badge">
                          <Calendar size={10} />
                          {log.dateDisplay || log.date}
                        </span>
                      </div>
                      <div className="sp-li-row">
                        <Clock size={11} color="#94a3b8" />
                        <span>{log.timeIn} → {log.timeOut} ({log.duration})</span>
                      </div>
                      <div className="sp-li-row">
                        <ParkingSquare size={11} color="#94a3b8" />
                        <span>{log.slot}</span>
                        <span className="sp-li-sep">·</span>
                        <span>{log.customer}</span>
                      </div>
                      <div className="sp-li-row">
                        <span className="sp-li-method">{log.method}</span>
                      </div>
                    </div>
                    <div className="sp-li-right">
                      <strong className="sp-li-fee">{log.fee}</strong>
                      <button
                        type="button"
                        className="sp-btn-invoice"
                        onClick={() => setSelectedInvoice({
                          id: `INV-${log.id}`,
                          plate: log.plate,
                          customer: log.customer,
                          slot: log.slot,
                          time: `${log.timeIn} - ${log.timeOut}`,
                          amount: log.fee,
                          method: log.method
                        })}
                        title="Xuất hóa đơn điện tử / in PDF"
                      >
                        <Printer size={11} /> VAT
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2: TRA CỨU XE TRONG BÃI
      ══════════════════════════════════════════════ */}
      {activeMainTab === 'inLot' && (
        <main className="sp-inlot-page">
          <div className="sp-inlot-card">
            <div className="sp-inlot-head">
              <div>
                <h2>PHƯƠNG TIỆN ĐANG LƯU BÃI</h2>
                <p>Tra cứu vị trí ô đỗ, kiểm tra thời lượng gửi và giám sát xe quá hạn</p>
              </div>
              <div className="sp-inlot-search-wrap">
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Tra cứu theo biển số hoặc ô đỗ..."
                  value={inLotSearch}
                  onChange={(e) => setInLotSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="sp-inlot-stats">
              <div className="sp-istat">
                <strong>{parkedVehicles.length}</strong>
                <small>Xe đang trong bãi</small>
              </div>
              <div className="sp-istat">
                <strong style={{ color: '#10b981' }}>{240 - parkedVehicles.length}</strong>
                <small>Chỗ còn trống</small>
              </div>
              <div className="sp-istat">
                <strong style={{ color: '#0284c7' }}>{parkedVehicles.filter(p => p.ticketType?.includes('app')).length}</strong>
                <small>Vé đặt trước app</small>
              </div>
              <div className="sp-istat">
                <strong style={{ color: '#f59e0b' }}>{parkedVehicles.filter(p => p.ticketType?.includes('lượt')).length}</strong>
                <small>Vé lượt tại cổng</small>
              </div>
            </div>

            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>MÃ PHIÊN</th>
                    <th>BIỂN SỐ XE</th>
                    <th>VỊ TRÍ Ô ĐỖ</th>
                    <th>LOẠI VÉ</th>
                    <th>THỜI ĐIỂM VÀO</th>
                    <th>THỜI LƯỢNG</th>
                    <th>CHỦ XE / DÒNG XE</th>
                    <th>CƯỚC TẠM TÍNH</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParkedList.map((pv) => (
                    <tr key={pv.id}>
                      <td className="sp-td-mono">{pv.id}</td>
                      <td className="sp-td-plate">{pv.plate}</td>
                      <td><span className="sp-slot-tag">{pv.slot}</span></td>
                      <td>
                        <span className={`sp-ticket-pill ${pv.isOverstay ? 'walk' : pv.ticketType?.includes('app') ? 'app' : 'walk'}`}
                              style={pv.isOverstay ? { background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' } : {}}>
                          {pv.isOverstay ? '⚠️ Quá giờ' : pv.ticketType}
                        </span>
                      </td>
                      <td>{pv.timeIn}</td>
                      <td>
                        <div>{pv.duration}</div>
                        {pv.isOverstay && (
                          <small style={{ color: '#dc2626', fontWeight: 800, display: 'block' }}>
                            Quá {pv.overstayMinutes}m
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{pv.customer}</strong>
                        <div className="sp-td-model">{pv.model}</div>
                      </td>
                      <td className="sp-td-fee">
                        <div>{pv.fee}</div>
                        {pv.isOverstay && (
                          <small style={{ color: '#dc2626', fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>
                            (+{Number(pv.overstaySurcharge || 0).toLocaleString('vi-VN')}đ phạt)
                          </small>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          {/* 1. KHÁCH ĐẶT TRƯỚC ĐẾN SỚM: Có mục thanh toán để thu cước đến sớm */}
                          {pv.isEarlyArrival ? (
                            !pv.isPaid ? (
                              <button
                                type="button"
                                className="sp-btn-pay-action warning"
                                onClick={() => setSelectedPayment({
                                  id: pv.id,
                                  plate: pv.plate,
                                  slot: pv.slot,
                                  fee: pv.fee || '20.000đ',
                                  customer: pv.customer,
                                  duration: pv.duration,
                                  timeIn: pv.timeIn,
                                  ticketType: pv.ticketType,
                                  paymentType: 'EARLY_ARRIVAL'
                                })}
                                title="Khách đặt trước đến sớm: bấm để thu tiền phụ phí đến sớm"
                              >
                                <CreditCard size={12} /> Thu Cước Đến Sớm
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="sp-btn-row-action"
                                onClick={() => setSelectedInvoice({
                                  id: `INV-${pv.id}`,
                                  plate: pv.plate,
                                  customer: pv.customer,
                                  slot: pv.slot,
                                  time: `${pv.timeIn} - Hiện tại`,
                                  amount: pv.fee,
                                  method: 'Đã thanh toán (Cước đến sớm)'
                                })}
                                title="In hóa đơn cước đến sớm"
                              >
                                <Printer size={12} /> In Hóa Đơn
                              </button>
                            )
                          ) : pv.isPrebooked ? (
                            /* 2. KHÁCH ĐÃ ĐẶT CHỖ TRƯỚC RỒI (ĐÚNG GIỜ): Chỉ in hóa đơn (thu thêm phạt nếu quá giờ) */
                            <>
                              {pv.isOverstay && Number(pv.overstaySurcharge || 0) > 0 && (
                                <button
                                  type="button"
                                  className="sp-btn-pay-action danger"
                                  onClick={() => setSelectedPayment({
                                    id: pv.id,
                                    plate: pv.plate,
                                    slot: pv.slot,
                                    fee: `${Number(pv.overstaySurcharge || 0).toLocaleString('vi-VN')}đ`,
                                    customer: pv.customer,
                                    duration: pv.duration,
                                    timeIn: pv.timeIn,
                                    ticketType: 'Phụ phí đỗ quá giờ',
                                    paymentType: 'OVERSTAY_SURCHARGE'
                                  })}
                                  title="Thu phụ phí quá giờ và giải phóng xe ra bãi"
                                >
                                  <AlertCircle size={12} /> Thu Phạt: {Number(pv.overstaySurcharge || 0).toLocaleString('vi-VN')}đ
                                </button>
                              )}
                              <button
                                type="button"
                                className="sp-btn-row-action"
                                onClick={() => setSelectedInvoice({
                                  id: `INV-${pv.id}`,
                                  plate: pv.plate,
                                  customer: pv.customer,
                                  slot: pv.slot,
                                  time: `${pv.timeIn} - Hiện tại`,
                                  amount: pv.fee,
                                  method: pv.isPaid ? 'Đã thanh toán qua App' : 'Cọc đặt chỗ trước'
                                })}
                                title="In hóa đơn đặt chỗ trước"
                              >
                                <Printer size={12} /> In Hóa Đơn
                              </button>
                            </>
                          ) : (
                            /* 3. KHÁCH VÃNG LAI: Chưa thanh toán thì Thu cước & Mở barrier cho ra, đã thanh toán thì in hóa đơn */
                            !pv.isPaid ? (
                              <button
                                type="button"
                                className="sp-btn-pay-action primary"
                                onClick={() => setSelectedPayment({
                                  id: pv.id,
                                  plate: pv.plate,
                                  slot: pv.slot,
                                  fee: pv.fee || '35.000đ',
                                  customer: pv.customer,
                                  duration: pv.duration,
                                  timeIn: pv.timeIn,
                                  ticketType: pv.ticketType,
                                  paymentType: 'WALK_IN_CHECKOUT'
                                })}
                                title="Thu cước gửi xe lượt và mở barrier cho xe ra"
                              >
                                <CreditCard size={12} /> Thu Cước & Cho Ra
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="sp-btn-row-action"
                                onClick={() => setSelectedInvoice({
                                  id: `INV-${pv.id}`,
                                  plate: pv.plate,
                                  customer: pv.customer,
                                  slot: pv.slot,
                                  time: `${pv.timeIn} - Hiện tại`,
                                  amount: pv.fee,
                                  method: 'Đã thanh toán tại quầy'
                                })}
                                title="In hóa đơn VAT"
                              >
                                <Printer size={12} /> In Hóa Đơn
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ══════════════════════════════════════════════
          TAB 3: CAMERA AN NINH
      ══════════════════════════════════════════════ */}
      {activeMainTab === 'cctv' && (
        <main className="sp-cctv-page">
          <SecurityCameraMonitor />
        </main>
      )}

      {/* MODAL: KHÁCH VÃNG LAI */}
      {showGuestDialog && (
        <GuestEntryDialog
          onRegisterSuccess={handleGuestRegistered}
          onClose={() => setShowGuestDialog(false)}
        />
      )}

      {/* MODAL: HÓA ĐƠN VAT */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* MODAL: BÁO CÁO & BÀN GIAO CA TRỰC */}
      {showShiftReport && (
        <ShiftReportModal
          staffName={currentUser?.fullName || 'Trần Quốc Huy'}
          station={currentUser?.station || 'SmartPark Aeon Mall Thanh Khê 1'}
          logs={logs}
          parkedCount={parkedVehicles.length}
          onClose={() => setShowShiftReport(false)}
          onLogout={() => {
            localStorage.removeItem('pf_current_user');
            setShowShiftReport(false);
            navigate('/login');
          }}
        />
      )}

      {/* MODAL: MỞ CƯỠNG CHẾ BARRIER KHẨN CẤP */}
      {showEmergencyModal && (
        <div className="sp-modal-backdrop" onClick={() => setShowEmergencyModal(false)}>
          <div className="sp-guest-modal" style={{ maxWidth: '480px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div className="sp-guest-head" style={{ background: '#dc2626', color: '#ffffff' }}>
              <div className="sp-gh-title">
                <div className="sp-gh-icon" style={{ background: '#ffffff', color: '#dc2626' }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ color: '#ffffff' }}>MỞ CƯỠNG CHẾ BARRIER CỔNG</h3>
                  <p style={{ color: '#fee2e2' }}>Thao tác ưu tiên an ninh bãi xe SmartPark</p>
                </div>
              </div>
              <button
                type="button"
                className="sp-btn-close-modal"
                onClick={() => setShowEmergencyModal(false)}
                style={{ color: '#ffffff' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="sp-guest-form-body" style={{ padding: '1.25rem' }}>
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                padding: '0.85rem', color: '#991b1b', fontSize: '0.82rem', lineHeight: '1.5'
              }}>
                <strong>CẢNH BÁO AN NINH:</strong> Barrier sẽ được cưỡng chế nâng mở trong <strong>12 giây</strong>.
                Hệ thống sẽ lưu vết phiên can thiệp khẩn cấp vào nhật ký kiểm toán ca trực.
              </div>
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                  LÝ DO CƯỠNG CHẾ MỞ RÀO:
                </label>
                <select
                  id="emg-reason-select"
                  className="sp-select"
                  defaultValue="Xe cấp cứu / Cứu hỏa / Công an ưu tiên"
                >
                  <option value="Xe cấp cứu / Cứu hỏa / Công an ưu tiên">🚨 Xe cấp cứu / Cứu hỏa / Công an ưu tiên</option>
                  <option value="Sự cố lỗi cảm biến vòng từ barrier">⚠️ Sự cố lỗi cảm biến vòng từ barrier</option>
                  <option value="Khách gặp sự cố y tế cần di chuyển gấp">🏥 Khách gặp sự cố y tế cần di chuyển gấp</option>
                  <option value="Theo lệnh điều phối của Quản lý ca">📋 Theo lệnh điều phối của Quản lý ca</option>
                </select>
              </div>
            </div>
            <div className="sp-guest-foot">
              <button
                type="button"
                className="sp-btn-secondary"
                onClick={() => setShowEmergencyModal(false)}
              >
                Hủy Thao Tác
              </button>
              <button
                type="button"
                className="sp-btn-primary"
                style={{ background: '#dc2626' }}
                onClick={() => {
                  const sel = document.getElementById('emg-reason-select');
                  handleEmergencyBarrierOpen(sel ? sel.value : 'Xe khẩn cấp / Ưu tiên');
                }}
              >
                <ShieldAlert size={15} /> Xác Nhận Mở Barrier Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THU CƯỚC VIETQR / TIỀN MẶT */}
      {selectedPayment && (
        <VietQrPaymentModal
          isOpen={Boolean(selectedPayment)}
          onClose={() => setSelectedPayment(null)}
          logItem={selectedPayment}
          onSuccessPaid={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
