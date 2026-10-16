import { useState } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CheckCircle2, CreditCard, Banknote } from 'lucide-react';

export default function VietQrPaymentModal({ isOpen, onClose, logItem, onSuccessPaid }) {
  const [method, setMethod] = useState('vietqr'); // 'vietqr' | 'cash'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !logItem) return null;

  const plate = logItem.plate || '51H - 896.32';
  const fee = logItem.fee || '35.000đ';
  const rawNumFee = parseInt(fee.replace(/[^0-9]/g, ''), 10) || 35000;
  const transCode = `SMARTPARK-${logItem.id || '9921'}-${plate.replace(/[^A-Za-z0-9]/g, '')}`;

  // Chuỗi QR chuẩn thanh toán ngân hàng (VietQR link hoặc payload chuyển khoản)
  const vietQrString = `https://img.vietqr.io/image/970415-103870000000-compact2.png?amount=${rawNumFee}&addInfo=${encodeURIComponent(transCode)}&accountName=${encodeURIComponent('BQL BAI XE SMARTPARK DA NANG')}`;

  const handleConfirmPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (onSuccessPaid) {
        onSuccessPaid({
          ...logItem,
          status: 'Đã thanh toán',
          method: method === 'vietqr' ? 'VietQR / Napas 247' : 'Tiền mặt tại quầy'
        });
      }
      onClose();
    }, 500);
  };

  return (
    <div className="pf-cctv-fullscreen-modal" onClick={onClose}>
      <div className="pf-vietqr-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pf-vietqr-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={18} color="#0284c7" />
            <strong>THU TIỀN CƯỚC & XÁC NHẬN THÔNG QUAN LÀN RA</strong>
          </div>
          <button className="pf-modal-close-x" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="pf-vietqr-body">
          {/* Method tabs */}
          <div className="pf-payment-method-selector">
            <button
              type="button"
              className={`pf-pm-tab ${method === 'vietqr' ? 'active' : ''}`}
              onClick={() => setMethod('vietqr')}
            >
              <CreditCard size={15} /> Quét VietQR / Ngân Hàng
            </button>
            <button
              type="button"
              className={`pf-pm-tab ${method === 'cash' ? 'active' : ''}`}
              onClick={() => setMethod('cash')}
            >
              <Banknote size={15} /> Thu Tiền Mặt Tại Quầy
            </button>
          </div>

          {/* Amount Box */}
          <div className="pf-vietqr-amount-card">
            <div className="pf-vac-left">
              <span>SỐ TIỀN CẦN THANH TOÁN</span>
              <strong className="pf-vac-price">{fee}</strong>
              <small>Biển số: <strong>{plate}</strong> ({logItem.customer || 'Khách vãng lai'})</small>
            </div>
            <div className="pf-vac-right">
              <span className="pf-vac-slot">Vị trí: {logItem.slot || 'B2 · B-08'}</span>
              <span className="pf-vac-time">Thời lượng: {logItem.duration || '1h 32m'}</span>
            </div>
          </div>

          {/* VietQR View */}
          {method === 'vietqr' && (
            <div className="pf-vietqr-qr-container">
              <div className="pf-vietqr-qr-box">
                <QRCodeSVG
                  value={vietQrString}
                  size={180}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="pf-vietqr-hint">
                Khách hàng mở ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank, MoMo...) quét mã để thanh toán tự động.
              </p>
              <div className="pf-trans-code-badge">
                Nội dung chuyển khoản: <strong>{transCode}</strong>
              </div>
            </div>
          )}

          {/* Cash View */}
          {method === 'cash' && (
            <div className="pf-cash-guide-box">
              <Banknote size={36} color="#10b981" />
              <strong>Thu tiền mặt tại bốt trực</strong>
              <p>Nhân viên thu đúng số tiền <strong>{fee}</strong> từ lái xe, sau đó bấm &quot;Xác nhận thu tiền & Mở barrier làn ra&quot;.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pf-vietqr-footer">
          <button type="button" className="pf-btn-cancel-dialog" onClick={onClose}>
            Hủy Bỏ
          </button>
          <button
            type="button"
            className="pf-btn-confirm-paid"
            disabled={isProcessing}
            onClick={handleConfirmPayment}
          >
            <CheckCircle2 size={16} />
            <span>{isProcessing ? 'Đang xử lý...' : 'Xác Nhận Đã Thu Tiền & Mở Barrier Ra'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

VietQrPaymentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  logItem: PropTypes.object,
  onSuccessPaid: PropTypes.func
};
