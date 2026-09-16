import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import morgan from 'morgan';

import config from './config/index.js';
import logger from './utils/logger.js';
import ApiResponse from './utils/response.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import apiRouter from './routes/api.js';

const app = express();

// Trust proxy for reverse proxies / rate limiting
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Dynamic CORS configuration allowing all SleepFine domains, subdomains, and local dev
const allowedOriginRegexes = [
  /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*sleepfinemattresses\.com(?::\d+)?$/,
  /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*sleepfineindia\.com(?::\d+)?$/,
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
];

const defaultAllowedOrigins = [
  'https://sleepfinemattresses.com',
  'https://www.sleepfinemattresses.com',
  'https://admin.sleepfinemattresses.com',
  'https://api.sleepfinemattresses.com',
  'https://sleepfineindia.com',
  'https://www.sleepfineindia.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (curl, Postman, mobile native apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const configuredOrigins = Array.isArray(config.cors.origin)
      ? config.cors.origin
      : (typeof config.cors.origin === 'string' ? config.cors.origin.split(',').map((s) => s.trim()) : []);

    const allAllowed = [...defaultAllowedOrigins, ...configuredOrigins];

    if (allAllowed.includes(origin)) {
      return callback(null, true);
    }

    if (allowedOriginRegexes.some((regex) => regex.test(origin))) {
      return callback(null, true);
    }

    logger.warn(`CORS rejected for unauthorized origin: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'Accept',
    'X-Requested-With',
    'Origin',
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting on API routes
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Speed limiter
const speedLimiter = slowDown({
  windowMs: config.slowDown.windowMs,
  delayAfter: config.slowDown.delayAfter,
  delayMs: () => config.slowDown.delayMs,
  validate: { delayMs: false },
});
app.use('/api/', speedLimiter);

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Compression
app.use(compression());

// Request logging
const morganFormat = config.server.env === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat, {
  stream: logger.stream,
  skip: (req, res) => res.statusCode < 400 && config.server.env === 'production',
}));

// Request tracking middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  req.timestamp = new Date();

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    environment: config.server.env,
    version: '1.0.0',
    mode: 'monolith',
  };
  ApiResponse.healthCheck(res, healthData);
});

// Root endpoint
app.get('/', (req, res) => {
  ApiResponse.success(res, 200, 'SleepFine Monolithic Backend API is running', {
    version: '1.0.0',
    endpoints: {
      health: '/health',
      apiV1: '/api/v1',
    },
  });
});

// Mount API routes
app.use('/api/v1', apiRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
