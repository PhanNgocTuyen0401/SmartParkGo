# ── Stage 1: Dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Cài các native build tools cần thiết cho bcryptjs, sqlite3, pg
RUN apk add --no-cache python3 make g++ postgresql-client

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Runtime ──────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Thêm user không phải root (bảo mật)
RUN addgroup -g 1001 -S nodejs && adduser -S smartpark -u 1001

# Copy node_modules từ stage deps
COPY --from=deps --chown=smartpark:nodejs /app/node_modules ./node_modules

# Copy source code
COPY --chown=smartpark:nodejs . .

# Không copy file .env (sẽ dùng env vars từ Docker Compose)
RUN rm -f .env .env.local

USER smartpark

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
