import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Bot,
  Send,
  Sparkles,
  X,
  MapPin,
  Clock,
  Coins,
  RotateCcw
} from 'lucide-react';
import { getTranslation } from '../../utils/i18n';

const MOCK_KNOWLEDGE_BASE = {
  vehicles: [
    { plate: '43B - 896.32', model: 'Kia Morning', floor: 'B2', spot: 'B-08', aisle: 'Sảnh thang máy B', distance: '15m' },
    { plate: '43A - 345.67', model: 'Toyota Vios', floor: 'B1', spot: 'A-02', aisle: 'Cổng ra rào chắn', distance: '18m' }
  ],
  branches: [
    { name: 'SmartPark - Aeon Mall Thanh Khê 1', spotsFree: 87, total: 600, rate: '10.000đ/h' },
    { name: 'SmartPark - Vincom Plaza Ngô Quyền', spotsFree: 55, total: 400, rate: '10.000đ/h' },
    { name: 'SmartPark - Sân Bay Quốc Tế Đà Nẵng', spotsFree: 220, total: 1200, rate: '20.000đ/2h' }
  ],
  floors: {
    B1: { free: 19, total: 45, note: 'Xe tiêu chuẩn, cận thang máy' },
    B2: { free: 28, total: 60, note: 'Thông gió mát mẻ, lối ra nhanh' },
    B3: { free: 14, total: 35, note: 'Khu đỗ VIP & dài hạn' }
  }
};

export default function AiChatBubble({
  isOpen,
  onToggle,
  onClose,
  activeFloor = 'B2',
  formatTimer,
  elapsedSeconds = 4925,
  estimatedFee = 60000,
  language = 'vi'
}) {
  const t = (key) => getTranslation(language, key);

  // Lấy dữ liệu phương tiện thực tế của người dùng từ bộ nhớ
  const userPass = (() => {
    try {
      const passes = JSON.parse(localStorage.getItem('sp_prebooked_passes') || '[]');
      return passes.find((p) => p.status === 'ACTIVE') || passes[0] || null;
    } catch {
      return null;
    }
  })();
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || localStorage.getItem('pf_current_user') || '{}');
    } catch {
      return {};
    }
  })();

  const userCarModel = userPass?.model || currentUser?.model || 'Ô tô cá nhân';
  const userCarPlate = userPass?.plate || currentUser?.plate || '43B - 896.32';
  const userCarSlot = userPass?.slot || `${activeFloor} · Ô B-08`;

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const msgIdCounter = useRef(10);

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: language === 'vi'
        ? 'Chào bạn! Tôi là Trợ lý AI SmartPark kết nối dữ liệu thời gian thực từ hệ thống bãi xe Đà Nẵng. Tôi có thể hỗ trợ bạn định vị vị trí xe, tính cước gửi hiện tại, kiểm tra ô đỗ trống hoặc thông tin hội viên & voucher!'
        : 'Hello! I am SmartPark AI Assistant connected with real-time parking system in Da Nang. I can help locate your vehicle, calculate stay fees, check vacant spots, or loyalty perks & vouchers!',
      time: 'Vừa xong',
      suggestions: [
        language === 'vi' ? '📍 Vị trí xe tôi đang đỗ?' : '📍 Where is my car parked?',
        language === 'vi' ? '💰 Tiền gửi tạm tính hiện tại?' : '💰 Current estimated fee?',
        language === 'vi' ? `🅿️ Ô đỗ còn trống tầng ${activeFloor}?` : `🅿️ Vacant spots on level ${activeFloor}?`,
        language === 'vi' ? '⭐ Đặc quyền hội viên SmartPark?' : '⭐ Member perks?'
      ]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [chatMessages, isOpen]);

  const handleSendMessage = (customText) => {
    const query = (customText || chatInput).trim();
    if (!query) return;

    msgIdCounter.current += 1;
    const userMsg = {
      id: msgIdCounter.current,
      sender: 'user',
      text: query,
      time: 'Vừa xong'
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const token = localStorage.getItem('token');

    // Gửi câu hỏi tới API Trợ lý AI Backend với dữ liệu thời gian thực
    fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        message: query,
        context: {
          userId: currentUser?.id,
          plate: userCarPlate,
          slot: userCarSlot,
          branch: userPass?.branch || 'SmartPark - Aeon Mall Thanh Khê 1',
          elapsedSeconds,
          estimatedFee
        }
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setIsTyping(false);
        const botReply = data?.reply || (language === 'vi' ? 'Trợ lý SmartPark Đà Nẵng sẵn sàng hỗ trợ bạn.' : 'SmartPark Assistant is ready.');

        msgIdCounter.current += 1;
        setChatMessages((prev) => [
          ...prev,
          {
            id: msgIdCounter.current,
            sender: 'bot',
            text: botReply,
            time: 'Vừa xong',
            suggestions: [
              language === 'vi' ? '📍 Vị trí xe tôi đang đỗ?' : '📍 Where is my car?',
              language === 'vi' ? '💰 Biểu phí cước gửi xe?' : '💰 Parking tariffs?',
              language === 'vi' ? '⭐ Đặc quyền hội viên Bạc/Vàng/Kim Cương?' : '⭐ Loyalty tiers?',
              language === 'vi' ? '🏷️ Mã giảm giá nào tốt nhất?' : '🏷️ Best promo voucher?'
            ]
          }
        ]);
      })
      .catch((err) => {
        console.warn('Fallback to local knowledge:', err);
        setIsTyping(false);
        const qLower = query.toLowerCase();
        let botReply = '';

        if (qLower.includes('xe') || qLower.includes('vị trí')) {
          botReply = `📍 Dữ liệu cảm biến SmartPark: Phương tiện ${userCarModel} (Biển số ${userCarPlate}) đang đỗ tại ${userCarSlot} (Chi nhánh Aeon Mall Thanh Khê 1).`;
        } else if (qLower.includes('phí') || qLower.includes('tiền') || qLower.includes('giá')) {
          botReply = `💰 Chi phí gửi xe thời gian thực: ${estimatedFee ? estimatedFee.toLocaleString('vi-VN') : '45.000'}đ. Biểu phí niêm yết: 25.000đ/2h đầu, 10.000đ/giờ tiếp theo. Bạn có thể quét mã VietQR hoặc thanh toán tự động qua MoMo/ZaloPay.`;
        } else if (qLower.includes('chỗ') || qLower.includes('tầng')) {
          botReply = `🅿️ Trạng thái Tầng ${activeFloor}: Hiện hệ thống ghi nhận còn các ô đỗ trống khả dụng. Bạn có thể chọn và giữ chỗ trực tiếp trên bản đồ 3D!`;
        } else if (qLower.includes('hội viên') || qLower.includes('điểm') || qLower.includes('hạng')) {
          botReply = '⭐ Hệ thống Hội Viên SmartPark:\n• Bạc (Từ 700 pts): Giảm 5% cước gửi, ưu tiên đặt chỗ.\n• Vàng (Từ 3.000 pts): Giảm 10% cước gửi, miễn phụ phí giờ cao điểm.\n• Kim Cương (Từ 6.500 pts): Giảm 20% cước gửi toàn hệ thống, bảo lưu ô VIP riêng.';
        } else {
          botReply = '🚗 Trợ lý SmartPark Đà Nẵng: Tôi chỉ hỗ trợ các thông tin liên quan đến bãi xe, ô đỗ, giá vé, thanh toán và voucher của SmartPark. Xin quý khách vui lòng hỏi các câu hỏi liên quan đến hệ thống bãi xe!';
        }

        msgIdCounter.current += 1;
        setChatMessages((prev) => [
          ...prev,
          {
            id: msgIdCounter.current,
            sender: 'bot',
            text: botReply,
            time: 'Vừa xong'
          }
        ]);
      });
  };

  const handleResetChat = () => {
    msgIdCounter.current += 1;
    setChatMessages([
      {
        id: msgIdCounter.current,
        sender: 'bot',
        text: language === 'vi'
          ? 'Đã làm mới cuộc hội thoại! Bạn muốn tôi hỗ trợ thông tin gì về đỗ xe hôm nay?'
          : 'Chat refreshed! How may I assist your parking experience today?',
        time: 'Vừa xong',
        suggestions: [
          language === 'vi' ? '📍 Vị trí xe tôi đang đỗ?' : '📍 Where is my car?',
          language === 'vi' ? '💰 Tiền gửi tạm tính hiện tại?' : '💰 Current stay fee?',
          language === 'vi' ? `🅿️ Ô đỗ còn trống tầng ${activeFloor}?` : `🅿️ Free spots on ${activeFloor}?`,
          language === 'vi' ? '⭐ Đặc quyền hạng hội viên?' : '⭐ Member benefits?'
        ]
      }
    ]);
  };

  return (
    <div className="pf-single-bubble-wrapper">
      <span className="pf-bubble-tooltip">
        {language === 'vi' ? 'Trợ lý AI Parkflow (Hỏi vị trí xe, phí & ô đỗ)' : 'Parkflow AI Assistant'}
      </span>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          className="pf-circle-bubble-btn ai"
          onClick={onToggle}
          aria-label="Mở Trợ lý AI"
        >
          <div className="pf-bubble-avatar-crop">
            <img
              src="/ai-assistant-avatar.png?v=2"
              alt="SmartPark AI"
            />
          </div>
          <span className="pf-bubble-tag-badge ai">AI</span>
        </button>
      </div>

      {isOpen && (
        <div className="pf-standalone-popup pf-ai-enhanced-popup">
          {/* Header */}
          <div className="pf-chat-popup-head">
            <div className="pf-chat-popup-head-left">
              <div className="pf-ai-avatar-icon" style={{ padding: 0, overflow: 'hidden', width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #38bdf8', boxShadow: '0 0 10px rgba(56,189,248,0.4)' }}>
                <img
                  src="/ai-assistant-avatar.png?v=2"
                  alt="SmartPark AI Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <strong>{t('aiName')}</strong>
                  <span className="pf-ai-status-pill">
                    <span className="pf-live-dot"></span> Online 24/7
                  </span>
                </div>
                <small>{t('aiSub')}</small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                className="pf-chat-action-btn"
                onClick={handleResetChat}
                title={language === 'vi' ? 'Làm mới cuộc trò chuyện' : 'Reset chat'}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className="pf-chat-close-btn"
                onClick={onClose}
                aria-label="Đóng Trợ lý AI"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Context Strip */}
          <div className="pf-ai-context-strip">
            <div className="pf-ai-context-item">
              <MapPin size={13} color="#0284c7" />
              <span>{userCarModel} · <strong>{userCarSlot}</strong></span>
            </div>
            <div className="pf-ai-context-item">
              <Clock size={13} color="#10b981" />
              <span>{formatTimer ? formatTimer(elapsedSeconds) : '01:22:05'}</span>
            </div>
            <div className="pf-ai-context-item">
              <Coins size={13} color="#f59e0b" />
              <span>{estimatedFee ? estimatedFee.toLocaleString('vi-VN') : '60.000'}đ</span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="pf-chat-msg-area">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`pf-chat-msg ${msg.sender}`}>
                <div className="pf-chat-bubble">
                  {msg.text.split('\n').map((line, lIdx) => (
                    <p key={lIdx} style={{ margin: '0 0 0.4rem 0', lineHeight: 1.55 }}>
                      {line}
                    </p>
                  ))}

                  {/* Inline interactive chips for each bot message */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="pf-chat-inline-suggestions">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="pf-inline-sug-chip"
                          onClick={() => handleSendMessage(sug)}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="pf-chat-msg-time">{msg.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="pf-chat-msg bot">
                <div className="pf-chat-bubble pf-typing-bubble">
                  <span className="pf-typing-dot"></span>
                  <span className="pf-typing-dot"></span>
                  <span className="pf-typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Prompts Strip */}
          <div className="pf-chat-quick-prompts">
            <button
              type="button"
              className="pf-quick-chip"
              onClick={() => handleSendMessage(language === 'vi' ? 'Vị trí xe tôi đang đỗ?' : 'Where is my car parked?')}
            >
              {t('aiPrompt1')}
            </button>
            <button
              type="button"
              className="pf-quick-chip"
              onClick={() => handleSendMessage(language === 'vi' ? 'Tiền gửi tạm tính hiện tại?' : 'What is my current fee?')}
            >
              {t('aiPrompt2')}
            </button>
            <button
              type="button"
              className="pf-quick-chip"
              onClick={() => handleSendMessage(language === 'vi' ? 'Tầng B2 còn bao nhiêu ô trống?' : 'How many spots available on B2?')}
            >
              {t('aiPrompt3')}
            </button>
          </div>

          {/* Input Footer Form */}
          <form
            className="pf-chat-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              placeholder={t('aiPlaceholder')}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              className="pf-chat-send-btn"
              disabled={!chatInput.trim()}
              aria-label="Gửi tin"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

AiChatBubble.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  activeFloor: PropTypes.string,
  formatTimer: PropTypes.func,
  elapsedSeconds: PropTypes.number,
  estimatedFee: PropTypes.number,
  language: PropTypes.string
};


