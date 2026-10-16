import 'express-async-errors';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cron from 'node-cron';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

// Database & Socket
import pool, { query } from './database/db.js';
import { setupSocketIO } from './sockets/socketHandler.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import parkingRoutes from './routes/parking.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { initNotificationsTable } from './database/initNotifications.js';
import { syncAndExpireSlots } from './services/slotSyncService.js';

// Chức năng: Là trái tim của toàn bộ backend. File này khởi tạo máy chủ Express, 
// thiết lập server HTTP, gắn kênh Socket.IO, cấu hình đường ống Middleware an ninh, 
// đăng ký các Routes API và cài đặt các tác vụ định kỳ (Cron jobs) chạy ngầm.


dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Redis In-Memory Fallback Store (Khi Docker / Redis standalone không chạy) ──
class InMemoryRedisStore {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    this.isInMemory = true;
  }
  async get(key) {
    const exp = this.ttls.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) ?? null;
  }
  async set(key, value) {
    this.store.set(key, String(value));
    this.ttls.delete(key);
    return 'OK';
  }
  async setex(key, seconds, value) {
    this.store.set(key, String(value));
    this.ttls.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }
  async del(...keys) {
    let count = 0;
    for (const k of keys.flat()) {
      if (this.store.delete(k)) count++;
      this.ttls.delete(k);
    }
    return count;
  }
  async keys(pattern = '*') {
    const now = Date.now();
    for (const [k, exp] of this.ttls.entries()) {
      if (now > exp) {
        this.store.delete(k);
        this.ttls.delete(k);
      }
    }
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }
  async ping() {
    return 'PONG';
  }
  async flushall() {
    this.store.clear();
    this.ttls.clear();
    return 'OK';
  }
}

const inMemoryFallback = new InMemoryRedisStore();
let redisClient = inMemoryFallback;

// ── Kết nối Redis Client (ioredis) hoặc dùng InMemory Fallback ───────────
(async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null
    });
    client.on('error', () => {
      if (!redisClient || !redisClient.isInMemory) {
        redisClient = inMemoryFallback;
      }
    });
    await client.connect();
    redisClient = client;
    console.log('✅ Redis Cache Layer (ioredis) đã kết nối thành công:', redisUrl.replace(/:\/\/.*@/, '://***@'));
  } catch {
    console.log('⚡ Redis Server không kết nối được -> Đã kích hoạt In-Memory Cache Fallback (Hoạt động 100% không cần Docker).');
    redisClient = inMemoryFallback;
  }
})();

// ── Expose redisClient toàn cục để các routes sử dụng ────────────────
export const getRedisClient = () => redisClient;

/**
 * Cache helper: lấy dữ liệu từ Redis hoặc execute fallback
 * @param {string} key - Redis cache key
 * @param {Function} fallback - Async function trả về data thật
 * @param {number} ttl - Time-to-live tính bằng giây (mặc định 60s)
 */
export async function withCache(key, fallback, ttl = 60) {
  if (redisClient) {
    try {
      const cached = await redisClient.get(key);
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  const data = await fallback();
  if (redisClient && data !== null && data !== undefined) {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
    } catch {}
  }
  return data;
}

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── Socket.IO ─────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});
app.set('io', io);
app.set('redisClient', () => redisClient);
setupSocketIO(io);

// ── Middlewares ───────────────────────────────────────────────────────

// Compression (gzip/brotli) – giảm bandwidth tới 70%
app.use(compression({
  level: 6,
  threshold: 1024, // chỉ compress khi response > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// CORS
app.use(cors({
  origin: NODE_ENV === 'production'
    ? [CLIENT_URL, process.env.EXTRA_ORIGIN].filter(Boolean)
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP logging (chỉ trong dev)
if (NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req) => req.url === '/api/health'
  }));
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ── Rate Limiting ─────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' },
  skip: (req) => req.url === '/api/health'
});

// Rate limit chặt hơn cho auth endpoints
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 20,
  message: { success: false, message: 'Quá nhiều lần thử đăng nhập. Vui lòng chờ 5 phút.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// ── Health Check ──────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  let redisStatus = 'active (in-memory)';

  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  if (redisClient && !redisClient.isInMemory) {
    try {
      await redisClient.ping();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'active (in-memory)';
    }
  }

  res.json({
    status: 'online',
    system: 'SmartPark Danang Backend API',
    version: '2.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {
      database: dbStatus,
      redis: redisStatus
    },
    technologies: {
      runtime: `Node.js ${process.version}`,
      framework: 'Express.js 4.x',
      validation: 'Zod',
      auth: 'JWT & RBAC',
      realtime: 'Socket.IO',
      database: 'PostgreSQL 16',
      cache: redisClient && !redisClient.isInMemory ? 'Redis 7' : 'Redis Cache (In-Memory Engine)',
      compression: 'gzip/brotli'
    }
  });
});

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

initNotificationsTable();

// ── 404 Handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} không tồn tại.`
  });
});

// ── Global Error Handler (express-async-errors tự catch async errors) ─
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (statusCode >= 500) {
    console.error('[SERVER ERROR]', err.message);
  }

  // An toàn tuyệt đối: Không để lộ lỗi chi tiết máy chủ, SQL hay stack trace
  const safeMessage = statusCode >= 500
    ? 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu. Vui lòng thử lại sau.'
    : (err.message || 'Yêu cầu không hợp lệ.');

  res.status(statusCode).json({
    success: false,
    message: safeMessage
  });
});

// ── CRON JOBS ─────────────────────────────────────────────────────────

// Tự động giải phóng ô đỗ khi thời gian đỗ xe hoặc booking hết hạn (cập nhật thời gian thực mỗi 3 giây)
setInterval(async () => {
  try {
    await syncAndExpireSlots(io);
  } catch {}
}, 3000);

// Chạy một lần ngay khi server khởi động
setTimeout(() => {
  syncAndExpireSlots(io).catch(() => {});
}, 1500);

// Phát realtime stats mỗi 5 phút
cron.schedule('*/5 * * * *', async () => {
  try {
    const stats = await pool.query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN payment_status='Đang gửi' THEN 1 ELSE 0 END) as active
       FROM parking_sessions`
    );
    io.emit('system:stats', {
      totalSessions: stats.rows[0]?.total || 0,
      activeSessions: stats.rows[0]?.active || 0,
      timestamp: new Date().toISOString()
    });
  } catch {}
});

// Dọn dẹp Redis cache cũ mỗi giờ
cron.schedule('0 * * * *', async () => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys('smartpark:*');
    if (keys.length > 0) {
      console.log(`🧹 [Cron] Redis cleanup: ${keys.length} keys được kiểm tra.`);
    }
  } catch {}
});

// ── Khởi Động Server ─────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('════════════════════════════════════════════════════════');
  console.log(`🚀 SMARTPARK ĐÀ NẴNG v2.0 – CỔNG: ${PORT} [${NODE_ENV.toUpperCase()}]`);
  console.log(`🌐 REST API : http://localhost:${PORT}/api/health`);
  console.log(`⚡ Socket.IO: ws://localhost:${PORT}`);
  console.log(`🗜️  Compression: gzip enabled`);
  console.log(`✅ Validation : Zod schemas`);
  console.log('════════════════════════════════════════════════════════');
});
// Updated 2026-09-23T07:45:00

