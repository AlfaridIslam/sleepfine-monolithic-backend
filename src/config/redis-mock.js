// Redis Mock Service for Development
// Use this when Redis is not available locally

import logger from '../utils/logger.js';

class RedisMockService {
  constructor() {
    this.cache = new Map();
    this.isConnected = true;

    // Periodic cleanup of expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref(); // Prevent timer from keeping Node process alive
    }

    logger.info('Redis Mock Service initialized (in-memory caching active)');
  }

  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item && item.expiry && now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  async connect() {
    this.isConnected = true;
    logger.info('Redis Mock Service connected');
  }

  async disconnect() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.isConnected = false;
    logger.info('Redis Mock Service disconnected');
  }

  async get(key) {
    if (!this.isConnected) {
      logger.warn('Redis Mock not connected, skipping get operation');
      return null;
    }

    const value = this.cache.get(key);
    if (value && value.expiry && Date.now() > value.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return value ? value.data : null;
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) {
      logger.warn('Redis Mock not connected, skipping set operation');
      return;
    }

    const expiry = ttl ? Date.now() + (ttl * 1000) : null;
    this.cache.set(key, {
      data: value,
      expiry: expiry
    });
    
    logger.debug(`Redis Mock: Set ${key} with TTL ${ttl}s`);
  }

  async setEx(key, ttl, value) {
    return this.set(key, value, ttl);
  }

  async keys(pattern = '*') {
    if (!this.isConnected) return [];
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.cache.keys()).filter(k => regex.test(k));
  }

  async del(key) {
    if (!this.isConnected) {
      logger.warn('Redis Mock not connected, skipping del operation');
      return;
    }

    const deleted = this.cache.delete(key);
    logger.debug(`Redis Mock: Delete ${key} - ${deleted ? 'success' : 'not found'}`);
    return deleted;
  }

  async flush() {
    if (!this.isConnected) {
      logger.warn('Redis Mock not connected, skipping flush operation');
      return;
    }

    this.cache.clear();
    logger.info('Redis Mock: Cache flushed');
  }

  async healthCheck() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      type: 'mock',
      cacheSize: this.cache.size,
      timestamp: new Date().toISOString()
    };
  }

  async ping() {
    return 'PONG';
  }
}

export default RedisMockService;
