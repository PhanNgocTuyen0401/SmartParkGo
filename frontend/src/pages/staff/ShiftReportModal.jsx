import { useRef } from 'react';
import PropTypes from 'prop-types';
import { FileSpreadsheet, Printer, X, LogOut } from 'lucide-react';

// CSS in chuẩn cho biên bản bàn giao ca
const SHIFT_PRINT_STYLE = `
@media print {
  @page {
    size: A4 portrait;
    margin: 12mm 14mm;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }
  body * { visibility: hidden !important; }

  .sp-shift-printzone,
  .sp-shift-printzone * {
    visibility: visible !important;
  }
  .sp-shift-printzone {
    position: fixed !important;
    inset: 0 !important;
    width: 100% !important;
    background: #ffffff !important;
    padding: 0 !important;
  }
  /* Ẩn các nút khi in */
  .sp-guest-foot,
  .sp-btn-close-modal {
    display: none !important;
  }
}
`;

export default function ShiftReportModal({ staffName, station, logs, parkedCount, onClose, onLogout }) {
  const printRef = useRef(null);

  // Tính toán tổng thu tiền mặt, chuyển khoản và tổng xe
  const totalEntries = logs.length;
  const cashLogs = logs.filter((l) => l.method?.includes('Tiền mặt'));
  const onlineLogs = logs.filter((l) => !l.method?.includes('Tiền mặt'));

  const sumCash = cashLogs.reduce((acc, cur) => {
    const num = parseInt(String(cur.fee || '0').replace(/\D/g, ''), 10) || 0;
    return acc + num;
  }, 0);

  const sumOnline = onlineLogs.reduce((acc, cur) => {
    const num = parseInt(String(cur.fee || '0').replace(/\D/g, ''), 10) || 0;
    return acc + num;
  }, 0);

  const totalRevenue = sumCash + sumOnline;

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAndLogout = () => {
    window.print();
    // Sau khi hộp thoại in đóng, thực hiện đăng xuất
    setTimeout(() => {
      if (onLogout) onLogout();
    }, 500);
  };


  const now = new Date();
  const printTime = now.toLocaleTimeString('vi-VN');
  const printDate = now.toLocaleDateString('vi-VN');

  return (
    <>
      <style>{SHIFT_PRINT_STYLE}</style>

      <div className="sp-modal-backdrop" onClick={onClose}>
        <div
          className="sp-guest-modal"
          style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header modal */}
          <div className="sp-guest-head">
            <div className="sp-gh-title">
              <div className="sp-gh-icon" style={{ background: '#0284c7', color: '#fff' }}>
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h3>BIÊN BẢN BÀN GIAO CA TRỰC &amp; THỐNG KÊ DOANH THU</h3>
                <p>{station} · SmartPark Đà Nẵng</p>
              </div>
            </div>
            <button type="button" className="sp-btn-close-modal" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          {/* Nội dung biên bản - có class cho @media print */}
          <div className="sp-guest-form-body" style={{ padding: '1.25rem' }}>
            <div
              ref={printRef}
              className="sp-shift-printzone sp-handover-sheet"
              style={{
                background: '#ffffff',
                padding: '1.25rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                color: '#0f172a'
              }}
            >
              {/* Tiêu đề biên bản */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM - Độc lập - Tự do - Hạnh phúc
                </div>
                <strong style={{ fontSize: '1.05rem', textTransform: 'uppercase', color: '#0284c7', display: 'block' }}>
                  HỆ THỐNG QUẢN LÝ BÃI XE THÔNG MINH SMARTPARK ĐÀ NẴNG
                </strong>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0.25rem 0' }}>
                  BIÊN BẢN KẾT TOÁN &amp; BÀN GIAO CA TRỰC BỐT CỔNG VÀO
                </div>
                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  Thời điểm xuất: {printTime} &nbsp;·&nbsp; {printDate}
                </small>
              </div>

              {/* Thông tin ca trực - lưới 2 cột */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.6rem',
                margin: '0.85rem 0',
                fontSize: '0.8rem',
                background: '#f8fafc',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <span style={{ color: '#64748b' }}>Nhân viên bàn giao: </span>
                  <strong>{staffName}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Trạm trực: </span>
                  <strong>{station}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Khung giờ ca: </span>
                  <strong>Ca Sáng (06:00 – 14:00)</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Tình trạng bãi: </span>
                  <strong style={{ color: '#0284c7' }}>{parkedCount} xe đang lưu bãi</strong>
                </div>
              </div>

              {/* Bảng tổng kết số liệu */}
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8rem',
                margin: '0.75rem 0',
                border: '1px solid #cbd5e1'
              }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #94a3b8' }}>
                    <th style={{ padding: '0.55rem 0.65rem', textAlign: 'left', borderRight: '1px solid #cbd5e1' }}>Chỉ số ca trực</th>
                    <th style={{ padding: '0.55rem 0.65rem', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>Số lượng</th>
                    <th style={{ padding: '0.55rem 0.65rem', textAlign: 'right' }}>Doanh số tạm tính</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.55rem 0.65rem', borderRight: '1px solid #e2e8f0' }}>Tổng lượt xe qua cổng ca trực</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>{totalEntries} lượt</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'right', color: '#94a3b8' }}>–</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.55rem 0.65rem', borderRight: '1px solid #e2e8f0' }}>Thu tiền mặt trực tiếp tại bốt</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{cashLogs.length} giao dịch</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'right', fontWeight: 700 }}>
                      {sumCash.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.55rem 0.65rem', borderRight: '1px solid #e2e8f0' }}>Thu ví điện tử &amp; VietQR tự động</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>{onlineLogs.length} giao dịch</td>
                    <td style={{ padding: '0.55rem 0.65rem', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                      {sumOnline.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr style={{ background: '#f8fafc', borderTop: '1.5px solid #94a3b8' }}>
                    <td style={{ padding: '0.7rem 0.65rem', fontWeight: 800, borderRight: '1px solid #cbd5e1' }}>TỔNG CỘNG DOANH THU CA:</td>
                    <td style={{ padding: '0.7rem 0.65rem', textAlign: 'center', fontWeight: 800, borderRight: '1px solid #cbd5e1' }}>{logs.length} lượt</td>
                    <td style={{ padding: '0.7rem 0.65rem', textAlign: 'right', fontSize: '0.98rem', fontWeight: 900, color: '#059669' }}>
                      {totalRevenue.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Danh sách log chi tiết (tối đa 10 dòng) */}
              {logs.length > 0 && (
                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    NHẬT KÝ LƯỢT XE CA TRỰC (Hiển thị {Math.min(logs.length, 10)}/{logs.length} lượt):
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', border: '1px solid #e2e8f0' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>Mã phiên</th>
                        <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>Biển số</th>
                        <th style={{ padding: '0.35rem 0.5rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>Vào</th>
                        <th style={{ padding: '0.35rem 0.5rem', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>Ra</th>
                        <th style={{ padding: '0.35rem 0.5rem', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>Phương thức</th>
                        <th style={{ padding: '0.35rem 0.5rem', textAlign: 'right' }}>Phí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 10).map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'monospace', borderRight: '1px solid #f1f5f9' }}>{log.id}</td>
                          <td style={{ padding: '0.3rem 0.5rem', fontWeight: 700, borderRight: '1px solid #f1f5f9' }}>{log.plate}</td>
                          <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>{log.timeIn}</td>
                          <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>{log.timeOut}</td>
                          <td style={{ padding: '0.3rem 0.5rem', color: '#64748b', borderRight: '1px solid #f1f5f9' }}>{log.method}</td>
                          <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{log.fee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {logs.length > 10 && (
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.3rem' }}>
                      ... và {logs.length - 10} lượt xe khác (xem chi tiết trong hệ thống)
                    </div>
                  )}
                </div>
              )}

              {/* Chữ ký xác nhận */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1.5rem',
                fontSize: '0.78rem',
                textAlign: 'center',
                borderTop: '1px dashed #cbd5e1',
                paddingTop: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <strong>Người giao ca</strong>
                  <p style={{ color: '#64748b', margin: '0.2rem 0 2rem', fontSize: '0.72rem' }}>(Ký &amp; ghi rõ họ tên)</p>
                  <strong>{staffName}</strong>
                </div>
                <div style={{ flex: 1 }}>
                  <strong>Người nhận ca tiếp theo</strong>
                  <p style={{ color: '#64748b', margin: '0.2rem 0 2rem', fontSize: '0.72rem' }}>(Ký &amp; ghi rõ họ tên)</p>
                  <span style={{ color: '#94a3b8' }}>..........................................</span>
                </div>
                <div style={{ flex: 1 }}>
                  <strong>Quản lý ca xác nhận</strong>
                  <p style={{ color: '#64748b', margin: '0.2rem 0 2rem', fontSize: '0.72rem' }}>(Ký, đóng dấu)</p>
                  <span style={{ color: '#94a3b8' }}>..........................................</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer modal */}
          <div className="sp-guest-foot" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button type="button" className="sp-btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className="sp-btn-primary"
              onClick={handlePrint}
              style={{ background: '#0284c7' }}
            >
              <Printer size={15} /> In Biên Bản (1 Trang)
            </button>
            <button
              type="button"
              className="sp-btn-primary"
              onClick={handlePrintAndLogout}
              style={{ background: '#059669' }}
              title="In biên bản và đăng xuất chuyển giao ca cho nhân viên tiếp theo"
            >
              <LogOut size={15} /> Bàn Giao Ca & Đăng Xuất
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

ShiftReportModal.propTypes = {
  staffName: PropTypes.string.isRequired,
  station: PropTypes.string.isRequired,
  logs: PropTypes.array.isRequired,
  parkedCount: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onLogout: PropTypes.func
};
