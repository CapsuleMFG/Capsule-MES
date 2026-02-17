import api from './api';
import type {
    DesignMilestone,
    CreateDesignMilestoneRequest,
    UpdateDesignMilestoneRequest,
    WorkOrderFile,
    BomImportResponse,
    BomImport,
    BomItem,
    CreateBomItemRequest,
    UpdateBomItemRequest,
    PbomItem,
    PbomOrderItem,
    CreatePbomItemRequest,
    UpdatePbomItemRequest,
    Machine,
    CreateMachineRequest,
    UpdateMachineRequest
} from '../types';

// ============================================================================
// Design Milestones API
// ============================================================================

export async function getDesignMilestones(jobId: number): Promise<DesignMilestone[]> {
    const response = await api.get(`/jobs/${jobId}/design-milestones`);
    return response.data;
}

export async function updateDesignMilestone(
    jobId: number,
    milestoneId: number,
    data: UpdateDesignMilestoneRequest
): Promise<DesignMilestone> {
    const response = await api.put(`/jobs/${jobId}/design-milestones/${milestoneId}`, data);
    return response.data;
}

export async function createSingleMilestone(
    jobId: number,
    data: CreateDesignMilestoneRequest
): Promise<DesignMilestone> {
    const response = await api.post(`/jobs/${jobId}/design-milestones/single`, data);
    return response.data;
}

export async function deleteDesignMilestone(jobId: number, milestoneId: number): Promise<void> {
    await api.delete(`/jobs/${jobId}/design-milestones/${milestoneId}`);
}

// ============================================================================
// BOM Import API
// ============================================================================

export async function importBom(
    jobId: number,
    file: File
): Promise<BomImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
        `/jobs/${jobId}/bom/import`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
}

export async function getBomImportHistory(
    jobId: number
): Promise<BomImport[]> {
    const response = await api.get(`/jobs/${jobId}/bom/imports`);
    return response.data;
}

// ============================================================================
// Work Order Files API
// ============================================================================

export async function uploadWorkOrderFile(
    jobId: number,
    workOrderId: number,
    file: File,
    uploadedBy?: string
): Promise<{ message: string; file: WorkOrderFile }> {
    const formData = new FormData();
    formData.append('file', file);
    if (uploadedBy) {
        formData.append('uploadedBy', uploadedBy);
    }

    const response = await api.post(
        `/jobs/${jobId}/work-orders/${workOrderId}/files`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
}

export async function getWorkOrderFiles(
    jobId: number,
    workOrderId: number
): Promise<WorkOrderFile[]> {
    const response = await api.get(`/jobs/${jobId}/work-orders/${workOrderId}/files`);
    return response.data;
}

export async function downloadWorkOrderFile(
    jobId: number,
    workOrderId: number,
    fileId: number
): Promise<Blob> {
    const response = await api.get(
        `/jobs/${jobId}/work-orders/${workOrderId}/files/${fileId}/download`,
        {
            responseType: 'blob',
        }
    );
    return response.data;
}

export async function deleteWorkOrderFile(
    jobId: number,
    workOrderId: number,
    fileId: number
): Promise<void> {
    await api.delete(`/jobs/${jobId}/work-orders/${workOrderId}/files/${fileId}`);
}

// ============================================================================
// BOM Items API
// ============================================================================

export async function getBomItems(jobId: number): Promise<BomItem[]> {
    const response = await api.get(`/jobs/${jobId}/bom`);
    return response.data;
}

export async function createBomItem(
    jobId: number,
    data: CreateBomItemRequest
): Promise<BomItem> {
    const response = await api.post(`/jobs/${jobId}/bom`, data);
    return response.data;
}

export async function updateBomItem(
    jobId: number,
    bomId: number,
    data: UpdateBomItemRequest
): Promise<BomItem> {
    const response = await api.put(`/jobs/${jobId}/bom/${bomId}`, data);
    return response.data;
}

export async function deleteBomItem(jobId: number, bomId: number): Promise<void> {
    await api.delete(`/jobs/${jobId}/bom/${bomId}`);
}

export async function deleteAllBomItems(jobId: number): Promise<{ deleted: number }> {
    const response = await api.delete(`/jobs/${jobId}/bom`);
    return response.data;
}

// ============================================================================
// Work Order PDF Parser API
// ============================================================================

export interface PdfPartMatch {
    pdfPartName: string;
    pdfQuantity: number;
    bomItemId: number | null;
    bomPartNumber: string | null;
    bomDescription: string | null;
    bomQuantity: number | null;
    matched: boolean;
    scrappedPartIds?: number[];
}

export interface ParsePdfResponse {
    message: string;
    parsedParts: { name: string; requested: number }[];
    matches: PdfPartMatch[];
    rawTextPreview?: string;
    isRecut?: boolean;
}

export async function parseWorkOrderPdf(jobId: number, woId: number): Promise<ParsePdfResponse> {
    const response = await api.post(`/jobs/${jobId}/work-orders/${woId}/parse-pdf`);
    return response.data;
}

export async function exportBomToCsv(jobId: number): Promise<Blob> {
    const response = await api.get(`/jobs/${jobId}/bom/export`, {
        responseType: 'blob',
    });
    return response.data;
}

// ============================================================================
// PBOM (Production BOM) API
// ============================================================================

export async function getPbomItems(jobId: number): Promise<PbomItem[]> {
    const response = await api.get(`/jobs/${jobId}/pbom`);
    return response.data;
}

export async function createPbomItem(
    jobId: number,
    data: CreatePbomItemRequest
): Promise<PbomItem> {
    const response = await api.post(`/jobs/${jobId}/pbom`, data);
    return response.data;
}

export async function updatePbomItem(
    jobId: number,
    pbomId: number,
    data: UpdatePbomItemRequest
): Promise<PbomItem> {
    const response = await api.put(`/jobs/${jobId}/pbom/${pbomId}`, data);
    return response.data;
}

export async function deletePbomItem(jobId: number, pbomId: number): Promise<void> {
    await api.delete(`/jobs/${jobId}/pbom/${pbomId}`);
}

export async function deleteAllPbomItems(jobId: number): Promise<{ deleted: number }> {
    const response = await api.delete(`/jobs/${jobId}/pbom`);
    return response.data;
}

export async function sendPbomToSupplyChain(jobId: number): Promise<{ message: string; itemCount: number; items: PbomItem[] }> {
    const response = await api.post(`/jobs/${jobId}/pbom/send-to-sc`);
    return response.data;
}

export async function importPbom(
    jobId: number,
    file: File
): Promise<{ message: string; itemsImported: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(
        `/jobs/${jobId}/pbom/import`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
}

export async function autoMatchPbom(jobId: number): Promise<{ message: string; matchedCount: number }> {
    const response = await api.post(`/jobs/${jobId}/pbom/auto-match`);
    return response.data;
}

export async function reallocatePbom(jobId: number): Promise<{ message: string; reallocatedCount: number }> {
    const response = await api.post(`/jobs/${jobId}/pbom/reallocate`);
    return response.data;
}

export async function getAllOrderedPbomItems(): Promise<PbomOrderItem[]> {
    const response = await api.get('/pbom/orders');
    return response.data;
}

// Machines API
export const getMachines = async (active?: boolean): Promise<Machine[]> => {
    const params = active !== undefined ? { active: active.toString() } : {};
    const response = await api.get('/machines', { params });
    return response.data;
}

export const createMachine = async (data: CreateMachineRequest): Promise<Machine> => {
    const response = await api.post('/machines', data);
    return response.data;
}

export const updateMachine = async (id: number, data: UpdateMachineRequest): Promise<Machine> => {
    const response = await api.put(`/machines/${id}`, data);
    return response.data;
}

export const deleteMachine = async (id: number): Promise<void> => {
    await api.delete(`/machines/${id}`);
}
