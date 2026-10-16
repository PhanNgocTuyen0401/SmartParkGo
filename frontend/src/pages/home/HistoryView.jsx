import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { History, Download, Search, CheckCircle2, Clock, QrCode } from 'lucide-react';

// Danh sách các mã demo cần lọc bỏ triệt để
const DEMO_PATTERNS = ['SP-PASS-9842', 'SP-PASS-4412', 'SP-PASS-3301', '43B89632', '51H89632', '59A34567', '60B88991', '43A34567', '43C88991', '43D12345'];

export default function HistoryView({ onOpenQrModal, language = 'vi' }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState(() => {
    try {
      const savedPasses = localStorage.getItem('sp_prebooked_passes');
      if (savedPasses) {
        const parsed = JSON.parse(savedPasses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Lọc bỏ mọi vé demo mẫu cũ
          const cleanPasses = parsed.filter((p) => {
            if (!p || !p.code) return false;
            return !DEMO_PATTERNS.some((pat) => p.code.includes(pat));
          });
          // Lưu lại bản sạch nếu có demo bị xóa
          if (cleanPasses.length !== parsed.length) {
            localStorage.setItem('sp_prebooked_passes', JSON.stringify(cleanPasses));
          }
          return cleanPasses.map((p, idx) => ({
            id: p.code || `PASS-${idx}`,
            code: p.code,
            place: `${p.branch || 'SmartPark'} · ${p.slot || 'Ô đỗ'}`,
            vehicle: `${p.plate} (${p.model || 'Xe'})`,
            plate: p.plate,
            model: p.model,
            slot: p.slot,
            branch: p.branch,
            time: p.bookingTime || (p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : 'Vừa xong'),
            cost: p.fee || '45.000đ',
            method: (p.paymentStatus || 'Ví điện tử').replace('Đã thanh toán qua ', ''),
            status: p.status === 'COMPLETED' ? 'Đã thanh toán' : 'Đang gửi',
            passData: p
          }));
        }
      }
    } catch {}
    return [];
  });

  // Đồng bộ lịch sử thực tế từ PostgreSQL Backend
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('http://localhost:5000/api/bookings/my-bookings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const dbBookings = data.data
            .filter((b) => !DEMO_PATTERNS.some((pat) => (b.booking_code || '').includes(pat)))
            .map((b) => ({
              id: b.id || b.booking_code,
              code: b.booking_code || b.id,
              place: `${b.branch_id || 'SmartPark'} · ${b.slot_code || 'Ô đỗ'}`,
              vehicle: `${b.plate} (${b.vehicle_model || 'Xe'})`,
              plate: b.plate,
              model: b.vehicle_model,
              slot: b.slot_code,
              branch: b.branch_id,
              time: b.created_at ? new Date(b.created_at).toLocaleString('vi-VN') : 'Gần đây',
              cost: b.total_cost ? `${parseInt(b.total_cost, 10).toLocaleString('vi-VN')}đ` : '45.000đ',
              method: b.payment_method || 'VietQR',
              status: b.payment_status === 'COMPLETED' ? 'Đã thanh toán' : 'Đang gửi',
              passData: {
                code: b.booking_code || b.id,
                plate: b.plate,
                model: b.vehicle_model,
                slot: b.slot_code,
                branch: b.branch_id,
                bookingTime: b.created_at ? new Date(b.created_at).toLocaleString('vi-VN') : 'Gần đây',
                fee: b.total_cost ? `${parseInt(b.total_cost, 10).toLocaleString('vi-VN')}đ` : '45.000đ',
                qrPayload: b.qr_code_payload || b.booking_code
              }
            }));

          setRecords((prev) => {
            const existingCodes = new Set(dbBookings.map((x) => x.code));
            const filteredPrev = prev.filter((p) => !existingCodes.has(p.code));
            return [...dbBookings, ...filteredPrev];
          });
        }
      })
      .catch((err) => console.warn('HistoryView backend sync notice:', err.message));
  }, []);

  const filteredList = records.filter((item) => {
    if (filter === 'active' && item.status !== 'Đang gửi') return false;
    if (filter === 'paid' && item.status !== 'Đã thanh toán') return false;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchPlace = (item.place || '').toLowerCase().includes(q);
      const matchPlate = (item.plate || '').toLowerCase().includes(q);
      const matchCode = (item.code || '').toLowerCase().includes(q);
      const matchVehicle = (item.vehicle || '').toLowerCase().includes(q);
      const matchSlot = (item.slot || '').toLowerCase().includes(q);
      const matchMethod = (item.method || '').toLowerCase().includes(q);
      if (!matchPlace && !matchPlate && !matchCode && !matchVehicle && !matchSlot && !matchMethod) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="pf-menu-view-container">
      <div className="pf-view-header-banner">
        <div>
          <div className="pf-slot-dialog-tag">
            <span className="pf-live-dot"></span> {language === 'vi' ? 'NHẬT KÝ RA VÀO BARRIER' : 'BARRIER ACCESS LOG'}
          </div>
          <h2>{language === 'vi' ? 'LỊCH SỬ ĐỖ XE & BIÊN LAI ĐIỆN TỬ' : 'PARKING HISTORY & RECEIPTS'}</h2>
          <p>
            {language === 'vi'
              ? 'Toàn bộ danh sách các phiên gửi xe, lấy lại mã QR Barrier Pass và xem trạng thái thanh toán'
              : 'Complete list of parking sessions, retrieve QR Passes and monitor payments'}
          </p>
        </div>
        <button
          className="pf-btn-directions"
          onClick={() => alert(language === 'vi' ? 'Đang xuất file Excel / PDF lịch sử đỗ xe...' : 'Exporting parking history...')}
        >
          <Download size={15} /> {language === 'vi' ? 'Xuất file báo cáo' : 'Export Report'}
        </button>
      </div>

      <div className="pf-card" style={{ padding: '1.5rem' }}>
        {/* Filters and search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="pf-floor-tabs" style={{ margin: 0 }}>
            {[
              { id: 'all', label: language === 'vi' ? 'Tất cả' : 'All' },
              { id: 'active', label: language === 'vi' ? 'Đang gửi' : 'Active' },
              { id: 'paid', label: language === 'vi' ? 'Đã thanh toán' : 'Completed' }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`pf-floor-tab ${filter === tab.id ? 'active' : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pf-station-search-box" style={{ width: '320px', margin: 0 }}>
            <Search size={15} color="#9ca3af" />
            <input
              type="text"
              placeholder={language === 'vi' ? 'Tìm biển số, mã vé, bãi đỗ, dòng xe...' : 'Search plate, code, place, car...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* History table / list */}
        <div className="pf-history-list" style={{ padding: 0 }}>
          {filteredList.map((item) => (
            <div key={item.id} className="pf-history-item" style={{ padding: '1.1rem 0' }}>
              <div className="pf-history-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {item.status === 'Đang gửi' ? (
                    <Clock size={16} color="#0284c7" />
                  ) : (
                    <CheckCircle2 size={16} color="#10b981" />
                  )}
                  <strong style={{ fontSize: '0.92rem' }}>{language === 'vi' ? item.place : item.place.replace('Ô đỗ', 'Slot')}</strong>
                </div>
                <small style={{ color: 'var(--pf-text-muted)', fontSize: '0.74rem', marginTop: '0.2rem', display: 'block' }}>
                  {item.time} · {item.vehicle} {item.code ? (language === 'vi' ? `· Mã: ${item.code}` : `· Code: ${item.code}`) : ''}
                </small>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div className="pf-history-amount" style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.98rem' }}>{item.cost}</strong>
                  <span style={{ color: item.status === 'Đang gửi' ? '#0284c7' : '#10b981', display: 'block', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                    {language === 'vi'
                      ? item.status
                      : (item.status === 'Đang gửi' ? 'Active' : 'Paid')}
                    {' · '}
                    {language === 'vi'
                      ? item.method
                      : (item.method === 'Ví điện tử' ? 'E-Wallet' : item.method)}
                  </span>
                </div>

                <button
                  className="pf-btn-qr-history"
                  onClick={() => {
                    if (onOpenQrModal) {
                      onOpenQrModal(item.passData || item);
                    }
                  }}
                  title={language === 'vi' ? 'Mở lại mã vé QR Barrier Pass' : 'View QR Pass'}
                >
                  <QrCode size={15} />
                  <span>{language === 'vi' ? 'Xem mã QR' : 'QR Pass'}</span>
                </button>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9ca3af' }}>
              <History size={36} style={{ margin: '0 auto 0.6rem', opacity: 0.45, color: '#0284c7' }} />
              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#334155', marginBottom: '0.3rem' }}>
                {search ? (language === 'vi' ? 'Không tìm thấy kết quả phù hợp' : 'No matching results') : (language === 'vi' ? 'Chưa có lịch sử đỗ xe nào' : 'No parking history yet')}
              </strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                {search
                  ? (language === 'vi' ? `Không có phiên đỗ xe nào khớp với "${search}". Vui lòng thử từ khóa khác.` : `No records matched "${search}".`)
                  : (language === 'vi' ? 'Bạn chưa có lượt đỗ xe nào. Các lượt đặt chỗ và gửi xe thực tế sẽ được tự động lưu tại đây.' : 'Your parking sessions will appear here.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

HistoryView.propTypes = {
  onOpenQrModal: PropTypes.func,
  language: PropTypes.string
};
