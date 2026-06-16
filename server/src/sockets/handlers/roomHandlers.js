const Room = require('../../models/Room');
const Session = require('../../models/Session');
const User = require('../../models/User');
const logger = require('../../utils/logger');

const roomHandlers = (io, socket) => {
  // ROOM:JOIN
  socket.on('ROOM:JOIN', async ({ roomId }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (room.bannedUsers.map(id => id.toString()).includes(socket.user.id)) {
        return socket.emit('ERROR', { code: 'BANNED', message: 'You are banned from this room' });
      }

      const socketRoom = `room:${roomId}`;

      // Leave any previous room
      for (const r of socket.rooms) {
        if (r !== socket.id && r.startsWith('room:')) {
          socket.leave(r);
        }
      }

      socket.join(socketRoom);
      socket.currentRoom = roomId;

      // Get active users in room
      const socketsInRoom = await io.in(socketRoom).fetchSockets();
      const activeUsers = socketsInRoom
        .filter(s => s.id !== socket.id && s.user)
        .map(s => ({ userId: s.user.id, username: s.user.username, color: s.userColor }));

      // Send current canvas state (for late joiners)
      if (room.canvasState) {
        socket.emit('CANVAS:STATE_SYNC', { canvasImageBase64: room.canvasState });
      }
      
      if (room.pageCount && room.pageCount > 1) {
        socket.emit('CANVAS:PAGE_ADDED', { pageCount: room.pageCount, userId: 'system' });
      }

      // Replay all strokes from the active session to reconstruct the board
      if (room.activeSession) {
        const Stroke = require('../../models/Stroke');
        const strokes = await Stroke.find({ sessionId: room.activeSession }).sort({ seqNum: 1 });
        
        // Emit all strokes at once to avoid fast-forward animation on client
        socket.emit('CANVAS:BULK_LOAD', { strokes });
      }

      // Get user's cursor color
      const user = await User.findById(socket.user.id).select('cursorColor displayName avatarUrl');
      socket.userColor = user?.cursorColor || '#3B82F6';
      socket.displayName = user?.displayName || socket.user.username;
      socket.avatarUrl = user?.avatarUrl || '';

      // Send active users list to the joining user
      socket.emit('ROOM:USERS_LIST', { users: activeUsers });

      // Notify others in room
      socket.to(socketRoom).emit('ROOM:USER_JOINED', {
        userId: socket.user.id,
        username: socket.user.username,
        displayName: socket.displayName,
        avatarUrl: socket.avatarUrl,
        color: socket.userColor,
      });

      // Update session participants
      if (room.activeSession) {
        await Session.findByIdAndUpdate(room.activeSession, {
          $push: {
            participants: {
              userId: socket.user.id,
              username: socket.user.username,
              joinedAt: new Date(),
            },
          },
        });
      }

      // Update room lastActivity
      await Room.findByIdAndUpdate(roomId, { lastActivity: new Date() });

      logger.debug(`${socket.user.username} joined room ${roomId}`);
    } catch (err) {
      logger.error('ROOM:JOIN error:', err.message);
      socket.emit('ERROR', { code: 'JOIN_ERROR', message: err.message });
    }
  });
  // ROOM:END
  socket.on('ROOM:END', async ({ roomId }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (room.owner.toString() !== socket.user.id) {
        return socket.emit('ERROR', { code: 'NOT_OWNER', message: 'Only owner can end the session' });
      }

      await Room.findByIdAndUpdate(roomId, { isActive: false });

      if (room.activeSession) {
        await Session.findByIdAndUpdate(room.activeSession, { endedAt: new Date() });
      }

      const socketRoom = `room:${roomId}`;
      io.to(socketRoom).emit('ROOM:ENDED');
      
      logger.debug(`${socket.user.username} ended room ${roomId}`);
    } catch (err) {
      logger.error('ROOM:END error:', err.message);
      socket.emit('ERROR', { code: 'END_ERROR', message: err.message });
    }
  });



  // ROOM:LEAVE
  socket.on('ROOM:LEAVE', async ({ roomId }) => {
    const socketRoom = `room:${roomId}`;
    socket.leave(socketRoom);
    socket.to(socketRoom).emit('ROOM:USER_LEFT', { userId: socket.user.id });
    socket.currentRoom = null;

    // Update session participant leftAt
    try {
      const room = await Room.findById(roomId);
      if (room?.activeSession) {
        await Session.findOneAndUpdate(
          { _id: room.activeSession, 'participants.userId': socket.user.id },
          { $set: { 'participants.$.leftAt': new Date() } }
        );
      }
    } catch (err) {
      logger.error('ROOM:LEAVE session update error:', err.message);
    }
  });
};

module.exports = roomHandlers;
