import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket,
  CreditCard,
  History,
  Gift,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  MapPin,
  Trash2,
  Check,
  Compass,
  LayoutDashboard,
  LogOut,
  User,
  Globe,
  Sun,
  Moon,
  Shield,
  ArrowRight,
  Car
} from 'lucide-react';

import './Home.css';
import { getTranslation } from '../utils/i18n';

// Subcomponents
import DashboardView from './home/DashboardView';
import LiveMapView from './home/LiveMapView';
import BookingView from './home/BookingView';
import PaymentsView from './home/PaymentsView';
import HistoryView from './home/HistoryView';
import PromosView from './home/PromosView';
import ProfileView from './home/ProfileView';
import SettingsView from './home/SettingsView';
import AiChatBubble from './home/AiChatBubble';
import SupportBubble from './home/SupportBubble';
import QrPassModal from './home/QrPassModal';
import SlotSelectionDialog from './home/SlotSelectionDialog';
import { registerNewBooking } from '../services/qrBookingService';
import { getSavedUserVouchers, normalizeVoucher, addVoucherToWallet } from '../services/voucherService';
import { io } from 'socket.io-client';

// Initial Notifications Data
const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    type: 'booking',
    title: 'Đặt chỗ thành công',
    titleEn: 'Booking Confirmed',
    message: 'Ô đỗ B-08 tại Aeon Mall Thanh Khê 1 đã sẵn sàng cho bạn.',
    messageEn: 'Bay B-08 at Aeon Mall Thanh Khe 1 is ready for you.',
    time: '2 phút trước',
    timeEn: '2m ago',
    unread: true
  },
  {
    id: 2,
    type: 'payment',
    title: 'Thanh toán thành công qua MoMo',
    titleEn: 'Paid via MoMo',
    message: 'Đã thanh toán 30.000đ từ ví MoMo cho phiên đỗ xe sáng nay tại SmartPark Vincom Ngô Quyền.',
    messageEn: 'Paid 30,000đ from MoMo wallet for morning session at SmartPark Vincom Ngo Quyen.',
    time: '1 giờ trước',
    timeEn: '1h ago',
    unread: true
  },
  {
    id: 3,
    type: 'offer',
    title: 'Ưu đãi cuối tuần ✦',
    titleEn: 'Weekend Special ✦',
    message: 'Giảm 25% phí gửi xe cho thành viên Gold vào Thứ 7 & CN.',
    messageEn: '25% off parking for Gold members on Sat & Sun.',
    time: '3 giờ trước',
    timeEn: '3h ago',
    unread: true
  },
  {
    id: 4,
    type: 'security',
    title: 'An ninh 24/7 bảo đảm',
    titleEn: '24/7 Security Verified',
    message: 'Mã QR Barrier Pass đã mở cổng an toàn tại lối vào cổng số 2.',
    messageEn: 'QR Barrier Pass safely opened Gate 2 for your vehicle.',
    time: 'Hôm qua',
    timeEn: 'Yesterday',
    unread: false
  }
];

function Home() {
  const navigate = useNavigate();

  // Theme state: 'light' (default bright white-blue) | 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pf_theme') || 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('pf_theme', nextTheme);
  };

  // Language state (persisted)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('pf_lang') || 'vi';
  });

  const t = (key) => getTranslation(language, key);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('pf_lang', newLang);
  };

  // Navigation state (removed 'Xe của tôi' as requested)
  const [activeMenuKey, setActiveMenuKey] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('SmartPark - Aeon Mall Thanh Khê 1 (Đà Nẵng)');

  // Notification states
  const [notifications, setNotifications] = useState(() => {
    try {
      const savedNotis = localStorage.getItem('pf_user_notifications');
      if (savedNotis) {
        const parsed = JSON.parse(savedNotis);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.debug('Cannot parse saved notifications:', err);
    }

    const rawUser = localStorage.getItem('pf_current_user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        const name = user.fullName || user.full_name || 'Quý khách';
        return [
          {
            id: 1,
            type: 'offer',
            title: 'Chào mừng gia nhập SmartPark!',
            titleEn: 'Welcome to SmartPark!',
            message: `Xin chào ${name}, tài khoản của bạn đã kích hoạt thành công! Tặng ngay 500 ParkPoints và Voucher chào mừng 30.000đ.`,
            messageEn: `Welcome ${name}! Your account is active. Enjoy 500 welcome points & 30,000đ gift!`,
            time: 'Vừa xong',
            timeEn: 'Just now',
            unread: true
          }
        ];
      } catch (err) {
        console.debug('Cannot parse current user notifications:', err);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });
  const [currentUser] = useState(() => {
    try {
      const rawUser = localStorage.getItem('pf_current_user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (err) {
      console.debug('Cannot parse current user:', err);
      return null;
    }
  });

  const [notiFilter, setNotiFilter] = useState('all');
  const [activeToast, setActiveToast] = useState(null);

  // Trung tâm thông báo chuyên nghiệp & Modal chi tiết
  const notiRef = useRef(null);
  const userMenuRef = useRef(null);
  const [selectedNotiDetail, setSelectedNotiDetail] = useState(null);
  const [showFullNotiCenter, setShowFullNotiCenter] = useState(false);
  const [notiSearchQuery, setNotiSearchQuery] = useState('');

  // Tự động đóng dropdown thông báo & user menu khi click bên ngoài
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Yêu cầu quyền thông báo đẩy Web Desktop Notification từ trình duyệt
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch((err) => {
          console.debug('Permission request error:', err);
        });
      }
    }
  }, []);

  // Tính số lượng chưa đọc & danh sách lọc theo tab
  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications = notifications.filter((n) => {
    if (notiFilter === 'all') return true;
    return n.type === notiFilter;
  });

  // Đánh dấu tất cả thông báo đã đọc
  const handleMarkAllRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, unread: false }));
      try {
        localStorage.setItem('pf_user_notifications', JSON.stringify(updated));
      } catch (err) {
        console.debug('Error saving notifications:', err);
      }
      return updated;
    });
    try {
      await fetch('http://localhost:5000/api/notifications/mark-all-read', { method: 'POST' });
    } catch (err) {
      console.debug('Error marking notifications read on server:', err);
    }
  };

  // Xóa toàn bộ thông báo
  const handleClearNotifications = async () => {
    if (window.confirm(language === 'vi' ? 'Bạn có chắc chắn muốn xóa toàn bộ thông báo?' : 'Are you sure you want to clear all notifications?')) {
      setNotifications([]);
      try {
        localStorage.removeItem('pf_user_notifications');
      } catch (err) {
        console.debug('Error clearing notifications:', err);
      }
      try {
        await fetch('http://localhost:5000/api/notifications', { method: 'DELETE' });
      } catch (err) {
        console.debug('Error clearing notifications on server:', err);
      }
    }
  };

  // Xóa từng thông báo riêng lẻ
  const handleDeleteSingleNoti = async (e, notiId) => {
    e.stopPropagation();
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== notiId);
      try {
        localStorage.setItem('pf_user_notifications', JSON.stringify(updated));
      } catch (err) {
        console.debug('Error deleting notification:', err);
      }
      return updated;
    });
    try {
      await fetch(`http://localhost:5000/api/notifications/${notiId}`, { method: 'DELETE' });
    } catch (err) {
      console.debug('Error deleting notification on server:', err);
    }
  };

  // Bấm vào 1 thông báo: Đánh dấu đã đọc và mở modal xem chi tiết
  const handleNotificationClick = async (noti) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === noti.id ? { ...n, unread: false } : n));
      try {
        localStorage.setItem('pf_user_notifications', JSON.stringify(updated));
      } catch (err) {
        console.debug('Error updating notification:', err);
      }
      return updated;
    });
    setSelectedNotiDetail(noti);
    setShowNotifications(false);
    try {
      await fetch(`http://localhost:5000/api/notifications/${noti.id}/read`, { method: 'PATCH' });
    } catch (err) {
      console.debug('Error updating notification read state on server:', err);
    }
  };

  // Thu thập Voucher từ thông báo và tự động chuyển sang trang Đặt Chỗ
  const handleClaimVoucherFromNoti = (noti) => {
    if (!noti) return;
    const rawCode = noti.voucherCode || noti.voucher?.code || noti.voucherData?.code;
    if (!rawCode) return;
    const vData = noti.voucherData || noti.voucher || {
      code: rawCode,
      title: noti.title || `Voucher ${rawCode}`,
      titleEn: noti.titleEn || `Voucher ${rawCode}`,
      desc: noti.message || 'Ưu đãi dành riêng cho bạn từ SmartPark',
      descEn: noti.messageEn || 'Special offer from SmartPark',
      type: 'fixed',
      value: 20000,
      minOrderVal: 0,
      expiry: '31/12/2027',
      stations: 'Tất cả chi nhánh SmartPark Đà Nẵng'
    };
    addVoucherToWallet(vData, 'notification_reward');
    setUserVouchers(getSavedUserVouchers());
    setPreselectedBookingVoucher(normalizeVoucher(vData));
    setSelectedNotiDetail(null);
    setShowNotifications(false);
    setShowFullNotiCenter(false);
    setActiveMenuKey('booking');
  };

  // Âm thanh thông báo ting ting chuẩn hiện đại
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.12); // G5
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (err) {
      console.debug('AudioContext not supported:', err);
    }
  };

  // Render icon phân loại thông báo
  const renderNotiIcon = (type) => {
    switch (type) {
      case 'offer':
        return (
          <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(236,72,153,0.15)', display: 'grid', placeItems: 'center', color: '#ec4899', flexShrink: 0 }}>
            <Gift size={15} />
          </div>
        );
      case 'booking':
        return (
          <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(2,132,199,0.15)', display: 'grid', placeItems: 'center', color: '#0284c7', flexShrink: 0 }}>
            <Car size={15} />
          </div>
        );
      case 'payment':
        return (
          <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(16,185,129,0.15)', display: 'grid', placeItems: 'center', color: '#10b981', flexShrink: 0 }}>
            <CreditCard size={15} />
          </div>
        );
      default:
        return (
          <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(139,92,246,0.15)', display: 'grid', placeItems: 'center', color: '#8b5cf6', flexShrink: 0 }}>
            <Shield size={15} />
          </div>
        );
    }
  };

  // Lắng nghe sự kiện Thông báo & Voucher thời gian thực từ Admin (REST API, Socket.IO & Local Storage)
  useEffect(() => {
    let socket = null;

    const fetchServerNotifications = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/notifications');
        if (!res.ok) return;
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          setNotifications(json.data);
          try {
            localStorage.setItem('pf_user_notifications', JSON.stringify(json.data));
          } catch (e) {
            console.debug('Failed to cache notifications:', e);
          }
        }
      } catch (err) {
        console.debug('Failed to fetch notifications from server:', err);
      }
    };

    fetchServerNotifications();
    const pollInterval = setInterval(fetchServerNotifications, 5000);

    const handleIncomingNotif = (notif) => {
      if (!notif) return;
      const newNoti = {
        id: notif.id || `NOTIF-${Date.now()}`,
        type: notif.type || 'offer',
        title: notif.title || (language === 'vi' ? '🎁 Ưu đãi mới từ SmartPark!' : '🎁 New Offer from SmartPark!'),
        titleEn: notif.titleEn || notif.title || 'New Offer from SmartPark!',
        message: notif.message || '',
        messageEn: notif.messageEn || notif.message || '',
        time: notif.time || (language === 'vi' ? 'Vừa xong' : 'Just now'),
        timeEn: notif.timeEn || 'Just now',
        voucherCode: notif.voucherCode || notif.voucher_code || (notif.voucher?.code) || (notif.attachedVoucher?.code) || null,
        voucherData: notif.voucherData || notif.voucher || notif.attachedVoucher || null,
        voucher: notif.voucher || notif.voucherData || notif.attachedVoucher || null,
        unread: notif.unread !== undefined ? notif.unread : true
      };

      playChimeSound();

      // Thông báo đẩy Native Web Notification ra màn hình Desktop
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(newNoti.title, {
            body: newNoti.message,
            icon: '/vite.svg'
          });
        } catch (err) {
          console.debug('Desktop notification error:', err);
        }
      }

      setActiveToast(newNoti);
      setNotifications((prev) => {
        const filtered = prev.filter((p) => p.id !== newNoti.id);
        const updated = [newNoti, ...filtered];
        try {
          localStorage.setItem('pf_user_notifications', JSON.stringify(updated));
        } catch (err) {
          console.debug('Failed to save notification:', err);
        }
        return updated;
      });

      // Tự đóng popup thông báo nổi sau 8s
      setTimeout(() => {
        setActiveToast((cur) => (cur?.id === newNoti.id ? null : cur));
      }, 8000);
    };

    try {
      socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5
      });

      socket.on('notification:new', (data) => {
        handleIncomingNotif(data);
      });

      socket.on('voucher:new', (v) => {
        if (v) {
          handleIncomingNotif({
            id: `VOUCHER-${v.id || Date.now()}`,
            type: 'offer',
            title: `🎁 Voucher Mới: ${v.code}!`,
            message: `${v.title} - Giảm ${v.discountType === 'percent' ? `${v.discountVal}%` : `${parseInt(v.discountVal, 10).toLocaleString('vi-VN')}đ`}`,
            voucherCode: v.code,
            voucherData: v,
          });
        }
      });

      socket.on('booking:overstay', (data) => {
        if (data) {
          handleIncomingNotif({
            id: `OVERSTAY-${Date.now()}`,
            type: 'warning',
            title: language === 'vi' ? '⚠️ Đã quá giờ đỗ xe đặt trước!' : '⚠️ Parking Time Exceeded!',
            titleEn: '⚠️ Parking Time Exceeded!',
            message: language === 'vi'
              ? `Xe ${data.plate} tại ô ${data.slot || 'đỗ'} đã quá thời gian ${data.overstayMinutes} phút. Hệ thống đang tính phụ phí quá hạn: ${Number(data.overstaySurcharge || 0).toLocaleString('vi-VN')}đ. Vui lòng di chuyển xe ra bãi.`
              : `Vehicle ${data.plate} exceeded reserved time by ${data.overstayMinutes} minutes. Overtime fee: ${Number(data.overstaySurcharge || 0).toLocaleString('vi-VN')} VND.`,
            messageEn: `Vehicle ${data.plate} exceeded reserved time by ${data.overstayMinutes} minutes. Overtime fee: ${Number(data.overstaySurcharge || 0).toLocaleString('vi-VN')} VND.`,
            unread: true
          });
        }
      });


      socket.on('user:points_updated', (data) => {
        if (data?.parkPoints !== undefined) {
          setParkPoints(data.parkPoints);
          try {
            const rawUser = localStorage.getItem('pf_current_user');
            if (rawUser) {
              const u = JSON.parse(rawUser);
              u.parkPoints = data.parkPoints;
              u.loyalty_tier = data.loyaltyTier;
              localStorage.setItem('pf_current_user', JSON.stringify(u));
            }
          } catch {}
        }
      });
    } catch (e) {
      console.warn('Socket client initialization error:', e);
    }

    // Cross-tab synchronization via storage event
    const handleStorage = (e) => {
      if (e.key === 'sp_latest_broadcast_notification' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingNotif(parsed);
        } catch (err) {
          console.debug('Storage sync error:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(pollInterval);
      if (socket) socket.disconnect();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Active Parking Session Data (linked across Dashboard, Booking, and History)
  const [activeSession, setActiveSession] = useState(() => {
    try {
      const savedPasses = localStorage.getItem('sp_prebooked_passes');
      if (savedPasses) {
        const parsed = JSON.parse(savedPasses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const latest = parsed[0];
          return {
            plate: latest.plate || '---',
            model: latest.model || 'Phương tiện',
            vehicle: `${latest.plate || 'Phương tiện'} (${latest.model || 'Xe cá nhân'})`,
            slot: latest.slot || 'Ô đỗ chỉ định',
            slotDetails: `Ô đỗ chỉ định ${latest.slot}`,
            branch: latest.branch || 'SmartPark - Aeon Mall Thanh Khê 1',
            startTime: latest.bookingTime || 'Vừa xong',
            passCode: latest.code,
            passData: latest,
            isActive: true
          };
        }
      }
    } catch (err) {
      console.debug('No saved passes in storage:', err);
    }
    // Đối với tài khoản mới chưa đặt chỗ, không hiển thị phiên đỗ ảo
    return null;
  });

  // Active Parking stopwatch timer (Live Session)
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return activeSession ? 4925 : 0;
  });

  // Selected QR Pass data to display in QrPassModal
  const [selectedQrData, setSelectedQrData] = useState(null);

  // User ParkPoints Balance (can be redeemed for vouchers)
  const [parkPoints, setParkPoints] = useState(() => {
    try {
      const rawUser = localStorage.getItem('pf_current_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        const pts = user?.parkPoints ?? user?.park_points;
        if (typeof pts === 'number') return pts;
      }
    } catch (err) {
      console.debug('Cannot read user points:', err);
    }
    return 500;
  });

  // User Saved Vouchers Wallet (Ví voucher của tôi)
  const [userVouchers, setUserVouchers] = useState(() => getSavedUserVouchers());
  const [preselectedBookingVoucher, setPreselectedBookingVoucher] = useState(null);

  // Đồng bộ voucher từ backend vào ví người dùng nếu đã đăng nhập
  useEffect(() => {
    const fetchBackendVouchers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('http://localhost:5000/api/vouchers/my-vouchers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const backendNormalized = json.data.map(normalizeVoucher).filter(Boolean);
          setUserVouchers((prev) => {
            const currentList = Array.isArray(prev) ? prev : [];
            const merged = [...currentList];
            backendNormalized.forEach((bv) => {
              const idx = merged.findIndex((x) => (x?.code || x?.voucher_code || '').toUpperCase() === bv.code.toUpperCase());
              if (idx === -1) {
                merged.push(bv);
              } else {
                merged[idx] = { ...merged[idx], ...bv };
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.debug('Cannot fetch backend vouchers:', err);
      }
    };
    fetchBackendVouchers();
  }, []);

  // 2 SEPARATE BUBBLES STATE (AI & 24/7 SUPPORT)
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Profile Form Data State with Avatar & Vehicles (khởi tạo trực tiếp từ localStorage)
  const [profileData, setProfileData] = useState(() => {
    const rawUser = localStorage.getItem('pf_current_user');
    const customAvatar = localStorage.getItem('pf_user_avatar');

    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user && (user.fullName || user.full_name || user.email)) {
          const displayName = user.fullName || user.full_name || (user.email ? user.email.split('@')[0] : 'Khách Hàng');
          return {
            fullName: displayName,
            email: user.email || '',
            phone: user.phone || '',
            gender: 'Khác',
            birthday: '2000-01-01',
            avatar: customAvatar || user.avatar || user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            licensePlateDefault: '',
            vehicles: Array.isArray(user.vehicles) ? user.vehicles : []
          };
        }
      } catch (err) {
        console.debug('Cannot parse current user profile:', err);
      }
    }

    return {
      fullName: 'Khách Hàng',
      avatar: customAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      email: '',
      phone: '',
      gender: 'Khác',
      birthday: '2000-01-01',
      licensePlateDefault: '',
      vehicles: []
    };
  });

  // Linked Payment Methods State (MoMo, ZaloPay, Bank, Card)
  const [paymentMethods, setPaymentMethods] = useState(() => {
    try {
      const saved = localStorage.getItem('sp_linked_payments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.debug('Cannot parse payment methods:', err);
    }
    return [];
  });

  // Timer Tick Every Second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format Elapsed Time: HH:MM:SS
  const formatTimer = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentHours = Math.max(1, Math.ceil(elapsedSeconds / 3600));
  const estimatedFee = currentHours * 25000 + 35000;

  // Booking confirm handler from BookingView or Modal
  const handleBookingSuccess = (bookingDetails) => {
    setNotifications((prev) => [
      {
        id: Date.now(),
        type: 'booking',
        title: language === 'vi' ? 'Đặt chỗ bãi xe thành công' : 'Booking Confirmed',
        titleEn: 'Booking Confirmed',
        message: language === 'vi'
          ? `Đã xác nhận giữ chỗ ${bookingDetails.slot} (${bookingDetails.branch}) cho xe ${bookingDetails.vehicle} lúc ${bookingDetails.startTime}.`
          : `Reserved spot ${bookingDetails.slot} (${bookingDetails.branch}) for vehicle ${bookingDetails.vehicle} at ${bookingDetails.startTime}.`,
        messageEn: `Reserved spot ${bookingDetails.slot} (${bookingDetails.branch}) for vehicle ${bookingDetails.vehicle} at ${bookingDetails.startTime}.`,
        time: language === 'vi' ? 'Vừa xong' : 'Just now',
        timeEn: 'Just now',
        unread: true
      },
      ...prev
    ]);

    // Parse plate and model from vehicle string
    const vehicleStr = bookingDetails.vehicle || (profileData?.vehicles?.[0]?.plate ? `${profileData.vehicles[0].plate} (${profileData.vehicles[0].brand || 'Xe cá nhân'})` : 'Phương tiện');
    const plateMatch = vehicleStr.match(/^([^(]+)/);
    const modelMatch = vehicleStr.match(/\(([^)]+)\)/);
    const newPlate = plateMatch ? plateMatch[1].trim() : (profileData?.vehicles?.[0]?.plate || '---');
    const newModel = modelMatch ? modelMatch[1].trim() : (profileData?.vehicles?.[0]?.brand || 'Xe cá nhân');

    const registeredPass = registerNewBooking({
      plate: newPlate,
      model: newModel,
      customer: profileData?.fullName || profileData?.name || 'Khách hàng',
      email: profileData?.email || currentUser?.email || '',
      phone: profileData?.phone || '',
      branch: bookingDetails.branch || selectedBranch,
      floor: bookingDetails.floor || 'B1',
      rawSlot: bookingDetails.slot || 'A-02',
      slot: bookingDetails.slot ? `${bookingDetails.floor ? `Tầng ${bookingDetails.floor} · ` : ''}Ô ${bookingDetails.slot}` : 'Ô đỗ chỉ định',
      duration: bookingDetails.duration,
      startTime: bookingDetails.startTime,
      date: bookingDetails.date,
      totalCost: bookingDetails.totalCost,
      paymentMethod: bookingDetails.paymentMethod
    });

    const newSession = {
      plate: newPlate,
      model: newModel,
      vehicle: vehicleStr,
      slot: registeredPass.slot,
      slotDetails: `Ô đỗ chỉ định ${bookingDetails.slot}`,
      branch: registeredPass.branch,
      startTime: bookingDetails.startTime || 'Vừa xong',
      passCode: registeredPass.code,
      passData: registeredPass,
      isActive: true
    };

    // Cộng điểm thưởng PTS theo đơn giá tiền đặt chỗ có nhân hệ số hạng hội viên
    const earnedPts = bookingDetails?.pointsToEarn || Math.max(10, Math.floor((bookingDetails?.totalCost || 0) / 1000));
    setParkPoints((prev) => {
      const nextPts = prev + earnedPts;
      try {
        const rawUser = localStorage.getItem('pf_current_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          u.parkPoints = nextPts;
          localStorage.setItem('pf_current_user', JSON.stringify(u));
        }
      } catch {}
      return nextPts;
    });

    // Bổ sung thông báo nhận điểm PTS
    setNotifications((prev) => [
      {
        id: Date.now() + 1,
        type: 'points',
        title: language === 'vi' ? `+${earnedPts} Điểm PTS Thưởng Đã Cộng` : `+${earnedPts} PTS Earned`,
        titleEn: `+${earnedPts} PTS Earned`,
        desc: language === 'vi' ? `Bạn nhận được ${earnedPts} điểm thưởng từ phiên đặt chỗ ${registeredPass.slot}.` : `You earned ${earnedPts} points from reservation.`,
        descEn: `You earned ${earnedPts} points from reservation.`,
        time: language === 'vi' ? 'Vừa xong' : 'Just now',
        timeEn: 'Just now',
        unread: true
      },
      ...prev
    ]);

    setActiveSession(newSession);
    setSelectedQrData(registeredPass);
    setElapsedSeconds(0); // Reset timer for new booking
    setIsQrModalOpen(true);
  };

  // Nav menu items (Notice 'Xe của tôi' is cleanly removed)
  const navMenuItems = [
    { key: 'overview', icon: LayoutDashboard, label: t('overview') },
    { key: 'liveMap', icon: Compass, label: t('liveMap'), badge: 'Live' },
    { key: 'booking', icon: Ticket, label: t('booking') },
    { key: 'payments', icon: CreditCard, label: t('payments') },
    { key: 'history', icon: History, label: t('history') },
    { key: 'vouchers', icon: Gift, label: t('vouchers'), badge: 'Hot' },
    { key: 'profile', icon: User, label: t('profile') },
    { key: 'settings', icon: Settings, label: t('settings') },
  ];

  return (
    <div className="pf-home-root" data-theme={theme}>
      {/* Background Atmosphere Mesh */}
      <div className="pf-bg-mesh" aria-hidden="true"></div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <button
          className="pf-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng bảng điều hướng"
        />
      )}

      {/* ===================================================================
          1. MENU SIDEBAR
          =================================================================== */}
      <aside className={`pf-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="pf-sidebar-brand">
          <Link to="/home" className="pf-brand-link" onClick={() => setActiveMenuKey('overview')}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src="/smartpark-logo.png"
                alt="SmartPark Logo"
                style={{
                  width: '44px',
                  height: '44px',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(2,132,199,0.25)',
                  display: 'block'
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-3px',
                width: '10px',
                height: '10px',
                background: '#10b981',
                borderRadius: '50%',
                border: '2px solid var(--pf-sidebar-bg, #0f172a)',
                display: 'block'
              }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div
                className="pf-brand-text"
                style={{
                  background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: '1.25rem',
                  fontWeight: '900',
                  letterSpacing: '0.04em',
                  lineHeight: 1
                }}
              >
                SMART<span style={{ WebkitTextFillColor: 'inherit' }}>PARK</span>
              </div>
              <div style={{
                fontSize: '0.65rem',
                color: 'rgba(148,163,184,0.9)',
                fontWeight: '500',
                letterSpacing: '0.02em',
                lineHeight: 1.2
              }}>
                Bãi Đỗ Xe Thông Minh · Đà Nẵng
              </div>
            </div>
          </Link>
          <button
            className="pf-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="pf-nav-section" aria-label="Menu điều hướng">
          <span className="pf-nav-label">
            {language === 'vi' ? 'HỆ THỐNG ĐIỀU HÀNH' : 'OPERATING SYSTEM'}
          </span>
          {navMenuItems.map(({ key, icon: Icon, label, badge, count }) => (
            <button
              key={key}
              className={`pf-nav-item ${activeMenuKey === key ? 'active' : ''}`}
              onClick={() => {
                setActiveMenuKey(key);
                setSidebarOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge && <span className="pf-nav-badge live">{badge}</span>}
              {count && <span className="pf-nav-badge">{count}</span>}
            </button>
          ))}
        </nav>

        {/* Member Card at Sidebar Bottom */}
        <div className="pf-sidebar-footer">
          <button
            className="pf-member-card"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => setActiveMenuKey('profile')}
          >
            <div className="pf-member-avatar" style={{ overflow: 'hidden' }}>
              <img
                src={profileData.avatar}
                alt={profileData.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="pf-member-info">
              <div className="pf-member-name">{profileData.fullName}</div>
              <div className="pf-member-badge" style={{ color: parkPoints >= 6500 ? '#38bdf8' : parkPoints >= 3000 ? '#eab308' : parkPoints >= 700 ? '#94a3b8' : '#d97706' }}>
                <Sparkles size={11} color={parkPoints >= 6500 ? '#38bdf8' : parkPoints >= 3000 ? '#eab308' : parkPoints >= 700 ? '#94a3b8' : '#d97706'} />{' '}
                {parkPoints >= 6500
                  ? (language === 'vi' ? 'Hội Viên Kim Cương' : 'Diamond Member')
                  : parkPoints >= 3000
                  ? (language === 'vi' ? 'Hội Viên Vàng' : 'Gold Member')
                  : parkPoints >= 700
                  ? (language === 'vi' ? 'Hội Viên Bạc' : 'Silver Member')
                  : (language === 'vi' ? 'Hội Viên Đồng' : 'Bronze Member')}{' '}
                · {parkPoints} pts
              </div>
            </div>
          </button>

          <Link to="/login" className="pf-sidebar-logout">
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </Link>
        </div>
      </aside>

      {/* ===================================================================
          MAIN CONTENT WRAPPER
          =================================================================== */}
      <div className="pf-main-wrapper">
        {/* =================================================================
            TOP HEADER & ACTIONS
            ================================================================= */}
        <header className="pf-top-header">
          <div className="pf-header-left">
            <button
              className="pf-mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu điều hướng"
            >
              <Menu size={20} />
            </button>

            <div>
              <div className="pf-greeting-sub">
                <span className="pf-live-dot"></span>
                <span>
                  {t('liveSystem')} · {new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase())}
                </span>
              </div>
              <h1 className="pf-greeting-title">
                {t('greeting')}, {profileData.fullName}
              </h1>
            </div>
          </div>

          {/* Header Actions */}
          <div className="pf-header-actions">
            {/* Quick Search */}
            <div className="pf-quick-search">
              <Search size={15} color="#0284c7" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                aria-label="Tìm kiếm bãi đỗ xe"
              />
            </div>

            {/* Dark / Light Theme Toggle Button */}
            <button
              className="pf-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? t('darkMode') : t('lightMode')}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Quick Language Switcher Button */}
            <button
              className="pf-lang-switch-btn"
              onClick={() => handleLanguageChange(language === 'vi' ? 'en' : 'vi')}
              title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              <Globe size={13} />
              <span>{language === 'vi' ? '🇻🇳 VN' : '🇬🇧 EN'}</span>
            </button>

            {/* Branch Selector */}
            <button
              className="pf-branch-btn"
              onClick={() => {
                const branches = [
                  'SmartPark - Aeon Mall Thanh Khê 1 (Đà Nẵng)',
                  'SmartPark - Vincom Plaza Ngô Quyền (Đà Nẵng)',
                  'SmartPark - Sân Bay Quốc Tế Đà Nẵng'
                ];
                const currentIndex = branches.indexOf(selectedBranch);
                const nextBranch = branches[(currentIndex + 1) % branches.length] || branches[0];
                setSelectedBranch(nextBranch);
              }}
              title={t('switchBranch')}
            >
              <MapPin size={15} color="#0284c7" />
              <span>{selectedBranch}</span>
              <ChevronDown size={14} color="#6b7280" />
            </button>

            {/* Notification Center Dropdown */}
            <div className="pf-notification-wrapper" ref={notiRef}>
              <button
                className={`pf-action-icon-btn ${showNotifications ? 'active' : ''}`}
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserDropdown(false);
                }}
                aria-label="Xem thông báo"
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="pf-unread-badge">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="pf-notification-dropdown">
                  <div className="pf-noti-header">
                    <div className="pf-noti-title-group">
                      <strong>{t('notifications')}</strong>
                      {unreadCount > 0 && (
                        <span className="pf-noti-count">{unreadCount} {language === 'vi' ? 'mới' : 'new'}</span>
                      )}
                    </div>
                    <div className="pf-noti-header-actions">
                      <button
                        className="pf-noti-action-text"
                        onClick={handleMarkAllRead}
                        title="Đánh dấu tất cả đã đọc"
                      >
                        <Check size={14} style={{ display: 'inline', marginRight: '3px' }} />
                        {t('markRead')}
                      </button>
                      <button
                        className="pf-noti-action-text"
                        onClick={handleClearNotifications}
                        title="Xóa tất cả"
                      >
                        <Trash2 size={13} style={{ display: 'inline', marginRight: '3px' }} />
                        {t('clearAll')}
                      </button>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="pf-noti-tabs">
                    {[
                      { key: 'all', label: t('all') },
                      { key: 'booking', label: t('bookingTab') },
                      { key: 'payment', label: t('paymentTab') },
                      { key: 'offer', label: t('offerTab') },
                      { key: 'security', label: t('securityTab') },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        className={`pf-noti-tab-btn ${notiFilter === tab.key ? 'active' : ''}`}
                        onClick={() => setNotiFilter(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification List Items */}
                  <div className="pf-noti-list" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((noti) => (
                        <div
                          key={noti.id}
                          className={`pf-noti-item ${noti.unread ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(noti)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.65rem',
                            padding: '0.75rem 0.9rem',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          {/* Phân loại bằng Icon */}
                          {renderNotiIcon(noti.type)}

                          <div className="pf-noti-item-content" style={{ flex: 1, minWidth: 0 }}>
                            <div className="pf-noti-item-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--pf-text-main)' }}>
                                {language === 'vi' ? noti.title : (noti.titleEn || noti.title)}
                              </strong>
                              <span className="pf-noti-time" style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                {language === 'vi' ? noti.time : (noti.timeEn || noti.time)}
                              </span>
                            </div>
                            <p className="pf-noti-message" style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--pf-text-muted)', lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {language === 'vi' ? noti.message : (noti.messageEn || noti.message)}
                            </p>
                            {(noti.voucherCode || noti.voucher?.code || noti.voucherData?.code) && (
                              <div style={{ marginTop: '0.35rem' }}>
                                <span className="pf-noti-voucher-pill">
                                  🎁 {noti.voucherCode || noti.voucher?.code || noti.voucherData?.code}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Nút xóa nhanh từng thông báo */}
                          <button
                            type="button"
                            title={language === 'vi' ? 'Xóa thông báo' : 'Delete notification'}
                            onClick={(e) => handleDeleteSingleNoti(e, noti.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px',
                              opacity: 0.7
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="pf-noti-empty" style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                        <Bell size={28} style={{ opacity: 0.35, marginBottom: '0.35rem' }} />
                        <div>{t('noNoti')}</div>
                      </div>
                    )}
                  </div>

                  <div className="pf-noti-footer">
                    <button
                      type="button"
                      className="pf-noti-view-all"
                      onClick={() => {
                        setShowNotifications(false);
                        setShowFullNotiCenter(true);
                      }}
                      style={{ width: '100%', cursor: 'pointer', fontWeight: '700' }}
                    >
                      {language === 'vi' ? '⚡ Mở Trung Tâm Thông Báo Đầy Đủ' : '⚡ Open Full Notification Center'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="pf-user-wrapper" ref={userMenuRef}>
              <button
                className={`pf-user-pill-btn ${showUserDropdown ? 'active' : ''}`}
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowNotifications(false);
                }}
                aria-label="Menu tài khoản"
              >
                <div className="pf-user-avatar" style={{ overflow: 'hidden' }}>
                  <img
                    src={profileData.avatar}
                    alt={profileData.fullName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <span className="pf-user-name-label">{profileData.fullName}</span>
                <ChevronDown size={14} color="#6b7280" />
              </button>

              {showUserDropdown && (
                <div className="pf-user-dropdown">
                  <div className="pf-user-menu-header">
                    <div className="pf-user-avatar" style={{ width: '2.4rem', height: '2.4rem', overflow: 'hidden' }}>
                      <img
                        src={profileData.avatar}
                        alt={profileData.fullName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.88rem' }}>{profileData.fullName}</strong>
                      <small style={{ color: 'var(--pf-text-muted)' }}>{profileData.email}</small>
                    </div>
                  </div>

                  <div className="pf-user-quick-stats">
                    <div className="pf-quick-stat-item">
                      <span>{t('goldMember')}</span>
                      <strong style={{ color: '#0284c7' }}>{parkPoints} pts</strong>
                    </div>
                    <div className="pf-quick-stat-item">
                      <span>{t('defaultPayment')}</span>
                      <strong>Ví MoMo</strong>
                    </div>
                  </div>

                  <div className="pf-user-menu-list">
                    <button
                      className="pf-user-menu-btn"
                      onClick={() => {
                        setShowUserDropdown(false);
                        setActiveMenuKey('profile');
                      }}
                    >
                      <User size={16} />
                      <span>{t('myProfile')}</span>
                    </button>
                    <button
                      className="pf-user-menu-btn"
                      onClick={() => {
                        setShowUserDropdown(false);
                        setActiveMenuKey('payments');
                      }}
                    >
                      <CreditCard size={16} />
                      <span>{t('paymentsMenu')}</span>
                    </button>
                    <div style={{ height: '1px', background: 'var(--pf-border)', margin: '4px 0' }} />
                    <button
                      className="pf-user-menu-btn logout"
                      onClick={() => navigate('/login')}
                    >
                      <LogOut size={16} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ===================================================================
            VIEW CHUYỂN ĐỔI THEO MENU
            =================================================================== */}

        {/* 1. TỔNG QUAN */}
        {activeMenuKey === 'overview' && (
          <DashboardView
            onNavigateMenu={(menuName) => {
              if (menuName.includes('Bản đồ') || menuName.includes('Map')) setActiveMenuKey('liveMap');
              else if (menuName.includes('Thanh toán') || menuName.includes('Payment')) setActiveMenuKey('payments');
              else if (menuName.includes('Lịch sử') || menuName.includes('History')) setActiveMenuKey('history');
              else if (menuName.includes('Voucher') || menuName.includes('Ưu đãi')) setActiveMenuKey('vouchers');
              else setActiveMenuKey('booking');
            }}
            onOpenQrModal={() => {
              if (activeSession) {
                setSelectedQrData(activeSession.passData || {
                  code: activeSession.passCode || 'PF-PASS-9842-51H89632',
                  plate: activeSession.plate,
                  model: activeSession.model,
                  vehicle: activeSession.vehicle,
                  slot: activeSession.slot,
                  branch: activeSession.branch,
                  bookingTime: activeSession.startTime
                });
                setIsQrModalOpen(true);
              } else {
                setIsBookingModalOpen(true);
              }
            }}
            onOpenBookingModal={() => setIsBookingModalOpen(true)}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenAi={() => setIsAiOpen(true)}
            elapsedSeconds={elapsedSeconds}
            formatTimer={formatTimer}
            estimatedFee={estimatedFee}
            activeSession={activeSession}
            selectedBranch={selectedBranch}
            language={language}
          />
        )}

        {/* 2. BẢN ĐỒ TRỰC TIẾP (GOOGLE MAPS API EMBED) */}
        {activeMenuKey === 'liveMap' && (
          <LiveMapView
            onSelectStationToBook={(station) => {
              setSelectedBranch(station.name);
              setActiveMenuKey('booking');
            }}
            language={language}
          />
        )}

        {/* 3. ĐẶT CHỖ TRƯỚC (GỌN GÀNG -> DIALOG CHỌN Ô & THANH TOÁN ÁP MÃ TẠI ĐÓ) */}
        {activeMenuKey === 'booking' && (
          <BookingView
            vehiclesList={profileData.vehicles}
            initialBranch={selectedBranch}
            userVouchers={userVouchers}
            setUserVouchers={setUserVouchers}
            initialVoucher={preselectedBookingVoucher}
            onBookingSuccess={handleBookingSuccess}
            language={language}
          />
        )}

        {/* 4. THANH TOÁN & LIÊN KẾT (MOMO, ZALOPAY, NGÂN HÀNG, THẺ) */}
        {activeMenuKey === 'payments' && (
          <PaymentsView
            paymentMethods={paymentMethods}
            setPaymentMethods={setPaymentMethods}
            userEmail={profileData.email}
            language={language}
          />
        )}

        {/* 5. LỊCH SỬ ĐỖ XE */}
        {activeMenuKey === 'history' && (
          <HistoryView
            onOpenQrModal={(sessionData) => {
              setSelectedQrData(sessionData);
              setIsQrModalOpen(true);
            }}
            language={language}
          />
        )}

        {/* 6. ƯU ĐÃI, KHO VOUCHER & ĐỔI ĐIỂM TÍCH LŨY */}
        {activeMenuKey === 'vouchers' && (
          <PromosView
            parkPoints={parkPoints}
            setParkPoints={setParkPoints}
            userVouchers={userVouchers}
            setUserVouchers={setUserVouchers}
            onNavigateBooking={(v) => {
              setPreselectedBookingVoucher(v || null);
              setActiveMenuKey('booking');
            }}
            language={language}
          />
        )}

        {/* 7. TRANG CÁ NHÂN (AVATAR, XE, ĐIỂM THƯỞNG, BẢO MẬT) */}
        {activeMenuKey === 'profile' && (
          <ProfileView
            profileData={profileData}
            setProfileData={setProfileData}
            parkPoints={parkPoints}
            language={language}
          />
        )}

        {/* 8. CÀI ĐẶT HỆ THỐNG */}
        {activeMenuKey === 'settings' && (
          <SettingsView
            language={language}
            onLanguageChange={handleLanguageChange}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}
      </div>

      {/* ===================================================================
          2 BONG BÓNG NỔI GÓC PHẢI DƯỚI (AI BUBBLE & SUPPORT BUBBLE)
          =================================================================== */}
      <div className="pf-floating-actions-dock">
        {/* Bong bóng 1: Trợ lý AI */}
        <AiChatBubble
          isOpen={isAiOpen}
          onToggle={() => {
            setIsAiOpen(!isAiOpen);
            setIsSupportOpen(false);
          }}
          onClose={() => setIsAiOpen(false)}
          activeFloor="B2"
          formatTimer={formatTimer}
          elapsedSeconds={elapsedSeconds}
          estimatedFee={estimatedFee}
          language={language}
        />

        {/* Bong bóng 2: Hỗ trợ 24/7 & Cứu hộ đa kênh */}
        <SupportBubble
          isOpen={isSupportOpen}
          onToggle={() => {
            setIsSupportOpen(!isSupportOpen);
            setIsAiOpen(false);
          }}
          onClose={() => setIsSupportOpen(false)}
          language={language}
        />
      </div>

      {/* ===================================================================
          MODALS
          =================================================================== */}
      {/* 1. Modal QR Barrier Pass */}
      <QrPassModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        passData={selectedQrData}
        vehicle={selectedQrData?.vehicle || activeSession?.vehicle || 'Chưa có xe'}
        slot={selectedQrData?.slot || activeSession?.slot || 'Chưa có vị trí'}
        branch={selectedQrData?.branch || activeSession?.branch || selectedBranch}
        language={language}
      />

      {/* 2. Dialog Đặt chỗ nhanh từ Dashboard */}
      <SlotSelectionDialog
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        bookingInfo={{
          branch: selectedBranch,
          vehicle: (profileData?.vehicles && profileData.vehicles[0])
            ? `${profileData.vehicles[0].plate} (${profileData.vehicles[0].brand || 'Xe cá nhân'})`
            : '',
          duration: '2 giờ',
          paymentMethod: 'vietqr'
        }}
        userVouchers={userVouchers}
        setUserVouchers={setUserVouchers}
        initialVoucher={preselectedBookingVoucher}
        onConfirmBooking={handleBookingSuccess}
        language={language}
      />

      {/* 3. Popup Toast thông báo thời gian thực khi Admin phát thông báo hoặc voucher */}
      {activeToast && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 99998,
            maxWidth: '420px',
            width: 'calc(100vw - 3rem)',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            border: '1px solid rgba(14, 165, 233, 0.45)',
            boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.5), 0 0 20px rgba(14, 165, 233, 0.25)',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(14, 165, 233, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              flexShrink: 0
            }}
          >
            <Bell size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{activeToast.title}</strong>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700, background: 'rgba(14, 165, 233, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>Real-time</span>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              {activeToast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.2rem'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 4. Modal Chi Tiết Thông Báo Khi Nhấn Vào */}
      {selectedNotiDetail && (
        <div
          className="pf-dialog-overlay"
          onClick={() => setSelectedNotiDetail(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--pf-surface, #ffffff)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--pf-border, #e2e8f0)',
              overflow: 'hidden',
              animation: 'pf-fade-down 0.25s ease-out'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--pf-border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--pf-surface-subtle, #f8fafc)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {renderNotiIcon(selectedNotiDetail.type)}
                <div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: selectedNotiDetail.type === 'offer' ? '#ec4899' : selectedNotiDetail.type === 'booking' ? '#0284c7' : selectedNotiDetail.type === 'payment' ? '#10b981' : '#8b5cf6'
                  }}>
                    {selectedNotiDetail.type === 'offer' ? '🎁 Khuyến mãi & Ưu đãi' : selectedNotiDetail.type === 'booking' ? '🚗 Đặt chỗ đỗ xe' : selectedNotiDetail.type === 'payment' ? '💳 Giao dịch & Hóa đơn' : '🛡️ An ninh hệ thống'}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedNotiDetail.time || 'Vừa xong'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotiDetail(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.85rem', fontSize: '1.15rem', fontWeight: 800, color: 'var(--pf-text-main, #0f172a)' }}>
                {language === 'vi' ? selectedNotiDetail.title : (selectedNotiDetail.titleEn || selectedNotiDetail.title)}
              </h3>
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--pf-text-muted, #475569)', whiteSpace: 'pre-line' }}>
                {language === 'vi' ? selectedNotiDetail.message : (selectedNotiDetail.messageEn || selectedNotiDetail.message)}
              </p>

              {/* Banner Voucher Đính Kèm & Nút Thu Thập Dùng Ngay */}
              {(selectedNotiDetail.voucherCode || selectedNotiDetail.voucher?.code || selectedNotiDetail.voucherData?.code) && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(244,114,182,0.12) 100%)',
                  border: '1.5px dashed #f472b6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(236,72,153,0.15)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.3rem'
                    }}>
                      🎁
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {language === 'vi' ? 'Voucher đính kèm đặc quyền' : 'Exclusive Voucher Attached'}
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#be185d', letterSpacing: '0.5px', marginTop: '2px' }}>
                        {selectedNotiDetail.voucherCode || selectedNotiDetail.voucher?.code || selectedNotiDetail.voucherData?.code}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaimVoucherFromNoti(selectedNotiDetail)}
                    style={{
                      background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem 1.1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(236,72,153,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <Gift size={15} />
                    <span>{language === 'vi' ? 'Thu thập & Dùng ngay' : 'Claim & Use Now'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--pf-border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: 'var(--pf-surface-subtle, #f8fafc)'
            }}>
              <button
                type="button"
                className="pf-btn-cancel"
                onClick={() => setSelectedNotiDetail(null)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>

              {selectedNotiDetail.type === 'offer' && (
                <button
                  type="button"
                  className="pf-btn-submit"
                  onClick={() => {
                    setSelectedNotiDetail(null);
                    setActiveMenuKey('vouchers');
                  }}
                  style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Gift size={15} />
                  <span>{language === 'vi' ? 'Khám phá ưu đãi ngay' : 'Explore Offers'}</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {selectedNotiDetail.type === 'booking' && (
                <button
                  type="button"
                  className="pf-btn-submit"
                  onClick={() => {
                    setSelectedNotiDetail(null);
                    if (activeSession) {
                      setSelectedQrData(activeSession.passData || {
                        code: activeSession.passCode,
                        plate: activeSession.plate,
                        slot: activeSession.slot,
                        branch: activeSession.branch,
                        bookingTime: activeSession.startTime
                      });
                      setIsQrModalOpen(true);
                    } else {
                      setActiveMenuKey('booking');
                    }
                  }}
                  style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Ticket size={15} />
                  <span>{activeSession ? (language === 'vi' ? 'Xem vé Barrier Pass' : 'View Pass') : (language === 'vi' ? 'Đặt chỗ mới' : 'Book spot')}</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {selectedNotiDetail.type === 'payment' && (
                <button
                  type="button"
                  className="pf-btn-submit"
                  onClick={() => {
                    setSelectedNotiDetail(null);
                    setActiveMenuKey('history');
                  }}
                  style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <History size={15} />
                  <span>{language === 'vi' ? 'Xem Lịch sử giao dịch' : 'View History'}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Trung Tâm Toàn Bộ Thông Báo Hệ Thống */}
      {showFullNotiCenter && (
        <div
          className="pf-dialog-overlay"
          onClick={() => setShowFullNotiCenter(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99998,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--pf-surface, #ffffff)',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--pf-border, #e2e8f0)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--pf-border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--pf-surface-subtle, #f8fafc)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(2,132,199,0.15)', display: 'grid', placeItems: 'center', color: '#0284c7' }}>
                  <Bell size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--pf-text-main, #0f172a)' }}>
                    {language === 'vi' ? 'Trung tâm Thông báo SmartPark' : 'SmartPark Notification Center'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {unreadCount > 0 ? (language === 'vi' ? `${unreadCount} thông báo chưa đọc` : `${unreadCount} unread`) : (language === 'vi' ? 'Bạn đã đọc hết thông báo' : 'All caught up')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {notifications.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="pf-btn-text-link"
                      style={{ fontSize: '0.8rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem', borderRadius: '6px', background: 'rgba(2,132,199,0.08)' }}
                    >
                      <Check size={14} /> {language === 'vi' ? 'Đọc tất cả' : 'Mark all read'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearNotifications}
                      className="pf-btn-text-link"
                      style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem', borderRadius: '6px', background: 'rgba(239,68,68,0.08)' }}
                    >
                      <Trash2 size={14} /> {language === 'vi' ? 'Xóa hết' : 'Clear all'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullNotiCenter(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Search & Tabs */}
            <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid var(--pf-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Search box */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder={language === 'vi' ? 'Tìm kiếm trong thông báo...' : 'Search notifications...'}
                  value={notiSearchQuery}
                  onChange={(e) => setNotiSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 1rem 0.55rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--pf-border, #cbd5e1)',
                    background: 'var(--pf-surface, #ffffff)',
                    fontSize: '0.85rem',
                    color: 'var(--pf-text-main, #0f172a)'
                  }}
                />
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { key: 'all', label: language === 'vi' ? 'Tất cả' : 'All' },
                  { key: 'offer', label: language === 'vi' ? '🎁 Ưu đãi & Quà' : '🎁 Offers' },
                  { key: 'booking', label: language === 'vi' ? '🚗 Đặt chỗ' : '🚗 Bookings' },
                  { key: 'payment', label: language === 'vi' ? '💳 Giao dịch' : '💳 Payments' },
                  { key: 'security', label: language === 'vi' ? '🛡️ An ninh' : '🛡️ Security' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setNotiFilter(tab.key)}
                    style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: notiFilter === tab.key ? '1px solid #0284c7' : '1px solid var(--pf-border, #e2e8f0)',
                      background: notiFilter === tab.key ? '#0284c7' : 'transparent',
                      color: notiFilter === tab.key ? '#ffffff' : 'var(--pf-text-muted, #64748b)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {(() => {
                const list = notifications
                  .filter((n) => (notiFilter === 'all' ? true : n.type === notiFilter))
                  .filter((n) => {
                    if (!notiSearchQuery.trim()) return true;
                    const q = notiSearchQuery.toLowerCase();
                    return (
                      (n.title && n.title.toLowerCase().includes(q)) ||
                      (n.message && n.message.toLowerCase().includes(q))
                    );
                  });

                if (list.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                      <Bell size={40} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {language === 'vi' ? 'Không tìm thấy thông báo nào' : 'No notifications found'}
                      </div>
                    </div>
                  );
                }

                return list.map((noti) => (
                  <div
                    key={noti.id}
                    onClick={() => handleNotificationClick(noti)}
                    style={{
                      padding: '0.9rem 1.15rem',
                      borderRadius: '12px',
                      background: noti.unread ? 'rgba(2, 132, 199, 0.05)' : 'var(--pf-surface, #ffffff)',
                      border: noti.unread ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid var(--pf-border, #e2e8f0)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {renderNotiIcon(noti.type)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--pf-text-main, #0f172a)' }}>
                          {language === 'vi' ? noti.title : (noti.titleEn || noti.title)}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {language === 'vi' ? noti.time : (noti.timeEn || noti.time)}
                          </span>
                          <button
                            type="button"
                            title="Xóa thông báo này"
                            onClick={(e) => handleDeleteSingleNoti(e, noti.id)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 4px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: 'var(--pf-text-muted, #64748b)', lineHeight: 1.4 }}>
                        {language === 'vi' ? noti.message : (noti.messageEn || noti.message)}
                      </p>
                      {(noti.voucherCode || noti.voucher?.code || noti.voucherData?.code) && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <span className="pf-noti-voucher-pill">
                            🎁 {noti.voucherCode || noti.voucher?.code || noti.voucherData?.code}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
