import { useState } from 'react';
import PropTypes from 'prop-types';
import { CarFront, Plus, ShieldCheck } from 'lucide-react';

export default function VehiclesView({ vehiclesList, setVehiclesList }) {
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleBrand, setNewVehicleBrand] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('Điện EV');

  const handleAddVehicle = (e) => {
    e.preventDefault();
    if (!newVehiclePlate.trim()) return;

    const newCar = {
      id: Date.now(),
      plate: newVehiclePlate.trim().toUpperCase(),
      brand: newVehicleBrand.trim() || 'Ô tô tiêu chuẩn',
      type: newVehicleType,
      autoBarrier: true
    };

    setVehiclesList((prev) => [...prev, newCar]);
    setNewVehiclePlate('');
    setNewVehicleBrand('');
    alert(`Đã thêm xe ${newCar.plate} vào danh sách phương tiện thành công!`);
  };

  const handleToggleBarrier = (carId) => {
    setVehiclesList((prev) =>
      prev.map((car) => (car.id === carId ? { ...car, autoBarrier: !car.autoBarrier } : car))
    );
  };

  return (
    <div className="pf-menu-view-container">
      <div className="pf-view-header-banner">
        <div>
          <div className="pf-slot-dialog-tag">
            <span className="pf-live-dot"></span> QUẢN LÝ PHƯƠNG TIỆN AI BARRIER
          </div>
          <h2>DANH SÁCH XE & THẺ BARRIER PASS</h2>
          <p>
            Biển số xe đã lưu sẽ được Camera AI nhận diện tự động mở rào chắn barrier không dừng
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
        {/* Danh sách xe */}
        <div className="pf-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'Space Grotesk', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Phương tiện đã đăng ký</span>
            <span style={{ fontSize: '0.8rem', background: '#0f1115', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
              {vehiclesList.length} xe
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {vehiclesList.map((car) => (
              <div key={car.id} className="pf-linked-method-card" style={{ marginBottom: 0 }}>
                <div className="pf-linked-method-left">
                  <div className="pf-linked-icon-box card">
                    <CarFront size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.05rem', fontFamily: 'Space Grotesk', letterSpacing: '0.05em' }}>
                      {car.plate}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>
                      {car.brand} · {car.type}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    className={`pf-quick-chip ${car.autoBarrier ? 'active' : ''}`}
                    style={{
                      background: car.autoBarrier ? '#10b981' : '#e5e7eb',
                      color: car.autoBarrier ? '#ffffff' : '#374151',
                      border: '0',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleToggleBarrier(car.id)}
                  >
                    {car.autoBarrier ? '✓ Auto-Barrier Bật' : 'Tắt Auto-Barrier'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--pf-radius-md)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <small style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: '1.5' }}>
              Khi tính năng Auto-Barrier bật, hệ thống camera AI nhận diện biển số cách 10m và hỗ trợ xác thực thanh toán điện tử không dừng qua MoMo/ZaloPay/Ngân hàng khi xe ra cổng.
            </small>
          </div>
        </div>

        {/* Form thêm xe */}
        <div className="pf-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'Space Grotesk', marginBottom: '1.25rem' }}>
            Thêm phương tiện mới
          </h3>
          <form onSubmit={handleAddVehicle}>
            <div className="pf-form-group">
              <label>Biển số xe (Bắt buộc)</label>
              <input
                type="text"
                className="pf-form-control"
                placeholder="51K - 123.45"
                value={newVehiclePlate}
                onChange={(e) => setNewVehiclePlate(e.target.value)}
                required
              />
            </div>

            <div className="pf-form-group">
              <label>Dòng xe / Hãng xe</label>
              <input
                type="text"
                className="pf-form-control"
                placeholder="Tesla Model Y / Honda CR-V"
                value={newVehicleBrand}
                onChange={(e) => setNewVehicleBrand(e.target.value)}
              />
            </div>

            <div className="pf-form-group">
              <label>Loại động cơ</label>
              <select
                className="pf-form-control"
                value={newVehicleType}
                onChange={(e) => setNewVehicleType(e.target.value)}
              >
                <option value="Điện EV">Điện thuần (EV) - Có nhu cầu sạc</option>
                <option value="Xăng">Động cơ Xăng / Dầu</option>
                <option value="Hybrid">Hybrid (Xăng lai điện)</option>
              </select>
            </div>

            <button
              type="submit"
              className="pf-btn-submit"
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              <Plus size={16} style={{ display: 'inline', marginRight: '4px' }} />
              Lưu biển số & Kích hoạt Barrier Pass
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

VehiclesView.propTypes = {
  vehiclesList: PropTypes.array.isRequired,
  setVehiclesList: PropTypes.func.isRequired
};
