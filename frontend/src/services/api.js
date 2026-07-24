import axios from 'axios';
import { parseApiError } from '../utils/errorParser';

// API instance targeted at our /api endpoint (configured via VITE_API_URL in production)
console.log("API URL =", import.meta.env.VITE_API_URL);
console.log(import.meta.env);
console.log(import.meta.env.VITE_API_URL);
const getBaseURL = () => {
  let url = import.meta.env.VITE_API_URL;
  if (!url) {
    return '/api';
  }
  url = url.trim();
  if (!url.endsWith('/api') && !url.endsWith('/api/')) {
    url = url.replace(/\/+$/, '') + '/api';
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseURL(),
});
// Interceptor to inject standard Bearer token if session exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor to handle authentication failures, redirects, and error normalisation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Attach a human-readable message so every catch block can safely render it
    error._parsedMessage = parseApiError(error);

    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        // Token expired or invalid, sign out user
        localStorage.removeItem('token');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login?session_expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

