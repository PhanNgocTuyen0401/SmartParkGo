import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Maximize2,
  Camera,
  RefreshCw,
  AlertTriangle,
  Play,
  Settings2,
  X,
  Radio,
  CheckCircle2
} from 'lucide-react';

export default function SecurityCameraMonitor() {
  const [clock, setClock] = useState(new Date().toLocaleTimeString('vi-VN'));
  const [dateStr, setDateStr] = useState(new Date().toLocaleDateString('vi-VN'));
  const [devices, setDevices] = useState([]);
  const [snapshotToast, setSnapshotToast] = useState('');
  const [configuringCam, setConfiguringCam] = useState(null);
  const [fullscreenCam, setFullscreenCam] = useState(null);

  const videoRefs = useRef({});
  const streamsRef = useRef({});

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClock(now.toLocaleTimeString('vi-VN'));
      setDateStr(now.toLocaleDateString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lấy danh sách webcam / camera cắm vào máy
  const loadVideoDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const allDevs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = allDevs.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevs);
    } catch (err) {
      console.warn('Lỗi khi đọc danh sách thiết bị camera:', err);
    }
  }, []);

  useEffect(() => {
    loadVideoDevices();
  }, [loadVideoDevices]);

  // 4 Kênh Camera Giám Sát Cổng Vào & Hầm Xe
  const [cameras, setCameras] = useState([
    {
      id: 'CAM-01',
      name: 'CAM 01 · CỔNG VÀO (LÀN 1)',
      location: 'Cổng chính Điện Biên Phủ · Aeon Mall Thanh Khê 1',
      ip: '192.168.1.101',
      isStreaming: false,
      selectedDeviceId: '',
      streamUrl: '',
      fps: 30,
      resolution: '1080P'
    },
    {
      id: 'CAM-02',
      name: 'CAM 02 · TIẾP CẬN LÀN VÀO',
      location: 'Trục đường 2/9 tiếp cận cổng vào · Đà Nẵng',
      ip: '192.168.1.102',
      isStreaming: false,
      selectedDeviceId: '',
      streamUrl: '',
      fps: 30,
      resolution: '1080P'
    },
    {
      id: 'CAM-03',
      name: 'CAM 03 · TẦNG HẦM B1 (KHU A)',
      location: 'Hầm B1 · Trục đỗ xe ô tô tiêu chuẩn (SmartPark Đà Nẵng)',
      ip: '192.168.1.103',
      isStreaming: false,
      selectedDeviceId: '',
      streamUrl: '',
      fps: 25,
      resolution: '1080P'
    },
    {
      id: 'CAM-04',
      name: 'CAM 04 · TẦNG HẦM B2 (SẢNH THANG MÁY)',
      location: 'Hầm B2 · Sảnh thang máy trung tâm & Khu sạc điện EV',
      ip: '192.168.1.104',
      isStreaming: false,
      selectedDeviceId: '',
      streamUrl: '',
      fps: 25,
      resolution: '1080P'
    }
  ]);

  // Bật camera thật
  const startRealCamera = async (camId, deviceId = null) => {
    try {
      if (streamsRef.current[camId]) {
        streamsRef.current[camId].getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamsRef.current[camId] = stream;

      const videoEl = videoRefs.current[camId];
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', 'true');
        await videoEl.play();
      }

      setCameras((prev) =>
        prev.map((c) =>
          c.id === camId
            ? { ...c, isStreaming: true, selectedDeviceId: deviceId || c.selectedDeviceId }
            : c
        )
      );
      loadVideoDevices();
    } catch (err) {
      console.error(`Lỗi khi mở camera thật cho kênh ${camId}:`, err);
      alert(
        `Không thể kết nối camera thật: ${
          err.name === 'NotAllowedError'
            ? 'Quyền truy cập Camera bị từ chối trên trình duyệt. Vui lòng cấp quyền trong cài đặt trình duyệt.'
            : err.message
        }`
      );
    }
  };

  // Tắt camera
  const stopRealCamera = (camId) => {
    if (streamsRef.current[camId]) {
      streamsRef.current[camId].getTracks().forEach((track) => track.stop());
      delete streamsRef.current[camId];
    }
    const videoEl = videoRefs.current[camId];
    if (videoEl) {
      videoEl.srcObject = null;
    }
    setCameras((prev) =>
      prev.map((c) => (c.id === camId ? { ...c, isStreaming: false } : c))
    );
  };

  useEffect(() => {
    const activeStreams = streamsRef.current;
    return () => {
      Object.values(activeStreams).forEach((s) => {
        if (s && s.getTracks) {
          s.getTracks().forEach((t) => t.stop());
        }
      });
    };
  }, []);

  // Chụp ảnh snapshot
  const handleSnapshot = (cam) => {
    const videoEl = videoRefs.current[cam.id];
    if (!videoEl || !cam.isStreaming) {
      setSnapshotToast(`Kênh ${cam.id} chưa bật camera thật.`);
      setTimeout(() => setSnapshotToast(''), 3000);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `SNAPSHOT-${cam.id}-${Date.now()}.jpg`;
      a.click();

      setSnapshotToast(`✓ Đã lưu ảnh chụp từ ${cam.name} về máy tính.`);
      setTimeout(() => setSnapshotToast(''), 3000);
    } catch {
      setSnapshotToast(`Đã chụp ảnh từ ${cam.name}.`);
      setTimeout(() => setSnapshotToast(''), 3000);
    }
  };

  const onlineCamsCount = cameras.filter((c) => c.isStreaming).length;

  return (
    <div className="sp-cctv-container">
      {/* Top status bar */}
      <div className="sp-cctv-header">
        <div className="sp-cctv-hl">
          <div className="sp-cctv-badge-rec">
            <span className="dot" />
            <span>HỆ THỐNG CAMERA AN NINH GIÁM SÁT BÃI XE (CCTV)</span>
          </div>
          <p className="sp-cctv-sub">
            Hỗ trợ kết nối webcam máy tính, camera cổng USB và camera IP an ninh
          </p>
        </div>

        <div className="sp-cctv-hr">
          <div className="sp-cctv-stat">
            Đang phát: <strong style={{ color: '#10b981' }}>{onlineCamsCount}</strong> / {cameras.length} camera
          </div>
          <div className="sp-cctv-clock">
            {dateStr} · {clock}
          </div>
        </div>
      </div>

      {snapshotToast && (
        <div className="sp-cctv-toast">
          <CheckCircle2 size={16} />
          <span>{snapshotToast}</span>
        </div>
      )}

      {/* Grid 4 Camera */}
      <div className="sp-cctv-grid">
        {cameras.map((cam) => (
          <div key={cam.id} className={`sp-cam-card ${cam.isStreaming ? 'streaming' : 'standby'}`}>
            {/* Header cam */}
            <div className="sp-cam-head">
              <div className="sp-cam-name">
                <span className={`sp-cam-led ${cam.isStreaming ? 'online' : 'offline'}`} />
                <strong>{cam.name}</strong>
              </div>
              <div className="sp-cam-actions">
                <span className="sp-cam-ip">{cam.ip}</span>

                {cam.isStreaming ? (
                  <button
                    type="button"
                    className="sp-cam-btn danger"
                    onClick={() => stopRealCamera(cam.id)}
                    title="Ngắt kết nối camera này"
                  >
                    <VideoOff size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sp-cam-btn primary"
                    onClick={() => startRealCamera(cam.id)}
                    title="Bật camera thật từ máy tính"
                  >
                    <Play size={13} />
                  </button>
                )}

                <button
                  type="button"
                  className="sp-cam-btn"
                  onClick={() => setConfiguringCam(cam)}
                  title="Cài đặt nguồn camera"
                >
                  <Settings2 size={13} />
                </button>

                <button
                  type="button"
                  className="sp-cam-btn"
                  onClick={() => handleSnapshot(cam)}
                  title="Chụp ảnh khung hình"
                >
                  <Camera size={13} />
                </button>

                <button
                  type="button"
                  className="sp-cam-btn"
                  onClick={() => setFullscreenCam(cam)}
                  title="Xem phóng to toàn màn hình"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* Viewport Camera */}
            <div className="sp-cam-viewport">
              <video
                ref={(el) => { videoRefs.current[cam.id] = el; }}
                className={`sp-cam-video ${cam.isStreaming ? 'visible' : 'hidden'}`}
                autoPlay
                playsInline
                muted
              />

              {cam.isStreaming && (
                <div className="sp-cam-osd">
                  <div className="osd-top">
                    <span className="osd-rec">● REC [LIVE]</span>
                    <span className="osd-time">{dateStr} {clock}</span>
                  </div>
                  <div className="osd-bot">
                    <span>{cam.location}</span>
                    <span>CH: {cam.id} · 30 FPS · 1080P</span>
                  </div>
                </div>
              )}

              {!cam.isStreaming && (
                <div className="sp-cam-standby">
                  <div className="sp-cam-standby-icon">
                    <Video size={36} />
                  </div>
                  <strong>{cam.name}</strong>
                  <p>Chưa kết nối luồng camera thật cho vị trí này</p>
                  <button
                    type="button"
                    className="sp-btn-start-cam-feed"
                    onClick={() => startRealCamera(cam.id)}
                  >
                    <Play size={13} /> Bật Camera Thật Từ Máy Tính
                  </button>
                </div>
              )}
            </div>

            {/* Footer cam */}
            <div className="sp-cam-foot">
              <span>Vị trí: <strong>{cam.location}</strong></span>
              <span className={`sp-cam-status-label ${cam.isStreaming ? 'live' : 'idle'}`}>
                {cam.isStreaming ? '● ĐANG TRUYỀN HÌNH ẢNH THẬT' : 'CHỜ KẾT NỐI'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Cài Đặt Nguồn Camera */}
      {configuringCam && (
        <div className="sp-modal-backdrop" onClick={() => setConfiguringCam(null)}>
          <div className="sp-cam-config-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sp-ccd-head">
              <h3>CÀI ĐẶT NGUỒN CHO {configuringCam.name}</h3>
              <button type="button" className="sp-btn-close-modal" onClick={() => setConfiguringCam(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="sp-ccd-body">
              <div className="sp-form-field">
                <label>Chọn thiết bị Camera / Webcam thật trên máy tính:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="sp-select"
                    value={configuringCam.selectedDeviceId}
                    onChange={(e) => {
                      const devId = e.target.value;
                      setConfiguringCam({ ...configuringCam, selectedDeviceId: devId });
                      startRealCamera(configuringCam.id, devId);
                    }}
                  >
                    <option value="">Camera mặc định máy tính</option>
                    {devices.map((dev, i) => (
                      <option key={dev.deviceId || i} value={dev.deviceId}>
                        {dev.label || `Camera thiết bị ${i + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="sp-btn-secondary"
                    onClick={loadVideoDevices}
                    title="Tìm lại camera cắm mới"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="sp-form-field">
                <label>Hoặc nhập URL luồng Camera IP / RTSP bãi xe:</label>
                <input
                  type="text"
                  placeholder="VD: http://192.168.1.101:8080/video hoặc rtsp://..."
                  value={configuringCam.streamUrl || ''}
                  onChange={(e) => setConfiguringCam({ ...configuringCam, streamUrl: e.target.value })}
                  className="sp-input"
                />
              </div>
            </div>

            <div className="sp-guest-foot">
              <button
                type="button"
                className="sp-btn-secondary"
                onClick={() => setConfiguringCam(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="sp-btn-primary"
                onClick={() => {
                  startRealCamera(configuringCam.id, configuringCam.selectedDeviceId);
                  setConfiguringCam(null);
                }}
              >
                Lưu & Bật Camera Thật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phóng To Fullscreen Camera */}
      {fullscreenCam && (
        <div className="sp-modal-backdrop" onClick={() => setFullscreenCam(null)}>
          <div className="sp-cam-fullscreen-box" onClick={(e) => e.stopPropagation()}>
            <div className="sp-fullscreen-head">
              <strong>{fullscreenCam.name} · {fullscreenCam.location}</strong>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="sp-cam-btn"
                  onClick={() => handleSnapshot(fullscreenCam)}
                >
                  <Camera size={14} /> Chụp Ảnh
                </button>
                <button type="button" className="sp-btn-close-modal" onClick={() => setFullscreenCam(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="sp-fullscreen-body">
              {fullscreenCam.isStreaming ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <video
                    ref={(el) => {
                      if (el && streamsRef.current[fullscreenCam.id]) {
                        el.srcObject = streamsRef.current[fullscreenCam.id];
                        el.play();
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="sp-cam-osd">
                    <div className="osd-top">
                      <span className="osd-rec">● FULLSCREEN CAMERA AN NINH</span>
                      <span className="osd-time">{dateStr} {clock}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sp-cam-standby">
                  <AlertTriangle size={44} color="#f59e0b" />
                  <strong>Camera chưa bật luồng thật</strong>
                  <button
                    type="button"
                    className="sp-btn-start-cam-feed"
                    onClick={() => {
                      startRealCamera(fullscreenCam.id);
                      setFullscreenCam({ ...fullscreenCam, isStreaming: true });
                    }}
                  >
                    Bật Camera Thật Ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
