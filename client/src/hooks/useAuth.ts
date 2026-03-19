import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as authService from '../services/auth.service';
import type { CreateUserRequest, UpdateProfileRequest, AuditLogFilters } from '../../../shared/types';

const profileKeys = {
  all: ['profiles'] as const,
  list: () => [...profileKeys.all, 'list'] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  me: () => [...profileKeys.all, 'me'] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.list(),
    queryFn: authService.getProfiles,
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: () => authService.getProfileById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) => authService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.list() });
    },
  });
}

export function useUpdateProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => authService.updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.list() });
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(id) });
    },
  });
}

export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => authService.getAuditLog(filters),
  });
}
