import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as downtimeService from '../services/downtime.service';

export function useDowntimeEvents(params?: {
  machineId?: number;
  category?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['downtime', 'events', params],
    queryFn: () => downtimeService.getDowntimeEvents(params),
  });
}

export function useCreateDowntimeEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (event: { machineId: number; category: string; reason?: string; reportedBy?: string }) =>
      downtimeService.createDowntimeEvent(event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtime'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useResolveDowntimeEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...resolution }: { id: number; resolvedBy?: string; resolutionNotes?: string }) =>
      downtimeService.resolveDowntimeEvent(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtime'] });
    },
  });
}

export function useDowntimeAnalytics(from?: string, to?: string) {
  return useQuery({
    queryKey: ['downtime', 'analytics', from, to],
    queryFn: () => downtimeService.getDowntimeAnalytics(from, to),
  });
}

export function useOeeMetrics(from: string, to: string, machineId?: number) {
  return useQuery({
    queryKey: ['oee', from, to, machineId],
    queryFn: () => downtimeService.getOeeMetrics(from, to, machineId),
    enabled: !!from && !!to,
  });
}
