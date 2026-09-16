import mongoose from 'mongoose';
import Redis from 'redis';
import config from './index.js';
import logger from '../utils/logger.js';
import RedisMockService from './redis-mock.js';

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.database.uri, config.database.options);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
};

// Redis Connection
const createRedisClient = () => {
  const redisOptions = {
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        // Stop retrying after 2 attempts to fail fast and fallback to mock service
        if (retries >= 2) {
          return new Error('Redis connection failed: max retries reached');
        }
        return 500;
      },
    },
    database: config.redis.db,
  };

  if (config.redis.password && config.redis.password.trim() !== '') {
    redisOptions.password = config.redis.password;
    logger.info('Redis password configured');
  } else {
    logger.info('Redis connecting without password');
  }

  const client = Redis.createClient(redisOptions);

  client.on('error', (err) => {
    // Only log if not already switched to mock fallback
    if (!cacheService?.usingMock) {
      logger.error('Redis Client Error:', err.message || err);
    }
  });

  client.on('connect', () => {
    logger.info('Redis Client Connected');
  });

  client.on('ready', () => {
    logger.info('Redis Client Ready');
  });

  client.on('end', () => {
    logger.warn('Redis Client Disconnected');
  });

  return client;
};

// Cache wrapper for Redis with fallback to mock
class CacheService {
  constructor() {
    this.isConnected = false;
    this.usingMock = false;
    this.client = null;

    if (!config.redis.enabled) {
      logger.info('Redis is disabled by configuration (REDIS_ENABLED=false). Using in-memory RedisMockService.');
      this.client = new RedisMockService();
      this.isConnected = true;
      this.usingMock = true;
      return;
    }

    try {
      logger.info('Attempting to connect to Redis...');
      this.client = createRedisClient();
      this.connect();
    } catch (error) {
      logger.warn(`Redis connection setup failed (${error.message}). Using in-memory mock service.`);
      this.client = new RedisMockService();
      this.isConnected = true;
      this.usingMock = true;
    }
  }

  async connect() {
    if (this.usingMock || !this.client) return;
    
    try {
      await this.client.connect();
      this.isConnected = true;
      logger.info('Connected to Redis server successfully');
    } catch (error) {
      logger.warn(`Redis connection failed (${error.message}). Gracefully switching to in-memory mock service.`);
      try {
        if (typeof this.client.disconnect === 'function') {
          await this.client.disconnect().catch(() => {});
        }
      } catch (_) {}
      this.client = new RedisMockService();
      this.isConnected = true;
      this.usingMock = true;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping get operation');
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = config.cache?.ttl || 3600) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping set operation');
      return false;
    }

    try {
      if (typeof this.client.setEx === 'function') {
        await this.client.setEx(key, ttl, JSON.stringify(value));
      } else if (typeof this.client.set === 'function') {
        await this.client.set(key, JSON.stringify(value), ttl);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping delete operation');
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping deletePattern operation');
      return false;
    }

    try {
      if (this.usingMock) {
        const matchingKeys = await this.client.keys(pattern);
        if (matchingKeys && matchingKeys.length > 0) {
          for (const key of matchingKeys) {
            await this.client.del(key);
          }
        }
        return true;
      }
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis deletePattern error:', error);
      return false;
    }
  }

  async flush() {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping flush operation');
      return false;
    }

    try {
      if (this.usingMock) {
        await this.client.flush();
      } else {
        await this.client.flushDb();
      }
      return true;
    } catch (error) {
      logger.error('Redis flush error:', error);
      return false;
    }
  }

  async healthCheck() {
    try {
      if (this.usingMock) {
        return await this.client.healthCheck();
      }
      await this.client.ping();
      return { status: 'connected', type: 'redis' };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { status: 'error', error: error.message };
    }
  }
}

const cacheService = new CacheService();

export { connectDB, cacheService };
