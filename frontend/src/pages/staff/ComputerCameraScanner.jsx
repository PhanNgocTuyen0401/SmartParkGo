import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import jsQR from 'jsqr';
import {
  Camera,
  VideoOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
  Sparkles
} from 'lucide-react';
import { verifyQrCode, verifyQrCodeAsync, getStoredPasses } from '../../services/qrBookingService';

export default function ComputerCameraScanner({ onVerified, onManualPulseGate }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [recentPasses] = useState(() => getStoredPasses().slice(0, 4));

  // 1. Lấy danh sách webcam máy tính
  const fetchDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setDeviceList(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Không thể đọc danh sách webcam máy tính:', err);
    }
  }, [selectedDeviceId]);

  // 2. Mở Camera máy tính
  const startCamera = async (deviceIdToUse = selectedDeviceId) => {
    setErrorMsg('');
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setIsStreaming(true);
      fetchDevices();
    } catch (err) {
      console.error('Lỗi khi mở webcam máy tính:', err);
      setErrorMsg(
        'Không thể mở webcam máy tính: ' +
        (err.name === 'NotAllowedError'
          ? 'Quyền truy cập Camera bị từ chối trên trình duyệt. Vui lòng cấp quyền cho phép.'
          : err.message)
      );
      setIsStreaming(false);
    }
  };

  // 3. Tắt Camera
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // ── Âm thanh phản hồi QR ────────────────────────────────────────────
  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      // Âm "ting" cao, sáng, dễ chịu: 2 nốt đi lên
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.22, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.18);
      });
    } catch {}
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      // Âm buzz thấp, 2 lần: cảnh báo rõ ràng
      [220, 180].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.18);
        gain.gain.setValueAtTime(0.2, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.15);
      });
    } catch {}
  };

  // 4. Vòng lặp giải mã QR qua jsQR
  const lastScannedCodeRef = useRef('');

  useEffect(() => {
    if (!isStreaming) return;

    let active = true;

    const tick = () => {
      if (!active) return;

      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
        canvasRef.current
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const maxDim = 640;
        let scale = 1;
        if (video.videoWidth > maxDim || video.videoHeight > maxDim) {
          scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight);
        }
        const w = Math.floor(video.videoWidth * scale);
        const h = Math.floor(video.videoHeight * scale);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imageData.data, w, h, {
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          const raw = code.data.trim();
          if (raw && raw !== lastScannedCodeRef.current) {
            lastScannedCodeRef.current = raw;

            verifyQrCodeAsync(raw).then((verification) => {
              // Phát âm thanh tương ứng với kết quả xác thực
              if (verification?.success && verification?.data?.status === 'ACTIVE' && verification?.data?.canOpenBarrier) {
                playSuccessSound();
              } else {
                playErrorSound();
              }
              setScanResult(verification);
              try {
                if (onVerified) onVerified(verification);
              } catch (onVerifiedErr) {
                console.error('Lỗi onVerified:', onVerifiedErr);
              }
            });

            // Khóa mã này chống quét liên hồi khi khách vẫn để màn hình trước ống kính
            setTimeout(() => {
              if (lastScannedCodeRef.current === raw) {
                lastScannedCodeRef.current = '';
              }
            }, 6000);
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(tick);
    };

    animationFrameId.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isStreaming, onVerified]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleManualCheck = async (e) => {
    e?.preventDefault();
    if (!manualCode.trim()) return;
    const verification = await verifyQrCodeAsync(manualCode);
    if (verification?.success && verification?.data?.status === 'ACTIVE' && verification?.data?.canOpenBarrier) {
      playSuccessSound();
    } else {
      playErrorSound();
    }
    setScanResult(verification);
    try {
      if (onVerified) {
        onVerified(verification);
      }
    } catch (err) {
      console.error('Lỗi onVerified manual:', err);
    }
  };

  return (
    <div className="sp-qr-scanner-box">
      {/* Viewport Webcam */}
      <div className="sp-webcam-wrap">
        <video ref={videoRef} className={`sp-webcam-feed ${isStreaming ? 'active' : 'hidden'}`} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!isStreaming ? (
          <div className="sp-webcam-idle">
            <div className="sp-webcam-idle-icon">
              <Camera size={38} />
            </div>
            <h4>Camera Chưa Bật</h4>
            <p>Bấm nút bên dưới để bật webcam máy tính quét vé QR trên màn hình điện thoại của khách</p>
            <button
              type="button"
              className="sp-btn-cam-toggle on"
              onClick={() => startCamera()}
            >
              <Camera size={15} /> Bật Webcam Quét QR
            </button>
          </div>
        ) : (
          <div className="sp-webcam-hud">
            <div className="sp-laser-target">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <div className="laser-beam" />
            </div>
            <div className="sp-hud-tip">
              Đưa mã QR trên vé hoặc điện thoại vào khung quét
            </div>
            <button
              type="button"
              className="sp-btn-cam-toggle off"
              onClick={stopCamera}
            >
              <VideoOff size={13} /> Tắt Cam
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="sp-scan-alert error">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Chọn webcam nếu có nhiều camera */}
      {deviceList.length > 1 && (
        <div className="sp-device-select-box">
          <label>Nguồn camera:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              if (isStreaming) startCamera(e.target.value);
            }}
          >
            {deviceList.map((dev, idx) => (
              <option key={dev.deviceId || idx} value={dev.deviceId}>
                {dev.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form tra cứu thủ công */}
      <form onSubmit={handleManualCheck} className="sp-manual-box">
        <div className="sp-manual-input-wrap">
          <Search size={15} color="#64748b" />
          <input
            type="text"
            placeholder="Hoặc nhập mã vé QR / biển số xe để kiểm tra..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button type="submit" className="sp-btn-manual-check">
            Kiểm Tra
          </button>
        </div>

        {/* Vé gần đây (nếu có) */}
        {recentPasses && recentPasses.length > 0 && (
          <div className="sp-quick-chips">
            <span>Vé gần đây:</span>
            {recentPasses.map((p) => (
              <button
                key={p.code}
                type="button"
                className="sp-chip-item"
                onClick={async () => {
                  setManualCode(p.code);
                  const verification = await verifyQrCodeAsync(p.code);
                  setScanResult(verification);
                  try {
                    if (onVerified) onVerified(verification);
                  } catch (err) {
                    console.error('Lỗi onVerified chip:', err);
                  }
                }}
              >
                {p.plate} ({p.status === 'ACTIVE' ? 'Còn hạn' : 'Hết hạn'})
              </button>
            ))}
          </div>
        )}
      </form>

      {/* KẾT QUẢ XÁC THỰC VÉ QR (CHỈ HIỂN THỊ KHI XÁC THỰC THÀNH CÔNG) */}
      {scanResult && scanResult.success && scanResult.data && (
        <div className={`sp-verify-card ${scanResult.data.status === 'EXPIRED' ? 'expired' : 'valid'}`}>
          <div className="sp-vc-head">
            <div className="sp-vc-status-line">
              {scanResult.data.isEarlyArrival ? (
                <Zap size={18} color="#d97706" />
              ) : scanResult.data.status === 'ACTIVE' ? (
                <CheckCircle2 size={18} color="#10b981" />
              ) : (
                <XCircle size={18} color="#ef4444" />
              )}
              <strong>
                {scanResult.data.isEarlyArrival
                  ? `⚡ KHÁCH ĐẾN SỚM (${scanResult.data.earlyMinutes || 0} PHÚT) · CHUYỂN VÉ VÃNG LAI · CHO PHÉP VÀO`
                  : scanResult.data.status === 'ACTIVE'
                  ? 'VÉ ĐẶT CHỖ HỢP LỆ · ĐƯỢC PHÉP THÔNG QUAN'
                  : 'VÉ ĐÃ QUÁ HẠN SỬ DỤNG HOẶC KHÔNG TỒN TẠI'}
              </strong>
            </div>
            <span
              className={`sp-vc-badge ${scanResult.data.isEarlyArrival ? 'warning' : scanResult.data.status === 'ACTIVE' ? 'active' : 'expired'}`}
              style={scanResult.data.isEarlyArrival ? { background: '#fef3c7', color: '#b45309', border: '1px solid #f59e0b' } : {}}
            >
              {scanResult.data.isEarlyArrival ? `ĐẾN SỚM ${scanResult.data.earlyMinutes || 0}P` : scanResult.data.status === 'ACTIVE' ? 'CÒN HẠN' : 'HẾT HẠN'}
            </span>
          </div>

          <div className="sp-vc-grid">
            <div className="sp-vc-cell">
              <small>BIỂN SỐ XE</small>
              <strong className="sp-vc-plate">{scanResult.data.plate || '---'}</strong>
            </div>
            <div className="sp-vc-cell">
              <small>CHỦ PHƯƠNG TIỆN</small>
              <strong>{typeof scanResult.data.customer === 'string' ? scanResult.data.customer : (scanResult.data.customer?.name || 'Khách hàng')}</strong>
            </div>
            <div className="sp-vc-cell">
              <small>DÒNG XE</small>
              <strong>{scanResult.data.model || 'Ô tô tiêu chuẩn'}</strong>
            </div>
            <div className="sp-vc-cell">
              <small>VỊ TRÍ ĐỖ CHỈ ĐỊNH</small>
              <strong style={{ color: '#0369a1' }}>{scanResult.data.slot || '---'}</strong>
            </div>
            <div className="sp-vc-cell">
              <small>KHUNG GIỜ ĐĂNG KÝ</small>
              <strong>{scanResult.data.bookingTime || '---'}</strong>
            </div>
            <div className="sp-vc-cell">
              <small>THANH TOÁN</small>
              <strong style={{ color: scanResult.data.depositPaid ? '#10b981' : '#f59e0b' }}>
                {scanResult.data.paymentStatus || 'Chưa thanh toán'}
              </strong>
            </div>
          </div>

          {/* CHỈ CÓ NÚT MỞ BARRIER VÀO (BỎ HOÀN TOÀN BARRIER RA) */}
          <div className="sp-vc-action">
            <button
              type="button"
              className="sp-btn-open-barrier-main"
              disabled={scanResult.data.status === 'EXPIRED'}
              onClick={() => onManualPulseGate && onManualPulseGate('IN')}
            >
              <span>Mở Barrier Làn Vào Cho Xe Qua (4 Giây)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CẢNH BÁO TỪ CHỐI NẾU QUÉT MÃ QR ĐÃ DÙNG HOẶC NGOÀI HỆ THỐNG */}
      {scanResult && !scanResult.success && (
        <div style={{
          marginTop: '1rem',
          padding: '1.25rem',
          background: scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(239, 68, 68, 0.1)',
          border: `2px solid ${scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? '#ea580c' : '#ef4444'}`,
          borderRadius: '8px',
          color: scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? '#ea580c' : '#ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
            <XCircle size={22} color={scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? '#ea580c' : '#ef4444'} />
            <strong style={{ fontSize: '1rem' }}>
              {scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED'
                ? '🚫 TỪ CHỐI THÔNG QUAN · MÃ VÉ ĐÃ SỬ DỤNG TRƯỚC ĐÓ'
                : 'TỪ CHỐI THÔNG QUAN · MÃ QR NGOÀI HỆ THỐNG'}
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? '#c2410c' : '#b91c1c', fontWeight: '700' }}>
            {typeof scanResult.error === 'string' ? scanResult.error : (scanResult.error?.message || 'Mã vé không hợp lệ hoặc đã qua sử dụng.')}
          </p>
          <small style={{ display: 'block', marginTop: '0.45rem', color: '#64748b' }}>
            {scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED'
              ? 'Hệ thống SmartPark bảo mật chỉ cho phép mỗi mã QR quét vào bãi duy nhất 1 lần. Hành vi quét lặp lại đã bị chặn và ghi nhật ký an ninh.'
              : 'Hệ thống SmartPark bảo mật chỉ cho phép quét vé QR chính thức. Mã bên thứ ba hoặc đường link lạ sẽ bị vô hiệu hóa để bảo đảm an ninh bãi xe.'}
          </small>
        </div>
      )}
    </div>
  );
}

ComputerCameraScanner.propTypes = {
  onVerified: PropTypes.func,
  onManualPulseGate: PropTypes.func
};
