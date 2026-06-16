import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  room: null,
  activeUsers: [], // {userId, username, displayName, color, avatarUrl}
  cursors: {},     // {userId: {x, y, color, username}}
  isConnected: false,
  sessionId: null,
  pageCount: 1,

  setRoom: (room) => set({ room }),
  setSessionId: (sessionId) => set({ sessionId }),
  setConnected: (isConnected) => set({ isConnected }),
  setPageCount: (pageCount) => set({ pageCount }),

  addUser: (user) =>
    set((state) => ({
      activeUsers: state.activeUsers.find((u) => u.userId === user.userId)
        ? state.activeUsers
        : [...state.activeUsers, user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      activeUsers: state.activeUsers.filter((u) => u.userId !== userId),
      cursors: Object.fromEntries(
        Object.entries(state.cursors).filter(([id]) => id !== userId)
      ),
    })),

  setUsers: (users) => set({ activeUsers: users }),

  updateCursor: (userId, cursor) =>
    set((state) => ({
      cursors: { ...state.cursors, [userId]: cursor },
    })),

  clearRoom: () => set({ room: null, activeUsers: [], cursors: {}, isConnected: false, sessionId: null, pageCount: 1 }),
}));
