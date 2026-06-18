import api from './api';

export const aiService = {
  chat: async (message, context = null) => {
    return api.post('ai/chat', { message, context });
  }
};
