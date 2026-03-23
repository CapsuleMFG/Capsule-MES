import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    // Attach Supabase JWT if available
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
        return config;
      }
    }

    // Fallback: kiosk auth via JWT in session storage
    const kioskToken = sessionStorage.getItem('capsule_kiosk_token');
    if (kioskToken) {
      config.headers.Authorization = `Bearer ${kioskToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const isKioskRoute = window.location.pathname.startsWith('/kiosk');

    if (status === 401 && !isKioskRoute) {
      // Token expired or invalid — clear session (skip for kiosk pages)
      try { await api.post('/auth/logout'); } catch { /* fire-and-forget */ }
      if (supabase) {
        await supabase.auth.signOut();
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (status === 403) {
      console.warn('Permission denied:', error.response?.data?.error);
    }

    return Promise.reject(error);
  }
);

export default api;
