import api from './api';
import type {
  MachineQueue,
  UpdatePositionRequest,
  MoveEntryRequest,
  UpdateScheduleStatusRequest,
} from '../types';

export async function getSchedule(): Promise<MachineQueue[]> {
  const { data } = await api.get('/scheduling');
  return data;
}

export async function updatePosition(id: number, req: UpdatePositionRequest): Promise<void> {
  await api.put(`/scheduling/${id}/position`, req);
}

export async function moveEntry(id: number, req: MoveEntryRequest): Promise<void> {
  await api.put(`/scheduling/${id}/move`, req);
}

export async function updateScheduleStatus(id: number, req: UpdateScheduleStatusRequest): Promise<void> {
  await api.put(`/scheduling/${id}/status`, req);
}

export async function generateSchedule(jobId: number): Promise<void> {
  await api.post(`/scheduling/generate/${jobId}`);
}

export async function getBlockedCount(): Promise<number> {
  const { data } = await api.get('/scheduling/blocked-count');
  return data.count;
}
