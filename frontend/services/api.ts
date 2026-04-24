/**
 * Frontend API Service - Communicates with backend
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

const apiClient: AxiosInstance = axios.create({
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
  signup: (email: string, password: string, name: string) =>
    apiClient.post('/api/auth/signup', { email, password, name }),
  login: (email: string, password: string) =>
    apiClient.post('/api/auth/login', { email, password }),
};

// Campaign APIs
export const campaignAPI = {
  list: (limit: number = 50, offset: number = 0) =>
    apiClient.get('/api/campaigns', { params: { limit, offset } }),
  get: (id: string) => apiClient.get(`/api/campaigns/${id}`),
  create: (data: any) => apiClient.post('/api/campaigns', data),
  update: (id: string, data: any) => apiClient.put(`/api/campaigns/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/campaigns/${id}`),
  duplicate: (id: string) => apiClient.post(`/api/campaigns/${id}/duplicate`),
};

// Media APIs
export const mediaAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (limit: number = 50, offset: number = 0) =>
    apiClient.get('/api/media', { params: { limit, offset } }),
  delete: (id: string) => apiClient.delete(`/api/media/${id}`),
};

// Platform APIs
export const platformAPI = {
  list: () => apiClient.get('/api/platforms'),
  connect: (platformType: string, authCode: string, redirectUri: string) =>
    apiClient.post('/api/platforms/connect', {
      platformType,
      authCode,
      redirectUri,
    }),
  disconnect: (platformType: string) =>
    apiClient.delete(`/api/platforms/${platformType}`),
};

// Publish APIs
export const publishAPI = {
  publish: (campaignId: string) =>
    apiClient.post('/api/publish', { campaignId }),
  getStatus: (campaignId: string) =>
    apiClient.get(`/api/status/${campaignId}`),
};

// AI APIs
export const aiAPI = {
  generateCopy: (productName: string, targetAudience: string, tone: string = 'professional') =>
    apiClient.post('/api/ai/generate-copy', {
      productName,
      targetAudience,
      tone,
    }),
  analyzeCopy: (adCopy: string, platformType: string) =>
    apiClient.post('/api/ai/analyze-copy', { adCopy, platformType }),
};

export default apiClient;
