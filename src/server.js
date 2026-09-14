import http from 'http';
import app from './app.js';
import config from './config/index.js';
import { connectDB, cacheService } from './config/db.js';
import webSocketService from './config/websocket.js';
import logger from './utils/logger.js';
import { setupErrorHandlers } from './middlewares/errorHandler.js';

const startServer = async () => {
  try {
    // Setup process-level error handlers
    setupErrorHandlers();

    // Connect to database
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);
    const port = config.server.port;

    // Attach WebSocket service
    webSocketService.initialize(server);

    // Start listening
    server.listen(port, () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 SleepFine Monolith running on http://localhost:${port}`);
      logger.info(`📊 Environment: ${config.server.env}`);
      logger.info(`🔗 Health Check: http://localhost:${port}/health`);
      logger.info(`🌐 API Base URL: http://localhost:${port}/api/v1`);
      logger.info(`=======================================================`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('SleepFine Monolith: Server closed gracefully');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forcefully shutting down after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('Fatal error during monolithic server startup:', error);
    process.exit(1);
  }
};

startServer();
