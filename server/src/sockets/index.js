const { Server } = require('socket.io');
const socketAuth = require('./middleware/socketAuth');
const roomHandlers = require('./handlers/roomHandlers');
const canvasHandlers = require('./handlers/canvasHandlers');
const cursorHandlers = require('./handlers/cursorHandlers');
const chatHandlers = require('./handlers/chatHandlers');
const logger = require('../utils/logger');

const initSocketIO = async (httpServer, redisClients) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_ORIGIN 
        : [process.env.CLIENT_ORIGIN, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Attach Redis adapter if available
  if (redisClients?.redisAvailable && redisClients.pubClient && redisClients.subClient) {
    const { createAdapter } = require('@socket.io/redis-adapter');
    io.adapter(createAdapter(redisClients.pubClient, redisClients.subClient));
    logger.info('Socket.IO: Redis adapter attached');
  } else {
    logger.warn('Socket.IO: Running without Redis adapter (single-instance)');
  }

  // /whiteboard namespace
  const whiteboard = io.of('/whiteboard');
  whiteboard.use(socketAuth);

  whiteboard.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user?.username} [${socket.id}]`);

    // Attach handlers
    roomHandlers(whiteboard, socket);
    canvasHandlers(whiteboard, socket);
    cursorHandlers(whiteboard, socket);
    chatHandlers(whiteboard, socket);

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info(`Socket disconnected: ${socket.user?.username} [${reason}]`);
      if (socket.currentRoom) {
        socket.to(`room:${socket.currentRoom}`).emit('ROOM:USER_LEFT', { userId: socket.user.id });
      }
    });

    socket.on('error', (err) => {
      logger.error(`Socket error [${socket.id}]:`, err.message);
    });
  });

  return io;
};

module.exports = initSocketIO;
