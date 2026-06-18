import api from './api';

export const replayService = {
  listSessions: (roomId) => api.get(`sessions/${roomId}`),
  getReplay: (sessionId, page = 1) => api.get(`sessions/${sessionId}/replay?page=${page}&limit=5000`),
  getMetadata: (sessionId) => api.get(`sessions/${sessionId}/metadata`),
  getRange: (sessionId, from, to) => api.get(`strokes/${sessionId}?from=${from}&to=${to}`),
  listSnapshots: (roomId) => api.get(`snapshots/${roomId}`),
  deleteSnapshot: (id) => api.delete(`snapshots/${id}`),
};
