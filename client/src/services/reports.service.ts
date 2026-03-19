import api from './api';
import type { KpiReport } from '../types';

export async function getKpiReport(from?: string, to?: string): Promise<KpiReport> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const { data } = await api.get(`/reports/kpis?${params.toString()}`);
  return data;
}
