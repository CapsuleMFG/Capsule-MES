import { useQuery } from '@tanstack/react-query';
import * as jobsService from '../services/jobs.service';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => jobsService.getDashboardMetrics(),
    refetchInterval: 60000, // Refetch every minute
  });
}
