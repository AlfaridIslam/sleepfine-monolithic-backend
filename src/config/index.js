import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env in project root if available)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/sleepfineCRM_DEV',
    testUri: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/sleepfineCRM_test',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Redis Configuration
  redis: {
    enabled: process.env.REDIS_ENABLED !== 'false',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'sleepfine-dev-super-secret-jwt-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'sleepfine-dev-super-secret-refresh-key-2024',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // AWS Configuration (Optional)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET || 'sleepfine-bucket',
    sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL,
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@sleepfine.com',
  },

  // SMS Configuration
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  // WhatsApp Configuration
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  },

  // Google Sheets Configuration
  googleSheets: {
    warrantyWebhookUrl: process.env.GOOGLE_SHEETS_WARRANTY_URL || 'https://script.google.com/macros/s/AKfycbzgGYjZQD0m-En0jnBU7L3G9izay9UHq0G3--8HdEcgCl_Vo-yIcK7evT-OL7QhczU59Q/exec',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 500,
  },

  // Slow Down Configuration
  slowDown: {
    windowMs: parseInt(process.env.SLOW_DOWN_WINDOW_MS, 10) || 900000,
    delayAfter: parseInt(process.env.SLOW_DOWN_DELAY_AFTER, 10) || 100,
    delayMs: parseInt(process.env.SLOW_DOWN_DELAY_MS, 10) || 500,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4200'],
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
    errorFilePath: process.env.LOG_ERROR_FILE_PATH || 'logs/error.log',
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
    uploadPath: process.env.UPLOAD_PATH || 'uploads/',
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 3600, // 1 hour
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD, 10) || 600,
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    sessionSecret: process.env.SESSION_SECRET || 'fallback-session-secret',
    cookieSecret: process.env.COOKIE_SECRET || 'fallback-cookie-secret',
  },

  // External APIs
  externalApis: {
    paymentGateway: process.env.PAYMENT_GATEWAY_URL || 'https://api.payment-gateway.com',
    smsGateway: process.env.SMS_GATEWAY_URL || 'https://api.sms-gateway.com',
  },

  // Development Tools
  devTools: {
    enableSwagger: process.env.ENABLE_SWAGGER === 'true',
    enableStatusMonitor: process.env.ENABLE_STATUS_MONITOR === 'true',
  },
};

export default config;
