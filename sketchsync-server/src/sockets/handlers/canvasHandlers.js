const Stroke = require('../../models/Stroke');
const Session = require('../../models/Session');
const Room = require('../../models/Room');
const logger = require('../../utils/logger');

// In-memory stroke buffer: Map<strokeId, {points[], sessionId, roomId, ...}>
const strokeBuffer = new Map();

const canvasHandlers = (io, socket) => {
  const emit = (event, data) => {
    if (socket.currentRoom) {
      socket.to(`room:${socket.currentRoom}`).emit(event, data);
    }
  };

  // CANVAS:STROKE_START
  socket.on('CANVAS:STROKE_START', ({ strokeId, type, color, size, x, y, sessionId }) => {
    strokeBuffer.set(strokeId, {
      sessionId,
      roomId: socket.currentRoom,
      userId: socket.user.id,
      type,
      points: [{ x, y }],
      color: color || '#000000',
      brushSize: size || 4,
      startX: x, startY: y,
      startTime: Date.now(),
    });
    emit('CANVAS:STROKE_START', { strokeId, userId: socket.user.id, type, color, size: size || 4, x, y });
  });

  // CANVAS:STROKE_MOVE
  socket.on('CANVAS:STROKE_MOVE', ({ strokeId, x, y, timestamp }) => {
    const buf = strokeBuffer.get(strokeId);
    if (buf) buf.points.push({ x, y });
    emit('CANVAS:STROKE_MOVE', { strokeId, x, y });
  });

  // CANVAS:STROKE_END — persist to MongoDB
  socket.on('CANVAS:STROKE_END', async ({ strokeId, points, metadata }) => {
    try {
      const buf = strokeBuffer.get(strokeId);
      if (!buf) return;
      strokeBuffer.delete(strokeId);

      const finalPoints = points || buf.points;
      emit('CANVAS:STROKE_END', { strokeId, userId: socket.user.id, finalPoints });

      // Persist to DB
      if (!buf.sessionId || !buf.roomId) return;

      // Get session for seqNum and timestamp
      const session = await Session.findByIdAndUpdate(
        buf.sessionId,
        { $inc: { strokeCounter: 1, totalStrokes: 1 } },
        { new: true }
      );
      if (!session) return;

      const relativeTs = Date.now() - session.startedAt.getTime();

      await Stroke.create({
        sessionId: buf.sessionId,
        roomId: buf.roomId,
        userId: buf.userId,
        seqNum: session.strokeCounter,
        timestamp: relativeTs,
        type: buf.type,
        data: {
          points: finalPoints,
          color: metadata?.color || buf.color,
          brushSize: metadata?.brushSize || buf.brushSize,
          opacity: metadata?.opacity || 1,
        },
        strokeId,
      });
    } catch (err) {
      if (err.code !== 11000) { // Ignore duplicate strokeId (idempotency)
        logger.error('STROKE_END persist error:', err.message);
      }
    }
  });

  // CANVAS:SHAPE
  socket.on('CANVAS:SHAPE', async ({ strokeId, type, startX, startY, endX, endY, color, brushSize, sessionId }) => {
    emit('CANVAS:SHAPE', { strokeId, userId: socket.user.id, type, startX, startY, endX, endY, color, brushSize });

    // Persist shape
    try {
      if (!sessionId || !socket.currentRoom) return;
      const session = await Session.findByIdAndUpdate(
        sessionId,
        { $inc: { strokeCounter: 1, totalStrokes: 1 } },
        { new: true }
      );
      if (!session) return;
      const relativeTs = Date.now() - session.startedAt.getTime();
      await Stroke.create({
        sessionId, roomId: socket.currentRoom, userId: socket.user.id,
        seqNum: session.strokeCounter,
        timestamp: relativeTs,
        type, data: { startX, startY, endX, endY, color, brushSize },
        strokeId,
      });
    } catch (err) {
      if (err.code !== 11000) logger.error('SHAPE persist error:', err.message);
    }
  });

  // CANVAS:TEXT
  socket.on('CANVAS:TEXT', async ({ strokeId, x, y, text, fontSize, color, sessionId }) => {
    emit('CANVAS:TEXT', { strokeId, userId: socket.user.id, x, y, text, fontSize, color });
    try {
      if (!sessionId || !socket.currentRoom) return;
      const session = await Session.findByIdAndUpdate(
        sessionId, { $inc: { strokeCounter: 1, totalStrokes: 1 } }, { new: true }
      );
      if (!session) return;
      await Stroke.create({
        sessionId, roomId: socket.currentRoom, userId: socket.user.id,
        seqNum: session.strokeCounter,
        timestamp: Date.now() - session.startedAt.getTime(),
        type: 'text',
        data: { text, color, fontSize, startX: x, startY: y },
        strokeId,
      });
    } catch (err) {
      if (err.code !== 11000) logger.error('TEXT persist error:', err.message);
    }
  });

  // CANVAS:UNDO
  socket.on('CANVAS:UNDO', async ({ strokeId, sessionId }) => {
    io.in(`room:${socket.currentRoom}`).emit('CANVAS:UNDO', { userId: socket.user.id, strokeId });
    try {
      await Stroke.findOneAndUpdate({ strokeId }, { undone: true });
    } catch (err) {
      logger.error('UNDO error:', err.message);
    }
  });

  // CANVAS:REDO
  socket.on('CANVAS:REDO', async ({ strokeId }) => {
    io.in(`room:${socket.currentRoom}`).emit('CANVAS:REDO', { userId: socket.user.id, strokeId });
    try {
      await Stroke.findOneAndUpdate({ strokeId }, { undone: false });
    } catch (err) {
      logger.error('REDO error:', err.message);
    }
  });

  // CANVAS:CLEAR
  socket.on('CANVAS:CLEAR', async ({ sessionId, timestamp }) => {
    emit('CANVAS:CLEAR', { userId: socket.user.id, timestamp });
    // Mark all session strokes as undone (clear = mass undo)
    try {
      await Stroke.updateMany({ sessionId }, { undone: true });
      await Room.findByIdAndUpdate(socket.currentRoom, { canvasState: null, pageCount: 1 });
    } catch (err) {
      logger.error('CLEAR error:', err.message);
    }
  });

  // CANVAS:ADD_PAGE
  socket.on('CANVAS:ADD_PAGE', async () => {
    logger.info(`Received CANVAS:ADD_PAGE from ${socket.user?.id} in room ${socket.currentRoom}`);
    try {
      if (!socket.currentRoom) return;
      const roomDoc = await Room.findById(socket.currentRoom);
      if (!roomDoc) return;
      
      const newCount = (roomDoc.pageCount || 1) + 1;
      roomDoc.pageCount = newCount;
      await roomDoc.save();

      logger.info(`Updated pageCount to ${newCount}`);
      emit('CANVAS:PAGE_ADDED', { pageCount: newCount, userId: socket.user.id });
      socket.emit('CANVAS:PAGE_ADDED', { pageCount: newCount, userId: socket.user.id }); // send back to sender too
    } catch (err) {
      logger.error('ADD_PAGE error:', err.message);
    }
  });

  // CANVAS:REMOVE_PAGE
  socket.on('CANVAS:REMOVE_PAGE', async () => {
    logger.info(`Received CANVAS:REMOVE_PAGE from ${socket.user?.id} in room ${socket.currentRoom}`);
    try {
      if (!socket.currentRoom) return;
      const roomDoc = await Room.findById(socket.currentRoom);
      if (!roomDoc || !roomDoc.pageCount || roomDoc.pageCount <= 1) return;
      
      const newCount = roomDoc.pageCount - 1;
      roomDoc.pageCount = newCount;
      await roomDoc.save();

      logger.info(`Decreased pageCount to ${newCount}`);
      emit('CANVAS:PAGE_ADDED', { pageCount: newCount, userId: socket.user.id });
      socket.emit('CANVAS:PAGE_ADDED', { pageCount: newCount, userId: socket.user.id }); // send back to sender too
    } catch (err) {
      logger.error('REMOVE_PAGE error:', err.message);
    }
  });
};

module.exports = canvasHandlers;
