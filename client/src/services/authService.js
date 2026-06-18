import api from './api';

export const authService = {
  register: (data) => api.post('auth/register', data),
  login: (data) => api.post('auth/login', data),
  refresh: () => api.post('auth/refresh'),
  logout: () => api.post('auth/logout'),
  me: () => api.get('auth/me'),
  updateProfile: (data) => api.put('auth/profile', data),
};
