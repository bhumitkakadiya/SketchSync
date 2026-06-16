import api from './api';

export const roomService = {
  create: (data) => api.post('/rooms', data),
  list: () => api.get('/rooms'),
  get: (id) => api.get(`/rooms/${id}`),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
  join: (code) => api.post('/rooms/join', { code }),
  leave: (id) => api.post(`/rooms/${id}/leave`),
  getMembers: (id) => api.get(`/rooms/${id}/members`),
  kickMember: (roomId, userId) => api.delete(`/rooms/${roomId}/members/${userId}`),
  saveSnapshot: (roomId, imageData, name) => api.post(`/rooms/${roomId}/snapshot`, { imageData, name }),
};
