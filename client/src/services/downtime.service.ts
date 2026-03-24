import api from './api';
import type { DowntimeEvent, DowntimeAnalytics, OeeMetrics, OeeByMachine } from '../../../shared/types';

export async function getDowntimeEvents(params?: {
  machineId?: number;
  category?: string;
  from?: string;
  to?: string;
}): Promise<DowntimeEvent[]> {
  const { data } = await api.get('/downtime', { params });
  return data;
}

export async function createDowntimeEvent(event: {
  machineId: number;
  category: string;
  reason?: string;
  reportedBy?: string;
}): Promise<DowntimeEvent> {
  const { data } = await api.post('/downtime', event);
  return data;
}

export async function resolveDowntimeEvent(id: number, resolution: {
  resolvedBy?: string;
  resolutionNotes?: string;
}): Promise<DowntimeEvent> {
  const { data } = await api.put(`/downtime/${id}/resolve`, resolution);
  return data;
}

export async function getDowntimeAnalytics(from?: string, to?: string): Promise<DowntimeAnalytics> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get('/downtime/analytics', { params });
  return data;
}

export async function getOeeMetrics(from: string, to: string, machineId?: number): Promise<{
  aggregate: OeeMetrics;
  byMachine: OeeByMachine[];
}> {
  const params: Record<string, string> = { from, to };
  if (machineId) params.machineId = String(machineId);
  const { data } = await api.get('/downtime/oee', { params });
  return data;
}
