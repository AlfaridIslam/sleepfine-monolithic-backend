import logger from '../utils/logger.js';
import ApiResponse from '../utils/response.js';
import config from '../config/index.js';

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = null, statusCode = 400) {
    super(message, statusCode);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

/**
 * Global Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  logger.logError(err, req, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate field value: ${field} = ${value}. Please use another value.`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value,
    }));
    const message = 'Validation failed';
    error = new ValidationError(message, errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AuthenticationError(message);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new AppError(message, 413);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = new AppError(message, 400);
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = new RateLimitError(err.message);
  }

  // Network errors
  if (err.code === 'ECONNREFUSED') {
    const message = 'Service unavailable';
    error = new AppError(message, 503);
  }

  if (err.code === 'ETIMEDOUT') {
    const message = 'Request timeout';
    error = new AppError(message, 408);
  }

  // Default error status
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  if (config.server.env === 'development') {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: error.errors || null,
      stack: error.stack,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  } else {
    const errorResponse = {
      success: false,
      message: error.isOperational ? message : 'Internal Server Error',
      statusCode,
      timestamp: new Date().toISOString(),
    };

    if (error.errors) {
      errorResponse.errors = error.errors;
    }

    return res.status(statusCode).json(errorResponse);
  }
};

/**
 * 404 handler middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async error wrapper
 */
const asyncErrorHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Setup global error handlers
 */
const setupErrorHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });
};

export {
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  setupErrorHandlers,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
};
export default errorHandler;
