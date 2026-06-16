const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

const chatHandlers = (io, socket) => {
  // CHAT:SEND_MESSAGE
  socket.on('CHAT:SEND_MESSAGE', ({ roomId, message }) => {
    try {
      if (!message || !socket.user) return;

      // Use currentRoom as fallback if roomId not provided / doesn't match
      const targetRoom = roomId || socket.currentRoom;
      if (!targetRoom) return;

      const chatMessage = {
        id: uuidv4(),
        userId: socket.user.id,
        username: socket.user.username,
        displayName: socket.displayName || socket.user.username,
        color: socket.userColor || '#3B82F6',
        text: message,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to room (other members)
      socket.to(`room:${targetRoom}`).emit('CHAT:RECEIVE_MESSAGE', chatMessage);

      // Echo back to sender with server timestamp
      socket.emit('CHAT:RECEIVE_MESSAGE', chatMessage);

    } catch (err) {
      logger.error('CHAT:SEND_MESSAGE error:', err.message);
    }
  });
};

module.exports = chatHandlers;
