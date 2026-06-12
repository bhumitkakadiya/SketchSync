const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const replayRoutes = require('./routes/replay.routes');
const aiRoutes = require('./routes/ai.routes');

const createApp = () => {
  const app = express();

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_ORIGIN 
      : [process.env.CLIENT_ORIGIN, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting
  app.use('/api', apiLimiter);

  // Request logger
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/rooms', roomRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1', replayRoutes);

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // 404
  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` } });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
