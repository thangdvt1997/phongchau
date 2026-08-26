export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.BACKEND_PORT ?? '4000', 10),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:8730',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'no-reply@phongchau.example',
  },
  payments: {
    vnpay: {
      enabled: process.env.PAYMENT_VNPAY_ENABLED === 'true',
      tmnCode: process.env.PAYMENT_VNPAY_TMN_CODE,
      hashSecret: process.env.PAYMENT_VNPAY_HASH_SECRET,
    },
    stripe: {
      enabled: process.env.PAYMENT_STRIPE_ENABLED === 'true',
      secretKey: process.env.PAYMENT_STRIPE_SECRET_KEY,
    },
  },
});
