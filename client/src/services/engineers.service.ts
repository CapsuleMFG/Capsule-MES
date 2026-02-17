import api from './api';
import type { Engineer, CreateEngineerRequest, UpdateEngineerRequest } from '../types';

export async function getEngineers(activeOnly?: boolean): Promise<Engineer[]> {
  const params = activeOnly ? '?active=true' : '';
  const response = await api.get<Engineer[]>(`/engineers${params}`);
  return response.data;
}

export async function createEngineer(data: CreateEngineerRequest): Promise<Engineer> {
  const response = await api.post<Engineer>('/engineers', data);
  return response.data;
}

export async function updateEngineer(id: number, data: UpdateEngineerRequest): Promise<Engineer> {
  const response = await api.put<Engineer>(`/engineers/${id}`, data);
  return response.data;
}

export async function deleteEngineer(id: number): Promise<void> {
  await api.delete(`/engineers/${id}`);
}
