import { useRef } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Printer,
  CheckCircle2,
  MapPin,
  CarFront,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function QrPassModal({
  isOpen,
  onClose,
  passData,
  vehicle,
  slot,
  branch,
  language = 'vi'
}) {
  const ticketRef = useRef(null);
  if (!isOpen) return null;

  // Extract pass details
  const bookingCode = passData?.code || passData?.booking_code || `SP-${Date.now().toString().slice(-6)}`;
  const displayPlate = passData?.plate || (typeof vehicle === 'string' ? vehicle.split('(')[0].trim() : 'Phương tiện');
  const displayModel = passData?.model || (typeof vehicle === 'string' && vehicle.includes('(') ? vehicle.match(/\(([^)]+)\)/)?.[1] : 'Tiêu chuẩn');
  const displaySlot = passData?.slot || slot || 'Chờ xếp ô';
  const displayBranch = passData?.branch || branch || 'SmartPark Đà Nẵng';
  const displayTime = passData?.bookingTime || new Date().toLocaleDateString('vi-VN');
  const displayFee = passData?.fee || '0đ';
  const displayCustomer = passData?.customer || 'Khách hàng SmartPark';
  const validityText = passData?.validityDisplay || 'Vé đặt chỗ trực tuyến';
  const packageType = passData?.packageType || 'Vé đỗ xe thông minh';

  const handlePrintOrDownload = () => {
    window.print();
  };

  return (
    <div className="pf-ticket-modal-backdrop" onClick={onClose}>
      <div
        className="pf-ticket-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Actions */}
        <div className="pf-ticket-modal-bar">
          <div className="pf-ticket-title-tag">
            <ShieldCheck size={16} color="#10b981" />
            <span>{language === 'vi' ? 'VÉ ĐIỆN TỬ VÀO BÃI ĐỖ XE CHÍNH THỨC' : 'OFFICIAL DIGITAL PARKING PASS'}</span>
          </div>
          <button className="pf-ticket-close-icon" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Realistic Cinema-style Ticket Voucher */}
        <div className="pf-cinema-ticket-card" ref={ticketRef}>
          {/* Top Brand Banner */}
          <div className="pf-ticket-header">
            <div className="pf-ticket-brand">
              <div className="pf-ticket-logo-icon">
                <CarFront size={22} color="#ffffff" />
              </div>
              <div>
                <h2 className="pf-ticket-brand-name">PARKFLOW PASS</h2>
                <p className="pf-ticket-brand-sub">HỆ THỐNG VÉ ĐỖ XE THÔNG MINH</p>
              </div>
            </div>
            <div className="pf-ticket-badge-confirmed">
              <CheckCircle2 size={14} />
              <span>{language === 'vi' ? 'ĐÃ XÁC THỰC' : 'CONFIRMED'}</span>
            </div>
          </div>

          {/* Ticket Body Content */}
          <div className="pf-ticket-body">
            <div className="pf-ticket-location-block">
              <MapPin size={16} color="#0284c7" />
              <div>
                <strong className="pf-ticket-branch-text">{displayBranch}</strong>
                <p className="pf-ticket-branch-sub">Trạm kiểm soát phương tiện tự động 24/7</p>
              </div>
            </div>

            {/* License plate highlight box */}
            <div className="pf-ticket-plate-wrapper">
              <div className="pf-ticket-plate-box">
                <span className="pf-plate-vn-dot"></span>
                <span className="pf-plate-vn-text">{displayPlate}</span>
              </div>
              <div className="pf-ticket-model-text">{displayModel}</div>
            </div>

            {/* 2-Column Info Grid */}
            <div className="pf-ticket-grid">
              <div className="pf-ticket-grid-item">
                <span className="pf-tg-label">VỊ TRÍ Ô ĐỖ ĐÃ CHỌN</span>
                <strong className="pf-tg-value text-emerald">{displaySlot}</strong>
              </div>
              <div className="pf-ticket-grid-item">
                <span className="pf-tg-label">MÃ ĐẶT CHỖ (BOOKING CODE)</span>
                <strong className="pf-tg-value font-mono">{bookingCode}</strong>
              </div>
              <div className="pf-ticket-grid-item">
                <span className="pf-tg-label">THỜI GIAN VÀO BÃI</span>
                <strong className="pf-tg-value">{displayTime}</strong>
              </div>
              <div className="pf-ticket-grid-item">
                <span className="pf-tg-label">CƯỚC PHÍ ĐÃ THANH TOÁN</span>
                <strong className="pf-tg-value text-emerald">{displayFee} ({displayCustomer})</strong>
              </div>
            </div>

            {/* Cut Line / Notch Divider (Cinema style) */}
            <div className="pf-ticket-perforation">
              <div className="pf-notch left"></div>
              <div className="pf-dashed-line"></div>
              <div className="pf-notch right"></div>
            </div>

            {/* QR Code Section (Mã QR thật có thể quét trực tiếp bằng camera máy tính) */}
            <div className="pf-ticket-qr-section">
              <div className="pf-real-qrcode-wrapper">
                <QRCodeSVG
                  value={bookingCode}
                  size={190}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
              <p className="pf-ticket-qr-instruction">
                Đưa mã QR này trước camera bốt trực hoặc camera máy tính của nhân viên để hệ thống tự động mở barrier.
              </p>

              {/* Barcode Mock for aesthetic */}
              <div className="pf-ticket-barcode-graphic">
                <div className="pf-barcode-bars"></div>
                <span className="pf-barcode-label">{bookingCode}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="pf-ticket-notice">
              <AlertCircle size={14} color="#0284c7" />
              <span>
                {validityText}. Gói: <strong>{packageType}</strong>. Quý khách vui lòng đỗ đúng ô <strong>{displaySlot}</strong> đã chỉ định.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Buttons */}
        <div className="pf-ticket-actions-bar">
          <button type="button" className="pf-btn-ticket-secondary" onClick={onClose}>
            {language === 'vi' ? 'Đóng lại' : 'Close'}
          </button>
          <button
            type="button"
            className="pf-btn-ticket-primary"
            onClick={handlePrintOrDownload}
          >
            <Printer size={16} />
            <span>{language === 'vi' ? 'In / Lưu vé điện tử' : 'Print / Save Pass'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

QrPassModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  passData: PropTypes.object,
  vehicle: PropTypes.string,
  slot: PropTypes.string,
  branch: PropTypes.string,
  language: PropTypes.string
};
