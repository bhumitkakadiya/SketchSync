import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useRoomStore } from '../store/roomStore';
import { useCanvasStore } from '../store/canvasStore';
import { SOCKET_EVENTS } from '../constants/socketEvents';

let socketInstance = null;

export const useSocket = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setConnected = useRoomStore((s) => s.setConnected);
  const setPageCount = useRoomStore((s) => s.setPageCount);
  const { addUser, removeUser, setUsers, updateCursor } = useRoomStore();
  const { addRemoteStroke, updateRemoteStroke, removeRemoteStroke } = useCanvasStore();

  const callbacksRef = useRef({});

  const getSocket = useCallback(() => {
    if (!socketInstance || !socketInstance.connected) {
      if (socketInstance) socketInstance.disconnect();
      socketInstance = io(
        `${import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:5000'}/whiteboard`,
        {
          auth: { token: accessToken },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        }
      );

      socketInstance.on('connect', () => setConnected(true));
      socketInstance.on('disconnect', () => setConnected(false));

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

      // Canvas events — remote strokes
      socketInstance.on(SOCKET_EVENTS.CANVAS_STROKE_START, ({ strokeId, userId, type, color, size, x, y }) => {
        addRemoteStroke(strokeId, { type, color, brushSize: size, points: [{ x, y }], userId });
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_STROKE_MOVE, ({ strokeId, x, y }) => {
        updateRemoteStroke(strokeId, { x, y });
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_STROKE_END, (data) => {
        // Pass to canvas through callbacks
        if (callbacksRef.current.onStrokeEnd) {
          callbacksRef.current.onStrokeEnd(data);
        }
        removeRemoteStroke(data.strokeId);
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_SHAPE, (data) => {
        if (callbacksRef.current.onShape) callbacksRef.current.onShape(data);
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_TEXT, (data) => {
        if (callbacksRef.current.onText) callbacksRef.current.onText(data);
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_UNDO, (data) => {
        if (callbacksRef.current.onUndo) callbacksRef.current.onUndo(data);
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_REDO, (data) => {
        if (callbacksRef.current.onRedo) callbacksRef.current.onRedo(data);
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_CLEAR, () => {
        if (callbacksRef.current.onClear) callbacksRef.current.onClear();
      });
      socketInstance.on(SOCKET_EVENTS.CANVAS_STATE_SYNC, ({ canvasImageBase64 }) => {
        if (callbacksRef.current.onStateSync) callbacksRef.current.onStateSync(canvasImageBase64);
      });
    }

    return socketInstance;
  }, [accessToken]);

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
      setConnected(false);
    }
  }, []);

  const emit = useCallback((event, data) => {
    if (socketInstance?.connected) {
      socketInstance.emit(event, data);
    }
  }, []);

  const setCallbacks = useCallback((cbs) => {
    callbacksRef.current = { ...callbacksRef.current, ...cbs };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't disconnect on component unmount - socket persists across room
    };
  }, []);

  return { getSocket, joinRoom, leaveRoom, disconnect, emit, setCallbacks };
};
