require('dotenv').config();
const http = require('http');
const createApp = require('./src/app');
const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const initSocketIO = require('./src/sockets');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  // Connect to MongoDB
  await connectDB();

  // Connect to Redis (optional)
  const redisClients = await connectRedis();

  // Create Express app + HTTP server
  const app = createApp();
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  await initSocketIO(httpServer, redisClients);

  httpServer.listen(PORT, '127.0.0.1', () => {
    logger.info(`🚀 SketchSync Server running on http://127.0.0.1:${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV}`);
    logger.info(`   WebSocket namespace: /whiteboard`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error('Server startup error:', err);
  process.exit(1);
});
