import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Smartphone,
  RefreshCw,
  VideoOff,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { verifyQrCode, verifyQrCodeAsync } from '../../services/qrBookingService';

export default function PhoneCameraScanner({ onVerified, onManualPulseGate }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = cam sau, 'user' = cam trước
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');

  // 1. Quét danh sách thiết bị camera kết nối (Dây cắm iPhone, Webcam USB...)
  const fetchDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setDeviceList(videoDevices);
    } catch (err) {
      console.warn('Không thể liệt kê thiết bị camera:', err);
    }
  }, []);

  // 2. Bắt đầu phát luồng từ Camera
  const startCamera = async (deviceIdToUse = selectedDeviceId, mode = facingMode) => {
    setErrorMsg('');
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse } }
          : {
              facingMode: mode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
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
      console.error('Lỗi khi mở camera:', err);
      setErrorMsg(
        'Không thể mở camera thiết bị: ' +
        (err.name === 'NotAllowedError'
          ? 'Quyền truy cập camera bị từ chối trên trình duyệt.'
          : err.message)
      );
      setIsStreaming(false);
    }
  };

  // 3. Tắt camera
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

  // 4. Đổi camera trước / sau
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isStreaming) {
      startCamera(null, nextMode);
    }
  };

  // ── Âm thanh phản hồi QR ────────────────────────────────────────────
  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
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

  // 5. Vòng lặp giải mã QR Code trực tiếp từ khung hình video (Realtime Frame Decoding bằng jsQR)
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

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          const raw = code.data.trim();
          if (raw !== lastScannedCodeRef.current) {
            lastScannedCodeRef.current = raw;
            verifyQrCodeAsync(raw).then((verification) => {
              if (verification?.success && verification?.data?.status === 'ACTIVE' && verification?.data?.canOpenBarrier) {
                playSuccessSound();
              } else {
                playErrorSound();
              }
              setScanResult(verification);
              if (onVerified) onVerified(verification);
            });
            // Khóa mã này chống quét liên hồi
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

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Xác thực thủ công khi nhân viên gõ mã
  const handleManualCheck = async (e) => {
    e?.preventDefault();
    if (!manualCode.trim()) return;
    const verification = await verifyQrCodeAsync(manualCode);
    setScanResult(verification);
    if (onVerified) {
      onVerified(verification);
    }
  };

  return (
    <div className="pf-phone-cam-scanner-root">
      <div className="pf-panel-header">
        <div className="pf-panel-title">
          <Smartphone size={16} color="#0284c7" />
          <span>QUÉT QR THỰC TẾ QUA CAMERA ĐIỆN THOẠI (DÂY CÁP / WEBRTC)</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {!isStreaming ? (
            <button className="pf-btn-cam-connect" onClick={() => startCamera()}>
              <Smartphone size={14} /> Mở Camera iPhone/Webcam
            </button>
          ) : (
            <>
              <button className="pf-btn-cam-connect flip" onClick={toggleFacingMode} title="Đổi camera trước / sau">
                <RefreshCw size={13} /> Đổi Cam
              </button>
              <button className="pf-btn-cam-disconnect" onClick={stopCamera}>
                <VideoOff size={13} /> Tắt Cam
              </button>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="pf-cam-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bộ chọn nguồn camera kết nối (Dây cắm iPhone, OBS Virtual Cam, Webcam USB) */}
      {deviceList.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <small style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Nguồn camera:</small>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              if (isStreaming) startCamera(e.target.value);
            }}
            style={{
              flex: 1,
              padding: '0.35rem 0.65rem',
              borderRadius: '0.45rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'inherit',
              fontSize: '0.75rem'
            }}
          >
            {deviceList.map((dev, idx) => (
              <option key={dev.deviceId || idx} value={dev.deviceId}>
                {dev.label || `Camera thiết bị ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Màn hình hiển thị hình ảnh camera điện thoại và khung quét laser QR */}
      <div className="pf-real-camera-screen-box">
        <video ref={videoRef} className={`pf-real-video-feed ${isStreaming ? 'show' : 'hide'}`} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!isStreaming && (
          <div className="pf-cctv-offline-slate">
            <Smartphone size={40} color="#64748b" />
            <strong>Camera điện thoại chưa kết nối</strong>
            <small>
              Bấm nút "Mở Camera iPhone/Webcam" để truyền trực tiếp hình ảnh từ camera điện thoại
              (hỗ trợ kết nối qua cáp USB/Dây cắm vào máy tính).
            </small>
          </div>
        )}

        {isStreaming && (
          <>
            <div className="pf-cctv-hud-tag">
              QR SCANNER: Đang đọc khung hình trực tiếp 60 FPS
            </div>
            {/* Khung ngắm quét mã QR */}
            <div className="pf-qr-crosshair-box">
              <div className="pf-qr-crosshair-line"></div>
              <span className="pf-target-bracket tl"></span>
              <span className="pf-target-bracket tr"></span>
              <span className="pf-target-bracket bl"></span>
              <span className="pf-target-bracket br"></span>
              <div className="pf-qr-prompt-badge">Đưa mã QR trên màn hình điện thoại vào đây</div>
            </div>
          </>
        )}
      </div>

      {/* Form kiểm tra thủ công mã QR hoặc biển số */}
      <form onSubmit={handleManualCheck} className="pf-qr-fast-scan-form" style={{ marginTop: '0.75rem' }}>
        <div className="pf-qr-input-group">
          <input
            type="text"
            placeholder="Hoặc gõ mã vé QR / biển số (VD: PF-PASS-9842-51H89632, 51H-896.32)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button type="submit" className="pf-btn-submit-scan">
            Kiểm tra vé
          </button>
        </div>
        <div className="pf-sample-qr-chips">
          <small>Mẫu vé đặt trước kiểm thử:</small>
          <button type="button" onClick={() => { setManualCode('PF-PASS-9842-51H89632'); }}>
            51H-896.32 (Còn hạn)
          </button>
          <button type="button" onClick={() => { setManualCode('PF-PASS-4412-59A34567'); }}>
            59A-345.67 (Hết hạn)
          </button>
          <button type="button" onClick={() => { setManualCode('PF-PASS-3301-60B88991'); }}>
            60B-889.91 (VF8 Hợp lệ)
          </button>
        </div>
      </form>

      {/* KẾT QUẢ KIỂM TRA MÃ QR (ĐÃ ĐẶT CHỖ, CÒN HẠN HAY HẾT HẠN) */}
      {scanResult && scanResult.data && (
        <div className={`pf-qr-verified-card ${scanResult.data.status === 'EXPIRED' ? 'expired' : 'valid'}`}>
          <div className="pf-qr-verified-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              {scanResult.data.status === 'ACTIVE' ? (
                <CheckCircle2 size={18} color="#10b981" />
              ) : (
                <XCircle size={18} color="#ef4444" />
              )}
              <strong style={{ fontSize: '0.95rem' }}>
                {scanResult.data.status === 'ACTIVE' ? 'VÉ HỢP LỆ · ĐƯỢC PHÉP VÀO BÃI' : 'VÉ ĐÃ HẾT HẠN SỬ DỤNG'}
              </strong>
            </div>
            <span className={`pf-badge-status ${scanResult.data.status === 'ACTIVE' ? 'active' : 'expired'}`}>
              {scanResult.data.status === 'ACTIVE' ? '✦ CÒN HẠN' : '✕ HẾT HẠN'}
            </span>
          </div>

          <div className="pf-qr-data-grid">
            <div>
              <span>Biển số xe:</span>
              <strong style={{ color: '#0284c7', fontFamily: 'monospace', fontSize: '1rem' }}>
                {scanResult.data.plate}
              </strong>
            </div>
            <div>
              <span>Dòng xe:</span>
              <strong>{scanResult.data.model}</strong>
            </div>
            <div>
              <span>Khách hàng:</span>
              <strong>{scanResult.data.customer}</strong>
            </div>
            <div>
              <span>Số điện thoại:</span>
              <strong>{scanResult.data.phone}</strong>
            </div>
            <div>
              <span>Vị trí ô đỗ đã đặt:</span>
              <strong style={{ color: '#10b981' }}>{scanResult.data.slot}</strong>
            </div>
            <div>
              <span>Khung giờ đặt trước:</span>
              <strong>{scanResult.data.bookingTime}</strong>
            </div>
            <div>
              <span>Trạng thái cước phí:</span>
              <strong style={{ color: scanResult.data.depositPaid ? '#10b981' : '#f59e0b' }}>
                {scanResult.data.paymentStatus}
              </strong>
            </div>
            <div>
              <span>Mã QR Pass:</span>
              <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                {scanResult.data.code}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
            <button
              type="button"
              className="pf-btn-gate-action in"
              onClick={() => onManualPulseGate && onManualPulseGate('IN')}
              disabled={scanResult.data.status === 'EXPIRED'}
              style={{ flex: 1 }}
            >
              Mở Barrier Cổng Vào (4 Giây)
            </button>
            <button
              type="button"
              className="pf-btn-gate-action out"
              onClick={() => onManualPulseGate && onManualPulseGate('OUT')}
              style={{ flex: 1 }}
            >
              Mở Barrier Cổng Ra Cho Đi
            </button>
          </div>
        </div>
      )}

      {/* CẢNH BÁO TỪ CHỐI NẾU QUÉT MÃ QR ĐÃ DÙNG HOẶC NGOÀI HỆ THỐNG */}
      {scanResult && !scanResult.success && (
        <div style={{
          marginTop: '1rem',
          padding: '1.2rem',
          background: scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `2px solid ${scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? '#ea580c' : '#ef4444'}`,
          borderRadius: '8px',
          color: scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? '#ea580c' : '#ef4444'
        }}>
          <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
            {scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED'
              ? '🚫 TỪ CHỐI THÔNG QUAN · MÃ VÉ ĐÃ SỬ DỤNG'
              : '🚨 TỪ CHỐI MÃ QR NGOÀI HỆ THỐNG'}
          </strong>
          <p style={{ margin: 0, fontSize: '0.85rem', color: scanResult.alreadyUsed || scanResult.data?.status === 'ALREADY_USED' ? '#c2410c' : '#f87171', fontWeight: '700' }}>
            {scanResult.error}
          </p>
        </div>
      )}
    </div>
  );
}
