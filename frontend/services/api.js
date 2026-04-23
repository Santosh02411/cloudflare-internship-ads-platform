/**
 * Frontend API Service - Communicates with backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (email, password, name) =>
    apiClient.post('/api/auth/signup', { email, password, name }),
  login: (email, password) =>
    apiClient.post('/api/auth/login', { email, password }),
};

// Campaign APIs
export const campaignAPI = {
  list: (limit = 50, offset = 0) =>
    apiClient.get('/api/campaigns', { params: { limit, offset } }),
  get: (id) => apiClient.get(`/api/campaigns/${id}`),
  create: (data) => apiClient.post('/api/campaigns', data),
  update: (id, data) => apiClient.put(`/api/campaigns/${id}`, data),
  delete: (id) => apiClient.delete(`/api/campaigns/${id}`),
  duplicate: (id) => apiClient.post(`/api/campaigns/${id}/duplicate`),
};

// Media APIs
export const mediaAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (limit = 50, offset = 0) =>
    apiClient.get('/api/media', { params: { limit, offset } }),
  delete: (id) => apiClient.delete(`/api/media/${id}`),
};

// Platform APIs
export const platformAPI = {
  list: () => apiClient.get('/api/platforms'),
  connect: (platformType, authCode, redirectUri) =>
    apiClient.post('/api/platforms/connect', {
      platformType,
      authCode,
      redirectUri,
    }),
  disconnect: (platformType) =>
    apiClient.delete(`/api/platforms/${platformType}`),
};

// Publish APIs
export const publishAPI = {
  publish: (campaignId) =>
    apiClient.post('/api/publish', { campaignId }),
  getStatus: (campaignId) =>
    apiClient.get(`/api/status/${campaignId}`),
};

// AI APIs
export const aiAPI = {
  generateCopy: (productName, targetAudience, tone = 'professional') =>
    apiClient.post('/api/ai/generate-copy', {
      productName,
      targetAudience,
      tone,
    }),
  analyzeCopy: (adCopy, platformType) =>
    apiClient.post('/api/ai/analyze-copy', { adCopy, platformType }),
};

export default apiClient;
