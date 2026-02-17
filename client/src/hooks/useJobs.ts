import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as jobsService from '../services/jobs.service';
import type { JobFilters, CreateJobRequest, UpdateJobRequest, UpdateWorkflowStageRequest } from '../types';

// Query keys
export const jobsKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobsKeys.all, 'list'] as const,
  list: (filters?: JobFilters) => [...jobsKeys.lists(), filters] as const,
  details: () => [...jobsKeys.all, 'detail'] as const,
  detail: (id: number) => [...jobsKeys.details(), id] as const,
  analytics: () => [...jobsKeys.all, 'analytics'] as const,
};

// ============================================================================
// Jobs Hooks
// ============================================================================

export function useJobAnalytics() {
  return useQuery({
    queryKey: jobsKeys.analytics(),
    queryFn: () => jobsService.getJobAnalytics(),
  });
}

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: jobsKeys.list(filters),
    queryFn: () => jobsService.getJobs(filters),
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: jobsKeys.detail(id),
    queryFn: () => jobsService.getJobById(id),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJobRequest) => jobsService.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
    },
  });
}

export function useUpdateJob(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateJobRequest) => jobsService.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => jobsService.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
    },
  });
}

export function useUpdateWorkflowStage(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, data }: { stageId: number; data: UpdateWorkflowStageRequest }) =>
      jobsService.updateWorkflowStage(jobId, stageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobsKeys.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
    },
  });
}
