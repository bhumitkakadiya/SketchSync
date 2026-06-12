// Cursor positions are batched and broadcast at max 30fps per user
// We throttle by tracking last emit time per socket

const cursorHandlers = (io, socket) => {
  let lastEmit = 0;
  const THROTTLE_MS = 1000 / 30; // 30fps

  socket.on('CURSOR:MOVE', ({ x, y, roomId }) => {
    const now = Date.now();
    if (now - lastEmit < THROTTLE_MS) return;
    lastEmit = now;

    if (!socket.currentRoom) return;
    socket.to(`room:${socket.currentRoom}`).emit('CURSOR:POSITIONS', {
      cursors: [{
        userId: socket.user.id,
        username: socket.user.username,
        x,
        y,
        color: socket.userColor || '#3B82F6',
      }],
    });
  });
};

module.exports = cursorHandlers;
