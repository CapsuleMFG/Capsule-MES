import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as jobsService from '../services/jobs.service';
import * as dashboardService from '../services/dashboard.service';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => jobsService.getDashboardMetrics(),
    refetchInterval: 60000, // Refetch every minute
  });
}

const dashboardKeys = {
  production: ['dashboard', 'production'] as const,
};

export function useProductionDashboard(refetchInterval = 30000) {
  return useQuery({
    queryKey: dashboardKeys.production,
    queryFn: dashboardService.getProductionDashboard,
    refetchInterval,
  });
}

export function useUpdateMachineStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ machineId, isDown, downReason }: { machineId: number; isDown: boolean; downReason?: string }) =>
      dashboardService.updateMachineStatus(machineId, isDown, downReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.production });
    },
  });
}
