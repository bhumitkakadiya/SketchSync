import { create } from 'zustand';

export const useChatStore = create((set) => ({
  messages: [],
  unreadCount: 0,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    unreadCount: state.unreadCount + 1
  })),
  
  markAsRead: () => set({ unreadCount: 0 }),
  
  clearChat: () => set({ messages: [], unreadCount: 0 })
}));
