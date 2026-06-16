const { createClient } = require('redis');
const logger = require('../utils/logger');

let pubClient = null;
let subClient = null;
let redisAvailable = false;

const connectRedis = async () => {
  // Force single-instance mode for local development regardless of env var
  logger.info('Running without Redis (single-instance mode)');
  return { pubClient: null, subClient: null, redisAvailable: false };

  try {
    pubClient = createClient({ url: process.env.REDIS_URL });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => logger.error('Redis pub error:', err.message));
    subClient.on('error', (err) => logger.error('Redis sub error:', err.message));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    redisAvailable = true;
    logger.info('Redis connected');
    return { pubClient, subClient, redisAvailable: true };
  } catch (error) {
    logger.warn(`Redis connection failed: ${error.message} — running single-instance`);
    return { pubClient: null, subClient: null, redisAvailable: false };
  }
};

const getRedisClient = () => pubClient;

module.exports = { connectRedis, getRedisClient, isRedisAvailable: () => redisAvailable };
