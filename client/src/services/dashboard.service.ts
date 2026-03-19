import api from './api';
import type { ProductionDashboardData } from '../types';

export async function getProductionDashboard(): Promise<ProductionDashboardData> {
  const { data } = await api.get('/dashboard/production');
  return data;
}

export async function updateMachineStatus(
  machineId: number,
  isDown: boolean,
  downReason?: string
): Promise<void> {
  await api.put(`/dashboard/production/machines/${machineId}/status`, { isDown, downReason });
}
