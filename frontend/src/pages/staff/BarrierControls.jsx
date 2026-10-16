import PropTypes from 'prop-types';
import { Sliders, ArrowDownCircle, ArrowUpCircle, Lock, Unlock } from 'lucide-react';

export default function BarrierControls({
  gateInStatus,
  gateOutStatus,
  onToggleGate,
  onAutoPulseGate
}) {
  const isGateInOpen = gateInStatus !== 'CLOSED';
  const isGateOutOpen = gateOutStatus !== 'CLOSED';

  return (
    <div className="pf-center-subcard">
      <div className="pf-panel-header">
        <div className="pf-panel-title">
          <Sliders size={16} color="#0284c7" />
          <span>BẢNG ĐIỀU KHIỂN RÀO CHẮN BARRIER TỰ ĐỘNG</span>
        </div>
        <span className="pf-chip-ready">CHUẨN CÔNG NGHIỆP</span>
      </div>

      <div className="pf-barrier-dual-controllers">
        {/* Làn vào 01 */}
        <div className={`pf-barrier-control-unit ${isGateInOpen ? 'is-open' : 'is-closed'}`}>
          <div className="pf-barrier-visual-box">
            {/* Traffic signal light */}
            <div className="pf-mini-traffic-light">
              <span className={`pf-traffic-bulb red ${!isGateInOpen ? 'on' : ''}`}></span>
              <span className={`pf-traffic-bulb green ${isGateInOpen ? 'on' : ''}`}></span>
            </div>

            {/* Barrier post and animated arm */}
            <div className="pf-barrier-mechanism">
              <div className="pf-mech-post"></div>
              <div className={`pf-mech-arm ${isGateInOpen ? 'open' : 'closed'}`}>
                <div className="pf-arm-stripes"></div>
              </div>
            </div>

            <div className="pf-mech-status-text">
              <strong>LÀN VÀO 01</strong>
              <span className={`pf-badge-gate-state ${isGateInOpen ? 'green' : 'gray'}`}>
                {gateInStatus === 'CLOSED' ? 'ĐANG HẠ RÀO (KHÓA)' : gateInStatus === 'OPENING' ? 'ĐANG MỞ (4S)' : 'MỞ LIÊN TỤC'}
              </span>
            </div>
          </div>

          <div className="pf-bcu-action-bar">
            <button
              type="button"
              className="pf-btn-barrier-pulse in"
              onClick={() => onAutoPulseGate('IN')}
              title="Mở rào chắn trong 4 giây rồi tự động hạ xuống"
            >
              <ArrowDownCircle size={14} /> Mở Tự Động (4s)
            </button>
            <button
              type="button"
              className={`pf-btn-barrier-override ${isGateInOpen ? 'danger' : 'secondary'}`}
              onClick={() => onToggleGate('IN')}
            >
              {isGateInOpen ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{isGateInOpen ? 'Hạ Rào Lại' : 'Mở Cưỡng Bức'}</span>
            </button>
          </div>
        </div>

        {/* Làn ra 02 */}
        <div className={`pf-barrier-control-unit ${isGateOutOpen ? 'is-open' : 'is-closed'}`}>
          <div className="pf-barrier-visual-box">
            {/* Traffic signal light */}
            <div className="pf-mini-traffic-light">
              <span className={`pf-traffic-bulb red ${!isGateOutOpen ? 'on' : ''}`}></span>
              <span className={`pf-traffic-bulb green ${isGateOutOpen ? 'on' : ''}`}></span>
            </div>

            {/* Barrier post and animated arm */}
            <div className="pf-barrier-mechanism">
              <div className="pf-mech-post"></div>
              <div className={`pf-mech-arm ${isGateOutOpen ? 'open' : 'closed'}`}>
                <div className="pf-arm-stripes"></div>
              </div>
            </div>

            <div className="pf-mech-status-text">
              <strong>LÀN RA 02</strong>
              <span className={`pf-badge-gate-state ${isGateOutOpen ? 'green' : 'gray'}`}>
                {gateOutStatus === 'CLOSED' ? 'ĐANG HẠ RÀO (KHÓA)' : gateOutStatus === 'OPENING' ? 'ĐANG MỞ (4S)' : 'MỞ LIÊN TỤC'}
              </span>
            </div>
          </div>

          <div className="pf-bcu-action-bar">
            <button
              type="button"
              className="pf-btn-barrier-pulse out"
              onClick={() => onAutoPulseGate('OUT')}
              title="Mở rào cho xe ra trong 4 giây rồi tự động hạ xuống"
            >
              <ArrowUpCircle size={14} /> Mở Cho Xe Ra (4s)
            </button>
            <button
              type="button"
              className={`pf-btn-barrier-override ${isGateOutOpen ? 'danger' : 'secondary'}`}
              onClick={() => onToggleGate('OUT')}
            >
              {isGateOutOpen ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{isGateOutOpen ? 'Hạ Rào Lại' : 'Mở Cưỡng Bức'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

BarrierControls.propTypes = {
  gateInStatus: PropTypes.string.isRequired,
  gateOutStatus: PropTypes.string.isRequired,
  onToggleGate: PropTypes.func.isRequired,
  onAutoPulseGate: PropTypes.func.isRequired
};
