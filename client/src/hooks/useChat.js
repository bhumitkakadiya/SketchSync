import { useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';

export const useChat = (socket) => {
  const { addMessage } = useChatStore();

  useEffect(() => {
    if (!socket?.getSocket) return;
    const socketInstance = socket.getSocket();

    const handleReceiveMessage = (message) => {
      addMessage(message);
    };

    // Remove any previous listener first to prevent duplicates
    socketInstance.off('CHAT:RECEIVE_MESSAGE', handleReceiveMessage);
    socketInstance.on('CHAT:RECEIVE_MESSAGE', handleReceiveMessage);

    return () => {
      socketInstance.off('CHAT:RECEIVE_MESSAGE', handleReceiveMessage);
    };
  }, [socket, addMessage]);

  const sendMessage = useCallback((roomId, text) => {
    if (!socket?.emit || !text.trim() || !roomId) return;
    socket.emit('CHAT:SEND_MESSAGE', { roomId, message: text });
  }, [socket]);

  return { sendMessage };
};
