import api from './api';
import type {
  Job,
  JobFilters,
  CreateJobRequest,
  UpdateJobRequest,
  JobWorkflowProgress,
  UpdateWorkflowStageRequest,
  JobMaterial,
  CreateMaterialRequest,
  UpdateMaterialRequest,
  JobLabor,
  CreateLaborRequest,
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  DashboardMetrics,
  WorkflowStage,
  WorkOrder,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  BomItem,
  CreateBomItemRequest,
  UpdateBomItemRequest,
  JobProcurement,
  CreateProcurementRequest,
  UpdateProcurementRequest,
  JobEngineering,
  UpdateEngineeringRequest,
} from '../types';

// ============================================================================
// Jobs API
// ============================================================================

export interface JobAnalytics {
  pipeline: { stageName: string; color: string; displayOrder: number; count: number }[];
  schedule: { onTrack: number; atRisk: number; overdue: number };
  financial: { totalMaterialCost: number; totalLaborHours: number; avgCostPerJob: number };
}

export async function getJobAnalytics(): Promise<JobAnalytics> {
  const response = await api.get<JobAnalytics>('/jobs/analytics');
  return response.data;
}

export async function getJobs(filters?: JobFilters): Promise<Job[]> {
  const params = new URLSearchParams();

  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.search) params.append('search', filters.search);

  const response = await api.get<Job[]>(`/jobs?${params.toString()}`);
  return response.data;
}

export async function getJobById(id: number): Promise<Job> {
  const response = await api.get<Job>(`/jobs/${id}`);
  return response.data;
}

export async function createJob(data: CreateJobRequest): Promise<Job> {
  const response = await api.post<Job>('/jobs', data);
  return response.data;
}

export async function updateJob(id: number, data: UpdateJobRequest): Promise<Job> {
  const response = await api.put<Job>(`/jobs/${id}`, data);
  return response.data;
}

export async function deleteJob(id: number): Promise<void> {
  await api.delete(`/jobs/${id}`);
}

// ============================================================================
// Workflow API
// ============================================================================

export async function getJobWorkflow(jobId: number): Promise<JobWorkflowProgress[]> {
  const response = await api.get<JobWorkflowProgress[]>(`/jobs/${jobId}/workflow`);
  return response.data;
}

export async function updateWorkflowStage(
  jobId: number,
  stageId: number,
  data: UpdateWorkflowStageRequest
): Promise<JobWorkflowProgress> {
  const response = await api.put<JobWorkflowProgress>(`/jobs/${jobId}/workflow/${stageId}`, data);
  return response.data;
}

export async function getWorkflowStages(): Promise<WorkflowStage[]> {
  const response = await api.get<WorkflowStage[]>('/workflow/stages');
  return response.data;
}

// ============================================================================
// Materials API
// ============================================================================

export async function getJobMaterials(jobId: number): Promise<JobMaterial[]> {
  const response = await api.get<JobMaterial[]>(`/jobs/${jobId}/materials`);
  return response.data;
}

export async function createMaterial(jobId: number, data: CreateMaterialRequest): Promise<JobMaterial> {
  const response = await api.post<JobMaterial>(`/jobs/${jobId}/materials`, data);
  return response.data;
}

export async function updateMaterial(
  jobId: number,
  materialId: number,
  data: UpdateMaterialRequest
): Promise<JobMaterial> {
  const response = await api.put<JobMaterial>(`/jobs/${jobId}/materials/${materialId}`, data);
  return response.data;
}

export async function deleteMaterial(jobId: number, materialId: number): Promise<void> {
  await api.delete(`/jobs/${jobId}/materials/${materialId}`);
}

// ============================================================================
// Labor API
// ============================================================================

export async function getJobLabor(jobId: number): Promise<JobLabor[]> {
  const response = await api.get<JobLabor[]>(`/jobs/${jobId}/labor`);
  return response.data;
}

export async function createLabor(jobId: number, data: CreateLaborRequest): Promise<JobLabor> {
  const response = await api.post<JobLabor>(`/jobs/${jobId}/labor`, data);
  return response.data;
}

export async function deleteLabor(jobId: number, laborId: number): Promise<void> {
  await api.delete(`/jobs/${jobId}/labor/${laborId}`);
}

// ============================================================================
// Clients API
// ============================================================================

export async function getClients(): Promise<Client[]> {
  const response = await api.get<Client[]>('/clients');
  return response.data;
}

export async function createClient(data: CreateClientRequest): Promise<Client> {
  const response = await api.post<Client>('/clients', data);
  return response.data;
}

export async function updateClient(id: number, data: UpdateClientRequest): Promise<Client> {
  const response = await api.put<Client>(`/clients/${id}`, data);
  return response.data;
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}`);
}

// ============================================================================
// Dashboard API
// ============================================================================

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await api.get<DashboardMetrics>('/dashboard/metrics');
  return response.data;
}

// ============================================================================
// Engineering API
// ============================================================================

export async function getEngineeringStatus(jobId: number): Promise<JobEngineering> {
  const response = await api.get<JobEngineering>(`/jobs/${jobId}/engineering`);
  return response.data;
}

export async function updateEngineeringStatus(
  jobId: number,
  data: UpdateEngineeringRequest
): Promise<JobEngineering> {
  const response = await api.put<JobEngineering>(`/jobs/${jobId}/engineering`, data);
  return response.data;
}

// ============================================================================
// Work Orders API
// ============================================================================

export async function getWorkOrders(jobId: number): Promise<WorkOrder[]> {
  const response = await api.get<WorkOrder[]>(`/jobs/${jobId}/work-orders`);
  return response.data;
}

export async function getWorkOrder(jobId: number, woId: number): Promise<WorkOrder> {
  const response = await api.get<WorkOrder>(`/jobs/${jobId}/work-orders/${woId}`);
  return response.data;
}

export async function createWorkOrder(
  jobId: number,
  data: CreateWorkOrderRequest
): Promise<WorkOrder> {
  const response = await api.post<WorkOrder>(`/jobs/${jobId}/work-orders`, data);
  return response.data;
}

export async function updateWorkOrder(
  jobId: number,
  woId: number,
  data: UpdateWorkOrderRequest
): Promise<WorkOrder> {
  const response = await api.put<WorkOrder>(`/jobs/${jobId}/work-orders/${woId}`, data);
  return response.data;
}

export async function deleteWorkOrder(jobId: number, woId: number): Promise<void> {
  await api.delete(`/jobs/${jobId}/work-orders/${woId}`);
}

// ============================================================================
// BOM Items API
// ============================================================================

export async function getBomItems(jobId: number, woId: number): Promise<BomItem[]> {
  const response = await api.get<BomItem[]>(`/jobs/${jobId}/work-orders/${woId}/bom`);
  return response.data;
}

export async function createBomItem(
  jobId: number,
  woId: number,
  data: CreateBomItemRequest
): Promise<BomItem> {
  const response = await api.post<BomItem>(`/jobs/${jobId}/work-orders/${woId}/bom`, data);
  return response.data;
}

export async function updateBomItem(
  jobId: number,
  woId: number,
  bomId: number,
  data: UpdateBomItemRequest
): Promise<BomItem> {
  const response = await api.put<BomItem>(
    `/jobs/${jobId}/work-orders/${woId}/bom/${bomId}`,
    data
  );
  return response.data;
}

export async function deleteBomItem(jobId: number, woId: number, bomId: number): Promise<void> {
  await api.delete(`/jobs/${jobId}/work-orders/${woId}/bom/${bomId}`);
}

// ============================================================================
// Procurement API
// ============================================================================

export async function getProcurementItems(jobId: number): Promise<JobProcurement[]> {
  const response = await api.get<JobProcurement[]>(`/jobs/${jobId}/procurement`);
  return response.data;
}

export async function createProcurementItem(
  jobId: number,
  data: CreateProcurementRequest
): Promise<JobProcurement> {
  const response = await api.post<JobProcurement>(`/jobs/${jobId}/procurement`, data);
  return response.data;
}

export async function updateProcurementItem(
  jobId: number,
  procId: number,
  data: UpdateProcurementRequest
): Promise<JobProcurement> {
  const response = await api.put<JobProcurement>(
    `/jobs/${jobId}/procurement/${procId}`,
    data
  );
  return response.data;
}

export async function deleteProcurementItem(jobId: number, procId: number): Promise<void> {
  await api.delete(`/jobs/${jobId}/procurement/${procId}`);
}
