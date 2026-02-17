import api from './api';
import type {
  RouteTemplate,
  RouteTemplateStep,
  CreateRouteTemplateRequest,
  UpdateRouteTemplateRequest,
  CreateRouteTemplateStepRequest,
  UpdateRouteTemplateStepRequest,
  TrackedPart,
  CreateTrackedPartRequest,
  BulkCreateTrackedPartsRequest,
  UpdateTrackedPartRequest,
  CheckInRequest,
  CheckOutRequest,
  TrackedPartsSummary,
  StationKiosk,
  CreateStationKioskRequest,
  UpdateStationKioskRequest,
  StationAuthRequest,
  StationAuthResponse,
  StationQueuePart,
} from '../../../shared/types';

// ============================================================================
// Route Templates API
// ============================================================================

export async function getRouteTemplates(): Promise<RouteTemplate[]> {
  const response = await api.get<RouteTemplate[]>('/route-templates');
  return response.data;
}

export async function getRouteTemplate(id: number): Promise<RouteTemplate> {
  const response = await api.get<RouteTemplate>(`/route-templates/${id}`);
  return response.data;
}

export async function createRouteTemplate(data: CreateRouteTemplateRequest): Promise<RouteTemplate> {
  const response = await api.post<RouteTemplate>('/route-templates', data);
  return response.data;
}

export async function updateRouteTemplate(id: number, data: UpdateRouteTemplateRequest): Promise<RouteTemplate> {
  const response = await api.put<RouteTemplate>(`/route-templates/${id}`, data);
  return response.data;
}

export async function deleteRouteTemplate(id: number): Promise<void> {
  await api.delete(`/route-templates/${id}`);
}

// Steps
export async function addRouteStep(templateId: number, data: CreateRouteTemplateStepRequest): Promise<RouteTemplateStep> {
  const response = await api.post<RouteTemplateStep>(`/route-templates/${templateId}/steps`, data);
  return response.data;
}

export async function updateRouteStep(templateId: number, stepId: number, data: UpdateRouteTemplateStepRequest): Promise<RouteTemplateStep> {
  const response = await api.put<RouteTemplateStep>(`/route-templates/${templateId}/steps/${stepId}`, data);
  return response.data;
}

export async function deleteRouteStep(templateId: number, stepId: number): Promise<void> {
  await api.delete(`/route-templates/${templateId}/steps/${stepId}`);
}

export async function reorderRouteSteps(templateId: number, stepIds: number[]): Promise<RouteTemplateStep[]> {
  const response = await api.put<RouteTemplateStep[]>(`/route-templates/${templateId}/steps/reorder`, { stepIds });
  return response.data;
}

// ============================================================================
// Tracked Parts API
// ============================================================================

export async function getTrackedParts(filters?: { jobId?: number; status?: string; search?: string; bomItemId?: number }): Promise<TrackedPart[]> {
  const params = new URLSearchParams();
  if (filters?.jobId) params.append('jobId', String(filters.jobId));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.bomItemId) params.append('bomItemId', String(filters.bomItemId));
  const response = await api.get<TrackedPart[]>(`/tracked-parts?${params.toString()}`);
  return response.data;
}

export async function getTrackedPart(id: number): Promise<TrackedPart> {
  const response = await api.get<TrackedPart>(`/tracked-parts/${id}`);
  return response.data;
}

export async function lookupByTrackingId(trackingId: string): Promise<TrackedPart[]> {
  const response = await api.get<TrackedPart[]>(`/tracked-parts/lookup/${encodeURIComponent(trackingId)}`);
  return response.data;
}

export async function createTrackedPart(jobId: number, data: CreateTrackedPartRequest): Promise<TrackedPart> {
  const response = await api.post<TrackedPart>(`/jobs/${jobId}/tracked-parts`, data);
  return response.data;
}

export async function bulkCreateTrackedParts(jobId: number, data: BulkCreateTrackedPartsRequest): Promise<{ message: string; parts: TrackedPart[] }> {
  const response = await api.post(`/jobs/${jobId}/tracked-parts/bulk`, data);
  return response.data;
}

export async function updateTrackedPart(id: number, data: UpdateTrackedPartRequest): Promise<TrackedPart> {
  const response = await api.put<TrackedPart>(`/tracked-parts/${id}`, data);
  return response.data;
}

export async function deleteTrackedPart(id: number): Promise<void> {
  await api.delete(`/tracked-parts/${id}`);
}

export async function getTrackedPartsSummary(jobId: number): Promise<TrackedPartsSummary> {
  const response = await api.get<TrackedPartsSummary>(`/jobs/${jobId}/tracked-parts/summary`);
  return response.data;
}

// Scrap + Recut
export async function scrapPart(id: number, scrapReason: string): Promise<TrackedPart> {
  const response = await api.put<TrackedPart>(`/tracked-parts/${id}`, { status: 'Scrapped', scrapReason });
  return response.data;
}

// Check-in/Check-out
export async function checkInPart(id: number, data: CheckInRequest): Promise<TrackedPart> {
  const response = await api.post<TrackedPart>(`/tracked-parts/${id}/check-in`, data);
  return response.data;
}

export async function checkOutPart(id: number, data: CheckOutRequest): Promise<TrackedPart> {
  const response = await api.post<TrackedPart>(`/tracked-parts/${id}/check-out`, data);
  return response.data;
}

// ============================================================================
// Station Queue API
// ============================================================================

export async function getStationQueue(stationName: string, jobId?: number, woId?: number): Promise<{ checkedIn: StationQueuePart[]; waiting: StationQueuePart[] }> {
  const searchParams = new URLSearchParams();
  if (woId) searchParams.append('woId', String(woId));
  else if (jobId) searchParams.append('jobId', String(jobId));
  const qs = searchParams.toString();
  const response = await api.get(`/tracked-parts/station/${encodeURIComponent(stationName)}${qs ? `?${qs}` : ''}`);
  return response.data;
}

// ============================================================================
// Station Kiosk API
// ============================================================================

export async function getStationKiosks(): Promise<StationKiosk[]> {
  const response = await api.get<StationKiosk[]>('/station-kiosks');
  return response.data;
}

export async function createStationKiosk(data: CreateStationKioskRequest): Promise<StationKiosk> {
  const response = await api.post<StationKiosk>('/station-kiosks', data);
  return response.data;
}

export async function updateStationKiosk(id: number, data: UpdateStationKioskRequest): Promise<StationKiosk> {
  const response = await api.put<StationKiosk>(`/station-kiosks/${id}`, data);
  return response.data;
}

export async function deleteStationKiosk(id: number): Promise<void> {
  await api.delete(`/station-kiosks/${id}`);
}

export async function authenticateStation(data: StationAuthRequest): Promise<StationAuthResponse> {
  const response = await api.post<StationAuthResponse>('/station-kiosks/auth', data);
  return response.data;
}
