import { supabase } from '../lib/supabase';
import api from './api';
import type { Profile, CreateUserRequest, UpdateProfileRequest, AuditLogFilters, PaginatedResponse, AuditLogEntry } from '../../../shared/types';

// Auth operations (via Supabase client singleton)
export async function login(email: string, password: string) {
  if (!supabase) throw new Error('Auth not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Profile operations (via Express API)
export async function getMyProfile(): Promise<Profile> {
  const { data } = await api.get('/profiles/me');
  return data;
}

export async function getProfiles(): Promise<Profile[]> {
  const { data } = await api.get('/profiles');
  return data;
}

export async function getProfileById(id: string): Promise<Profile> {
  const { data } = await api.get(`/profiles/${id}`);
  return data;
}

export async function createUser(req: CreateUserRequest): Promise<Profile> {
  const { data } = await api.post('/profiles', req);
  return data;
}

export async function updateProfile(id: string, req: UpdateProfileRequest): Promise<Profile> {
  const { data } = await api.put(`/profiles/${id}`, req);
  return data;
}

export async function getAuditLog(filters: AuditLogFilters): Promise<PaginatedResponse<AuditLogEntry>> {
  const params = new URLSearchParams();
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.tableName) params.set('tableName', filters.tableName);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const { data } = await api.get(`/audit-log?${params.toString()}`);
  return data;
}
