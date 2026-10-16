import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// initDb.js – Kịch bản Tự động Cài đặt Cơ sở dữ liệu
// Chức năng: Khi bạn gõ npm run init-db, file này tự động dò tìm mật khẩu PostgreSQL trên máy bạn (123456, postgres,...), 
// tạo cơ sở dữ liệu smartpark nếu chưa có và tự đọc nạp toàn bộ schema.sql.


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

const CANDIDATE_PASSWORDS = [
  process.env.PGPASSWORD,
  'postgres',
  '123456',
  'admin',
  'root',
  '12345678',
  'password',
  'smartpark'
].filter(Boolean);

async function findWorkingClient(database = 'postgres') {
  const dbHost = process.env.PGHOST || 'localhost';
  const dbPort = process.env.PGPORT || 5432;
  const dbUser = process.env.PGUSER || 'postgres';

  for (const pwd of CANDIDATE_PASSWORDS) {
    const client = new Client({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: pwd,
      database
    });
    try {
      await client.connect();
      return { client, password: pwd };
    } catch {
      await client.end().catch(() => {});
    }
  }
  return null;
}

async function initDatabase() {
  console.log('🚀 Khởi chạy quá trình cấu hình & khởi tạo CSDL PostgreSQL SmartPark...');

  const targetDb = process.env.PGDATABASE || 'smartpark';

  // 1. Tìm mật khẩu kết nối vào PostgreSQL server
  const rootConn = await findWorkingClient('postgres');
  if (!rootConn) {
    console.warn('⚠️ Không thể xác thực mật khẩu PostgreSQL tự động với các mật khẩu thông dụng.');
    console.warn('💡 Bạn có thể cấu hình PGPASSWORD trong file .env và chạy lại: npm run init-db');
    return;
  }

  const { client: rootClient, password: workingPassword } = rootConn;
  console.log(`✓ Đã xác thực thành công vào PostgreSQL server với mật khẩu: ${workingPassword}`);

  // Cập nhật lại .env nếu mật khẩu khác
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      envContent = envContent.replace(/PGPASSWORD=.*/g, `PGPASSWORD=${workingPassword}`);
      envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=postgresql://postgres:${workingPassword}@localhost:5432/${targetDb}`);
      fs.writeFileSync(envPath, envContent, 'utf-8');
    }
  } catch {}

  try {
    const checkDbRes = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(`Database "${targetDb}" chưa tồn tại. Đang tiến hành tạo mới...`);
      await rootClient.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`✓ Đã tạo thành công database "${targetDb}"`);
    } else {
      console.log(`✓ Database "${targetDb}" đã tồn tại sẵn.`);
    }
  } catch (err) {
    console.warn('Lưu ý khi kiểm tra database:', err.message);
  } finally {
    await rootClient.end().catch(() => {});
  }

  // 2. Kết nối vào database đích và thực thi schema.sql
  const appConn = await findWorkingClient(targetDb);
  if (!appConn) {
    console.error(`❌ Không thể kết nối vào database "${targetDb}".`);
    return;
  }

  const { client: appClient } = appConn;
  try {
    console.log(`✓ Đã kết nối vào database "${targetDb}"`);
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Đang thực thi các câu lệnh DDL & Seeding trong schema.sql...');
    await appClient.query(sqlContent);
    console.log('🎉 KHỞI TẠO CƠ SỞ DỮ LIỆU POSTGRESQL SMARTPARK HOÀN TẤT THÀNH CÔNG!');
  } catch (err) {
    console.error('❌ Lỗi thực thi schema.sql:', err.message);
  } finally {
    await appClient.end().catch(() => {});
  }
}

initDatabase();
