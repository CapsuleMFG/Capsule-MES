import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as partsService from '../services/parts-tracking.service';
import type {
  CreateRouteTemplateRequest,
  UpdateRouteTemplateRequest,
  CreateRouteTemplateStepRequest,
  UpdateRouteTemplateStepRequest,
  CreateTrackedPartRequest,
  BulkCreateTrackedPartsRequest,
  UpdateTrackedPartRequest,
  CheckInRequest,
  CheckOutRequest,
  CreateStationKioskRequest,
  UpdateStationKioskRequest,
} from '../../../shared/types';

// ============================================================================
// Query Keys
// ============================================================================

export const routeTemplateKeys = {
  all: ['routeTemplates'] as const,
  lists: () => [...routeTemplateKeys.all, 'list'] as const,
  details: () => [...routeTemplateKeys.all, 'detail'] as const,
  detail: (id: number) => [...routeTemplateKeys.details(), id] as const,
};

export const trackedPartKeys = {
  all: ['trackedParts'] as const,
  lists: () => [...trackedPartKeys.all, 'list'] as const,
  list: (filters?: any) => [...trackedPartKeys.lists(), filters] as const,
  details: () => [...trackedPartKeys.all, 'detail'] as const,
  detail: (id: number) => [...trackedPartKeys.details(), id] as const,
  summaries: () => [...trackedPartKeys.all, 'summary'] as const,
  summary: (jobId: number) => [...trackedPartKeys.summaries(), jobId] as const,
};

// ============================================================================
// Route Template Hooks
// ============================================================================

export function useRouteTemplates() {
  return useQuery({
    queryKey: routeTemplateKeys.lists(),
    queryFn: () => partsService.getRouteTemplates(),
  });
}

export function useRouteTemplate(id: number) {
  return useQuery({
    queryKey: routeTemplateKeys.detail(id),
    queryFn: () => partsService.getRouteTemplate(id),
    enabled: !!id,
  });
}

export function useCreateRouteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRouteTemplateRequest) => partsService.createRouteTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.lists() });
    },
  });
}

export function useUpdateRouteTemplate(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRouteTemplateRequest) => partsService.updateRouteTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.lists() });
    },
  });
}

export function useDeleteRouteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => partsService.deleteRouteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.lists() });
    },
  });
}

export function useAddRouteStep(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRouteTemplateStepRequest) => partsService.addRouteStep(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.lists() });
    },
  });
}

export function useUpdateRouteStep(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, data }: { stepId: number; data: UpdateRouteTemplateStepRequest }) =>
      partsService.updateRouteStep(templateId, stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.detail(templateId) });
    },
  });
}

export function useDeleteRouteStep(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepId: number) => partsService.deleteRouteStep(templateId, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.lists() });
    },
  });
}

export function useReorderRouteSteps(templateId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stepIds: number[]) => partsService.reorderRouteSteps(templateId, stepIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routeTemplateKeys.detail(templateId) });
    },
  });
}

// ============================================================================
// Tracked Part Hooks
// ============================================================================

export function useTrackedParts(filters?: { jobId?: number; status?: string; search?: string; bomItemId?: number }) {
  return useQuery({
    queryKey: trackedPartKeys.list(filters),
    queryFn: () => partsService.getTrackedParts(filters),
  });
}

export function useTrackedPart(id: number) {
  return useQuery({
    queryKey: trackedPartKeys.detail(id),
    queryFn: () => partsService.getTrackedPart(id),
    enabled: !!id,
  });
}

export function useLookupByTrackingId() {
  return useMutation({
    mutationFn: (trackingId: string) => partsService.lookupByTrackingId(trackingId),
  });
}

export function useCreateTrackedPart(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTrackedPartRequest) => partsService.createTrackedPart(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.summary(jobId) });
    },
  });
}

export function useBulkCreateTrackedParts(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkCreateTrackedPartsRequest) => partsService.bulkCreateTrackedParts(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.summary(jobId) });
    },
  });
}

export function useUpdateTrackedPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTrackedPartRequest }) => partsService.updateTrackedPart(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.lists() });
    },
  });
}

export function useDeleteTrackedPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => partsService.deleteTrackedPart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.summaries() });
    },
  });
}

export function useTrackedPartsSummary(jobId: number) {
  return useQuery({
    queryKey: trackedPartKeys.summary(jobId),
    queryFn: () => partsService.getTrackedPartsSummary(jobId),
    enabled: !!jobId,
  });
}

export function useScrapPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scrapReason }: { id: number; scrapReason: string }) => partsService.scrapPart(id, scrapReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.summaries() });
    },
  });
}

// Station queue keys (defined early so check-in/check-out can reference them)
export const stationQueueKeys = {
  all: ['stationQueue'] as const,
  station: (name: string) => [...stationQueueKeys.all, name] as const,
};

export function useCheckInPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CheckInRequest }) => partsService.checkInPart(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.summaries() });
      queryClient.invalidateQueries({ queryKey: stationQueueKeys.all });
    },
  });
}

export function useCheckOutPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CheckOutRequest }) => partsService.checkOutPart(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trackedPartKeys.summaries() });
      queryClient.invalidateQueries({ queryKey: stationQueueKeys.all });
    },
  });
}

// ============================================================================
// Station Queue Hooks
// ============================================================================

export function useStationQueue(stationName: string, jobId?: number, woId?: number) {
  return useQuery({
    queryKey: [...stationQueueKeys.station(stationName), jobId, woId] as const,
    queryFn: () => partsService.getStationQueue(stationName, jobId, woId),
    enabled: !!stationName,
    refetchInterval: 30000,
  });
}

// ============================================================================
// Station Kiosk Hooks
// ============================================================================

export const stationKioskKeys = {
  all: ['stationKiosks'] as const,
  lists: () => [...stationKioskKeys.all, 'list'] as const,
};

export function useStationKiosks() {
  return useQuery({
    queryKey: stationKioskKeys.lists(),
    queryFn: () => partsService.getStationKiosks(),
  });
}

export function useCreateStationKiosk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStationKioskRequest) => partsService.createStationKiosk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKioskKeys.lists() });
    },
  });
}

export function useUpdateStationKiosk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateStationKioskRequest }) => partsService.updateStationKiosk(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKioskKeys.lists() });
    },
  });
}

export function useDeleteStationKiosk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => partsService.deleteStationKiosk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationKioskKeys.lists() });
    },
  });
}
