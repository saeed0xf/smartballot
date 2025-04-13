import axios from 'axios';

const API_URL = '/api';
export const SERVER_URL = 'http://localhost:9001'; // Server URL for building complete image URLs

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication services
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  initAdmin: async () => {
    const response = await api.post('/auth/init-admin');
    return response.data;
  }
};

// Voter services
export const voterService = {
  getAllVoters: async () => {
    const response = await api.get('/voters');
    return response.data;
  },
  getVoterById: async (id) => {
    const response = await api.get(`/voters/${id}`);
    return response.data;
  },
  getVoterByVoterId: async (voterId) => {
    const response = await api.get(`/voters/id/${voterId}`);
    return response.data;
  },
  createVoter: async (formData) => {
    const response = await api.post('/voters', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  updateVoter: async (id, formData) => {
    const response = await api.put(`/voters/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  deleteVoter: async (id) => {
    const response = await api.delete(`/voters/${id}`);
    return response.data;
  }
};

export default api; 