import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { useCanvasStore } from '../store/canvasStore';
import { SOCKET_EVENTS } from '../constants/socketEvents';

// Module-level singleton — one socket for the whole app lifetime
let socketInstance = null;
// Module-level callbacks ref so any hook instance can update it
const globalCallbacks = { current: {} };

const initSocket = (accessToken, { setConnected, setPageCount, addUser, removeUser, setUsers, updateCursor, addRemoteStroke, updateRemoteStroke, removeRemoteStroke }) => {
  if (socketInstance) return socketInstance;

  socketInstance = io(
    `${import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:5000'}/whiteboard`,
    {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    }
  );

  socketInstance.on('connect', () => setConnected(true));
  socketInstance.on('disconnect', () => setConnected(false));
  socketInstance.on('reconnect', () => setConnected(true));

  // Room events
  socketInstance.on(SOCKET_EVENTS.ROOM_USERS_LIST, ({ users }) => setUsers(users));
  socketInstance.on(SOCKET_EVENTS.ROOM_USER_JOINED, (user) => addUser(user));
  socketInstance.on(SOCKET_EVENTS.ROOM_USER_LEFT, ({ userId }) => removeUser(userId));

  // Page events
  socketInstance.on(SOCKET_EVENTS.CANVAS_PAGE_ADDED, ({ pageCount }) => setPageCount(pageCount));

  // Cursor events
  socketInstance.on(SOCKET_EVENTS.CURSOR_POSITIONS, ({ cursors }) => {
    cursors.forEach((c) => updateCursor(c.userId, c));
  });

  // Canvas events — remote strokes (routed through globalCallbacks for canvas)
  socketInstance.on(SOCKET_EVENTS.CANVAS_STROKE_START, ({ strokeId, userId, type, color, size, x, y }) => {
    addRemoteStroke(strokeId, { type, color, brushSize: size, points: [{ x, y }], userId });
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_STROKE_MOVE, ({ strokeId, x, y }) => {
    updateRemoteStroke(strokeId, { x, y });
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_STROKE_END, (data) => {
    if (globalCallbacks.current.onStrokeEnd) globalCallbacks.current.onStrokeEnd(data);
    removeRemoteStroke(data.strokeId);
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_SHAPE, (data) => {
    if (globalCallbacks.current.onShape) globalCallbacks.current.onShape(data);
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_TEXT, (data) => {
    if (globalCallbacks.current.onText) globalCallbacks.current.onText(data);
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_BULK_LOAD, (data) => {
    if (globalCallbacks.current.onBulkLoad) globalCallbacks.current.onBulkLoad(data);
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_UNDO, (data) => {
    if (globalCallbacks.current.onUndo) globalCallbacks.current.onUndo(data);
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_REDO, (data) => {
    if (globalCallbacks.current.onRedo) globalCallbacks.current.onRedo(data);
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_CLEAR, () => {
    if (globalCallbacks.current.onClear) globalCallbacks.current.onClear();
  });
  socketInstance.on(SOCKET_EVENTS.CANVAS_STATE_SYNC, ({ canvasImageBase64 }) => {
    if (globalCallbacks.current.onStateSync) globalCallbacks.current.onStateSync(canvasImageBase64);
  });

  return socketInstance;
};

export const useSocket = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setConnected = useRoomStore((s) => s.setConnected);
  const setPageCount = useRoomStore((s) => s.setPageCount);
  const { addUser, removeUser, setUsers, updateCursor } = useRoomStore();
  const { addRemoteStroke, updateRemoteStroke, removeRemoteStroke } = useCanvasStore();

  const getSocket = useCallback(() => {
    return initSocket(accessToken, {
      setConnected, setPageCount, addUser, removeUser, setUsers,
      updateCursor, addRemoteStroke, updateRemoteStroke, removeRemoteStroke,
    });
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const joinRoom = useCallback((roomId) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId });
  }, [getSocket]);

  const leaveRoom = useCallback((roomId) => {
    if (socketInstance) {
      socketInstance.emit(SOCKET_EVENTS.ROOM_LEAVE, { roomId });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, []);

  // emit: works even if not yet connected (socket.io queues events until connected)
  const emit = useCallback((event, data) => {
    if (socketInstance) {
      socketInstance.emit(event, data);
    }
  }, []);

  const setCallbacks = useCallback((cbs) => {
    globalCallbacks.current = { ...globalCallbacks.current, ...cbs };
  }, []);

  return { getSocket, joinRoom, leaveRoom, disconnect, emit, setCallbacks };
};
