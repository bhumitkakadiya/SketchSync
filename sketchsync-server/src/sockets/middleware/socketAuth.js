const { verifyAccessToken } = require('../../utils/jwtUtils');
const logger = require('../../utils/logger');

const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) {
    return next(new Error('NO_TOKEN'));
  }
  try {
    const decoded = verifyAccessToken(token);
    socket.user = decoded;
    next();
  } catch (err) {
    logger.warn(`Socket auth failed: ${err.message}`);
    next(new Error('INVALID_TOKEN'));
  }
};

module.exports = socketAuth;
