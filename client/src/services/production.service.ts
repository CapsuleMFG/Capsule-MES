import api from './api';
import type { WorkOrder, ProductionStatus, Machine, JobPriority } from '../../../shared/types';

export async function sendToProduction(
  jobId: number,
  woId: number,
  machineType: string
): Promise<WorkOrder> {
  const { data } = await api.post(`/production/jobs/${jobId}/work-orders/${woId}/send`, { machineType });
  return data;
}

export async function getProductionPool(): Promise<WorkOrder[]> {
  const { data } = await api.get('/production/pool');
  return data;
}

export async function assignToMachine(woId: number, machineId: number): Promise<WorkOrder> {
  const { data } = await api.post(`/production/work-orders/${woId}/assign`, { machineId });
  return data;
}

export async function updateProductionStatus(
  woId: number,
  status: ProductionStatus
): Promise<WorkOrder> {
  const { data } = await api.put(`/production/work-orders/${woId}/status`, { status });
  return data;
}

export async function updateProductionPriority(
  woId: number,
  priority: JobPriority
): Promise<WorkOrder> {
  const { data } = await api.put(`/production/work-orders/${woId}/priority`, { priority });
  return data;
}

export async function getMachines(): Promise<Machine[]> {
  const { data } = await api.get('/production/machines');
  return data;
}
