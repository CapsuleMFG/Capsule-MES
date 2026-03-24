import api from './api';
import type { Notification } from '../../../shared/types';

export async function getNotifications(unreadOnly?: boolean, limit?: number): Promise<Notification[]> {
  const params: Record<string, string> = {};
  if (unreadOnly) params.unreadOnly = 'true';
  if (limit) params.limit = String(limit);
  const { data } = await api.get('/notifications', { params });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count');
  return data.count;
}

export async function markAsRead(id: number): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await api.put('/notifications/read-all');
}

export async function deleteNotification(id: number): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
