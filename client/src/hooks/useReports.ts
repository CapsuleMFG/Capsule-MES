import { useQuery } from '@tanstack/react-query';
import * as reportsService from '../services/reports.service';

export function useKpiReport(from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'kpis', from, to],
    queryFn: () => reportsService.getKpiReport(from, to),
  });
}
