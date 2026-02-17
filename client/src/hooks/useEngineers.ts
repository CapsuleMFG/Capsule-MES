import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as engineersService from '../services/engineers.service';
import type { CreateEngineerRequest, UpdateEngineerRequest } from '../types';

export const engineersKeys = {
  all: ['engineers'] as const,
  lists: () => [...engineersKeys.all, 'list'] as const,
  list: (activeOnly?: boolean) => [...engineersKeys.lists(), { activeOnly }] as const,
};

export function useEngineers(activeOnly?: boolean) {
  return useQuery({
    queryKey: engineersKeys.list(activeOnly),
    queryFn: () => engineersService.getEngineers(activeOnly),
  });
}

export function useCreateEngineer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEngineerRequest) => engineersService.createEngineer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: engineersKeys.lists() });
    },
  });
}

export function useUpdateEngineer(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateEngineerRequest) => engineersService.updateEngineer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: engineersKeys.lists() });
    },
  });
}

export function useDeleteEngineer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => engineersService.deleteEngineer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: engineersKeys.lists() });
    },
  });
}
