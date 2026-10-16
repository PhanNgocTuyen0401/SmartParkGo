import pg from 'pg';
import dotenv from 'dotenv';

// Chức năng: Tạo đối tượng pg.Pool kết nối tới PostgreSQL. Định nghĩa hàm query(text, params) 
// áp dụng kỹ thuật Parametrized Queries chống hoàn toàn tấn công SQL Injection.


dotenv.config();

const { Pool } = pg;

// Cấu hình kết nối PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/smartpark',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let isConnected = false;

pool.on('connect', () => {
  if (!isConnected) {
    console.log('✅ Đã kết nối thành công tới cơ sở dữ liệu PostgreSQL (SmartPark Đà Nẵng)');
    isConnected = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Lỗi kết nối cơ sở dữ liệu PostgreSQL:', err.message);
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SQL] ${text.slice(0, 60)}... (${duration}ms, rows: ${res.rowCount})`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL Error] Lỗi thực thi truy vấn: ${text}`, err.message);
    throw err;
  }
};

export default pool;
