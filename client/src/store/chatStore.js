import { create } from 'zustand';

export const useChatStore = create((set) => ({
  messages: [],
  isOpen: false,
  unreadCount: 0,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    unreadCount: state.isOpen ? 0 : state.unreadCount + 1
  })),
  
  setIsOpen: (isOpen) => set((state) => ({
    isOpen,
    unreadCount: isOpen ? 0 : state.unreadCount
  })),
  
  clearChat: () => set({ messages: [], unreadCount: 0 })
}));
