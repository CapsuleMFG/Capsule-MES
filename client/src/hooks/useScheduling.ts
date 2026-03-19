import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as schedulingService from '../services/scheduling.service';
import type { UpdatePositionRequest, MoveEntryRequest, UpdateScheduleStatusRequest } from '../types';

const schedulingKeys = {
  all: ['scheduling'] as const,
  board: () => [...schedulingKeys.all, 'board'] as const,
  blockedCount: () => [...schedulingKeys.all, 'blocked-count'] as const,
};

export function useSchedule(refetchInterval = 15000) {
  return useQuery({
    queryKey: schedulingKeys.board(),
    queryFn: schedulingService.getSchedule,
    refetchInterval,
  });
}

export function useBlockedCount() {
  return useQuery({
    queryKey: schedulingKeys.blockedCount(),
    queryFn: schedulingService.getBlockedCount,
    refetchInterval: 30000,
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: number } & UpdatePositionRequest) =>
      schedulingService.updatePosition(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulingKeys.board() }),
  });
}

export function useMoveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: number } & MoveEntryRequest) =>
      schedulingService.moveEntry(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulingKeys.board() }),
  });
}

export function useUpdateScheduleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: number } & UpdateScheduleStatusRequest) =>
      schedulingService.updateScheduleStatus(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.board() });
      queryClient.invalidateQueries({ queryKey: schedulingKeys.blockedCount() });
    },
  });
}
