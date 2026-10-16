import { query } from './db.js';

async function setup() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS clearance_logs (
        id VARCHAR(50) PRIMARY KEY,
        log_date DATE DEFAULT CURRENT_DATE,
        date_display VARCHAR(30),
        time_in VARCHAR(20),
        time_out VARCHAR(20) DEFAULT '--:--',
        duration VARCHAR(50) DEFAULT 'Vừa vào bãi',
        plate VARCHAR(30),
        slot VARCHAR(50),
        customer VARCHAR(100),
        ticket_type VARCHAR(50),
        status VARCHAR(50),
        method VARCHAR(100),
        fee VARCHAR(50),
        gate_in VARCHAR(50) DEFAULT 'Cổng Vào 01',
        gate_out VARCHAR(50) DEFAULT '--',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_clearance_logs_date ON clearance_logs(log_date);
      CREATE INDEX IF NOT EXISTS idx_clearance_logs_plate ON clearance_logs(plate);
    `);
    console.log('✅ Bảng clearance_logs đã được tạo thành công.');

    // Seed dữ liệu mẫu thực tế qua các ngày (hôm nay, hôm qua, các ngày trước) nếu bảng còn rỗng
    const countRes = await query('SELECT count(*) FROM clearance_logs');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

      const sampleLogs = [
        {
          id: 'LOG-7721',
          log_date: today.toISOString().split('T')[0],
          date_display: today.toLocaleDateString('vi-VN'),
          time_in: '08:15:20',
          time_out: '10:45:00',
          duration: '2h 30m',
          plate: '43A - 889.92',
          slot: 'Tầng B1 · Ô A-02',
          customer: 'Nguyễn Văn Hùng',
          ticket_type: 'Vé đặt trước app',
          status: 'Đã hoàn tất',
          method: 'Đã thanh toán qua App',
          fee: '45.000đ',
          gate_in: 'Cổng Vào 01',
          gate_out: 'Cổng Ra 01'
        },
        {
          id: 'LOG-7722',
          log_date: today.toISOString().split('T')[0],
          date_display: today.toLocaleDateString('vi-VN'),
          time_in: '09:02:15',
          time_out: '--:--',
          duration: 'Đang đỗ',
          plate: '43B - 567.89',
          slot: 'Tầng B2 · Ô B-08',
          customer: 'Trần Thị Thu Hà',
          ticket_type: 'Vé vãng lai (Đến sớm)',
          status: 'Đến sớm (Chờ thanh toán)',
          method: 'Thu cước khi ra',
          fee: '35.000đ',
          gate_in: 'Cổng Vào 01',
          gate_out: '--'
        },
        {
          id: 'LOG-7723',
          log_date: today.toISOString().split('T')[0],
          date_display: today.toLocaleDateString('vi-VN'),
          time_in: '10:30:10',
          time_out: '--:--',
          duration: 'Đang đỗ',
          plate: '92A - 345.12',
          slot: 'Tầng B1 · Ô A-05',
          customer: 'Lê Hoàng Nam',
          ticket_type: 'Vé lượt giấy',
          status: 'Đang đỗ',
          method: 'Chưa thanh toán',
          fee: '25.000đ',
          gate_in: 'Cổng Vào 01',
          gate_out: '--'
        },
        {
          id: 'LOG-7688',
          log_date: yesterday.toISOString().split('T')[0],
          date_display: yesterday.toLocaleDateString('vi-VN'),
          time_in: '14:20:00',
          time_out: '18:10:00',
          duration: '3h 50m',
          plate: '43C - 112.34',
          slot: 'Tầng B2 · Ô B-12',
          customer: 'Phạm Quốc Bảo',
          ticket_type: 'Vé đặt trước app',
          status: 'Đã hoàn tất',
          method: 'Đã thanh toán qua App',
          fee: '55.000đ',
          gate_in: 'Cổng Vào 01',
          gate_out: 'Cổng Ra 01'
        },
        {
          id: 'LOG-7650',
          log_date: twoDaysAgo.toISOString().split('T')[0],
          date_display: twoDaysAgo.toLocaleDateString('vi-VN'),
          time_in: '09:10:00',
          time_out: '12:00:00',
          duration: '2h 50m',
          plate: '43A - 998.76',
          slot: 'Tầng G · Ô G-03',
          customer: 'Đặng Mai Phương',
          ticket_type: 'Vé lượt giấy',
          status: 'Đã hoàn tất',
          method: 'VietQR / Napas 247',
          fee: '35.000đ',
          gate_in: 'Cổng Vào 01',
          gate_out: 'Cổng Ra 01'
        }
      ];

      for (const log of sampleLogs) {
        await query(`
          INSERT INTO clearance_logs (id, log_date, date_display, time_in, time_out, duration, plate, slot, customer, ticket_type, status, method, fee, gate_in, gate_out)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO NOTHING
        `, [
          log.id, log.log_date, log.date_display, log.time_in, log.time_out, log.duration,
          log.plate, log.slot, log.customer, log.ticket_type, log.status, log.method,
          log.fee, log.gate_in, log.gate_out
        ]);
      }
      console.log('✓ Đã nạp 5 nhật ký thông quan mẫu qua các ngày.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi setup clearance_logs:', err);
    process.exit(1);
  }
}

setup();
