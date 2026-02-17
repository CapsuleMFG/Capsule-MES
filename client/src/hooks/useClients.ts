import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as jobsService from '../services/jobs.service';
import type { CreateClientRequest, UpdateClientRequest } from '../types';

// Query keys
export const clientsKeys = {
  all: ['clients'] as const,
  lists: () => [...clientsKeys.all, 'list'] as const,
  list: () => [...clientsKeys.lists()] as const,
};

// ============================================================================
// Clients Hooks
// ============================================================================

export function useClients() {
  return useQuery({
    queryKey: clientsKeys.list(),
    queryFn: () => jobsService.getClients(),
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientRequest) => jobsService.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
    },
  });
}

export function useUpdateClient(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateClientRequest) => jobsService.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => jobsService.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.lists() });
    },
  });
}
