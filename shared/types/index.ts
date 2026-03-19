// Shared TypeScript types for Capsule ERP

export type JobPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type JobStatus = 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
export type WorkflowStageStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
export type MaterialStatus = 'Needed' | 'Ordered' | 'Received' | 'Issued';
export type WorkOrderStatus = 'Draft' | 'Released' | 'Archived';
export type ProcurementStatus = 'Pending' | 'Ordered' | 'Partial' | 'Received';
export type EngineeringStatus = 'Not Started' | 'In Progress' | 'Completed';
export type ProductionStatus = 'Not Sent' | 'In Pool' | 'Assigned' | 'In Progress' | 'Completed' | 'Discarded';

export interface Client {
    id: number;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowStage {
    id: number;
    name: string;
    displayOrder: number;
    color: string;
    createdAt: string;
}

export interface Job {
    id: number;
    jobNumber: string;
    clientId: number;
    clientName?: string;
    priority?: JobPriority | null;
    status: JobStatus;
    description: string;
    targetStartDate?: string;
    targetEndDate?: string;
    startDate?: string;
    completedDate?: string;
    notes?: string;
    scPriority?: number | null;
    createdAt: string;
    updatedAt: string;
    workflowProgress?: JobWorkflowProgress[];
}

export interface JobWorkflowProgress {
    id: number;
    jobId: number;
    stageId: number;
    stageName?: string;
    stageColor?: string;
    stageOrder?: number;
    status: WorkflowStageStatus;
    startedAt?: string;
    completedAt?: string;
    assignee?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobMaterial {
    id: number;
    jobId: number;
    materialName: string;
    quantity: number;
    unit: string;
    status: MaterialStatus;
    cost?: number;
    supplier?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobLabor {
    id: number;
    jobId: number;
    stageId?: number;
    stageName?: string;
    employeeName: string;
    hours: number;
    date: string;
    notes?: string;
    createdAt: string;
}

export interface DashboardMetrics {
    activeJobs: number;
    criticalJobs: number;
    materialIssues: number;
    totalLaborHours: number;
    recentJobs: Job[];
    // Milestone-based job counts
    inProgressJobs: number;
    notStartedJobs: number;
}

// API Request/Response types
export interface Engineer {
    id: number;
    name: string;
    email?: string;
    active: boolean;
    createdAt: string;
}

export interface CreateEngineerRequest {
    name: string;
    email?: string;
}

export interface UpdateEngineerRequest {
    name?: string;
    email?: string;
    active?: boolean;
}

export interface CreateJobRequest {
    jobNumber: string;
    clientId: number;
    description: string;
    targetStartDate?: string;
    targetEndDate?: string;
    notes?: string;
    engineerId?: number;
}

export interface UpdateJobRequest {
    clientId?: number;
    priority?: JobPriority;
    status?: JobStatus;
    description?: string;
    targetStartDate?: string;
    targetEndDate?: string;
    startDate?: string;
    completedDate?: string;
    notes?: string;
}

export interface UpdateWorkflowStageRequest {
    status: WorkflowStageStatus;
    assignee?: string;
    notes?: string;
}

export interface CreateMaterialRequest {
    materialName: string;
    quantity: number;
    unit: string;
    status?: MaterialStatus;
    cost?: number;
    supplier?: string;
    notes?: string;
}

export interface UpdateMaterialRequest {
    materialName?: string;
    quantity?: number;
    unit?: string;
    status?: MaterialStatus;
    cost?: number;
    supplier?: string;
    notes?: string;
}

export interface CreateLaborRequest {
    stageId?: number;
    employeeName: string;
    hours: number;
    date: string;
    notes?: string;
}

export interface CreateClientRequest {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface UpdateClientRequest {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface JobFilters {
    status?: JobStatus;
    priority?: JobPriority;
    search?: string;
}

// ============================================================================
// ENGINEERING & SUPPLY CHAIN TYPES
// ============================================================================

export interface Supplier {
    id: number;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    paymentTerms?: string;
    leadTimeDays?: number;
    createdAt: string;
    updatedAt: string;
}

export interface WorkOrder {
    id: number;
    jobId: number;
    woNumber: string;
    status: WorkOrderStatus;
    description?: string;
    createdBy?: string;
    releasedDate?: string;
    notes?: string;
    machineType?: string;
    isRecut: boolean;
    productionStatus: ProductionStatus;
    productionPriority?: JobPriority; // Production manager can set priority independent of job priority
    assignedMachineId?: number;
    assignedMachineName?: string; // Joined from machines table
    sentToProductionAt?: string;
    assignedAt?: string;
    productionStartedAt?: string;
    productionCompletedAt?: string;
    createdAt: string;
    updatedAt: string;
    bomItems?: BomItem[];
}

export interface BomItem {
    id: number;
    jobId: number;
    partNumber: string;
    description?: string;
    quantity: number;
    unit: string;
    material?: string;
    thickness?: string;
    surfaceArea?: number;
    powdercoat?: string;
    routeTemplateId?: number;
    routeTemplateName?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export type PbomStatus = 'Ready' | 'In Progress' | 'Ordered' | 'Received';

export interface PbomItem {
    id: number;
    jobId: number;
    description: string;
    qtyRequired: number;
    mfrVendor?: string;
    mfrVendorPart?: string;
    category?: string;
    reqNumber?: string;
    poNumber?: string;
    notes?: string;
    status: PbomStatus;
    sentToSc: boolean;
    globalInventoryId?: number;
    qtyAllocated: number;
    qtyOrdered: number;
    qtyReceived: number;
    expectedReceiveDate?: string;
    inventoryItem?: {
        partNumber: string;
        description?: string;
        quantityOnHand: number;
        unit: string;
        unitCost?: number;
        availableQty: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreatePbomItemRequest {
    description: string;
    qtyRequired: number;
    mfrVendor?: string;
    mfrVendorPart?: string;
    category?: string;
    reqNumber?: string;
    poNumber?: string;
    notes?: string;
    status?: PbomStatus;
}

export interface UpdatePbomItemRequest {
    description?: string;
    qtyRequired?: number;
    mfrVendor?: string;
    mfrVendorPart?: string;
    category?: string;
    reqNumber?: string;
    poNumber?: string;
    notes?: string;
    status?: PbomStatus;
    globalInventoryId?: number | null;
    qtyAllocated?: number;
    qtyOrdered?: number;
    qtyReceived?: number;
    expectedReceiveDate?: string;
}

export interface PbomOrderItem extends PbomItem {
    jobNumber: string;
    jobDescription: string;
    clientName: string;
    priority: string;
}

export interface GlobalInventory {
    id: number;
    partNumber?: string;
    description?: string;
    quantityOnHand: number;
    unit: string;
    reorderLevel?: number;
    reorderQuantity?: number;
    unitCost?: number;
    supplierName?: string;
    lastRestockDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    totalAllocated?: number;
    availableQty?: number;
    totalDemand?: number;
}

export interface DemandDetailItem {
    id: number;
    jobId: number;
    jobNumber: string;
    jobDescription: string;
    description: string;
    qtyRequired: number;
    qtyAllocated: number;
    qtyToOrder: number;
    status: string;
}

export interface DemandDetailsResponse {
    inventoryItem: GlobalInventory;
    demandItems: DemandDetailItem[];
    totalDemand: number;
    needToOrder: number;
}

export interface MassOrderResponse {
    message: string;
    updatedCount: number;
    totalOrdered: number;
    purchaseOrderId?: number;
}

export type PurchaseOrderStatus = 'Ordered' | 'Partial' | 'Received';

export interface PurchaseOrder {
    id: number;
    poNumber?: string;
    inventoryId?: number;
    description: string;
    qtyOrdered: number;
    qtyReceived: number;
    status: PurchaseOrderStatus;
    expectedReceiveDate?: string;
    vendor?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    linkedJobs?: PurchaseOrderJob[];
}

export interface PurchaseOrderJob {
    jobId: number;
    jobNumber: string;
    clientName: string;
    pbomItemId: number;
    qtyOrdered: number;
    qtyReceived: number;
}

export interface UpdatePurchaseOrderRequest {
    poNumber?: string;
    expectedReceiveDate?: string;
    vendor?: string;
    notes?: string;
}

export interface ReceivePurchaseOrderRequest {
    qtyReceived: number;
}

export interface ScPriorityItem {
    jobId: number;
    priority: number;
}

export interface UpdateScPrioritiesRequest {
    priorities: ScPriorityItem[];
}

export interface UpdateScPrioritiesResponse {
    message: string;
    reallocationSummary: {
        inventoryItemsProcessed: number;
        pbomItemsReallocated: number;
    };
}

export interface JobProcurement {
    id: number;
    jobId: number;
    bomItemId?: number;
    globalInventoryId?: number;
    quantityNeeded: number;
    quantityAllocated: number;
    quantityReceived: number;
    status: ProcurementStatus;
    poNumber?: string;
    supplierName?: string;
    expectedDeliveryDate?: string;
    actualDeliveryDate?: string;
    cost?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    bomItem?: BomItem;
    inventoryItem?: GlobalInventory;
}

export interface JobEngineering {
    id: number;
    jobId: number;
    status: EngineeringStatus;
    assignee?: string;
    startedAt?: string;
    completedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// API Request types
export interface CreateSupplierRequest {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    paymentTerms?: string;
    leadTimeDays?: number;
}

export interface UpdateSupplierRequest {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    paymentTerms?: string;
    leadTimeDays?: number;
}

export interface CreateWorkOrderRequest {
    description?: string;
    createdBy?: string;
    notes?: string;
    isRecut?: boolean;
}

export interface UpdateWorkOrderRequest {
    status?: WorkOrderStatus;
    description?: string;
    createdBy?: string;
    releasedDate?: string;
    notes?: string;
}

export interface CreateBomItemRequest {
    partNumber: string;
    description?: string;
    quantity: number;
    unit?: string;
    material?: string;
    thickness?: string;
    surfaceArea?: number;
    powdercoat?: string;
    routeTemplateId?: number;
    notes?: string;
}

export interface UpdateBomItemRequest {
    partNumber?: string;
    description?: string;
    quantity?: number;
    unit?: string;
    material?: string;
    thickness?: string;
    surfaceArea?: number;
    powdercoat?: string;
    routeTemplateId?: number | null;
    notes?: string;
}

export interface CreateInventoryRequest {
    partNumber?: string;
    description?: string;
    quantityOnHand?: number;
    unit?: string;
    reorderLevel?: number;
    reorderQuantity?: number;
    unitCost?: number;
    supplierName?: string;
    notes?: string;
}

export interface UpdateInventoryRequest {
    partNumber?: string;
    description?: string;
    quantityOnHand?: number;
    unit?: string;
    reorderLevel?: number;
    reorderQuantity?: number;
    unitCost?: number;
    supplierName?: string;
    lastRestockDate?: string;
    notes?: string;
}

export interface CreateProcurementRequest {
    bomItemId?: number;
    quantityNeeded: number;
    supplierName?: string;
    expectedDeliveryDate?: string;
    cost?: number;
    notes?: string;
}

export interface UpdateProcurementRequest {
    quantityNeeded?: number;
    quantityAllocated?: number;
    quantityReceived?: number;
    status?: ProcurementStatus;
    poNumber?: string;
    supplierName?: string;
    expectedDeliveryDate?: string;
    actualDeliveryDate?: string;
    cost?: number;
    notes?: string;
}

export interface UpdateEngineeringRequest {
    status?: EngineeringStatus;
    assignee?: string;
    startedAt?: string;
    completedAt?: string;
    notes?: string;
}

// ============================================================================
// DESIGN MILESTONES TYPES
// ============================================================================

export type DesignMilestoneStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface DesignMilestone {
    id: number;
    jobId: number;
    milestoneName: string;
    status: DesignMilestoneStatus;
    targetDate?: string;
    completedDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDesignMilestoneRequest {
    milestoneName: string;
    targetDate?: string;
}

export interface UpdateDesignMilestoneRequest {
    milestoneName?: string;
    status?: DesignMilestoneStatus;
    targetDate?: string;
    completedDate?: string;
    notes?: string;
}

// ============================================================================
// WORK ORDER FILES TYPES
// ============================================================================

export interface WorkOrderFile {
    id: number;
    workOrderId: number;
    jobId: number;
    filename: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
    uploadedBy?: string;
    createdAt: string;
}

// ============================================================================
// BOM IMPORT TYPES
// ============================================================================

export interface BomImport {
    id: number;
    jobId: number;
    workOrderId: number;
    filename: string;
    itemsImported: number;
    importedBy?: string;
    createdAt: string;
}

export interface BomImportResponse {
    message: string;
    itemsImported: number;
    items: BomItem[];
}

// Machines
export interface Machine {
    id: number;
    name: string;
    type?: string;
    active: boolean;
    displayOrder: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMachineRequest {
    name: string;
    type?: string;
    active?: boolean;
    displayOrder?: number;
    notes?: string;
}

export interface UpdateMachineRequest {
    name?: string;
    type?: string;
    active?: boolean;
    displayOrder?: number;
    notes?: string;
}

// ============================================================================
// PARTS TRACKING TYPES
// ============================================================================

export type IdentificationType = 'QR' | 'Engraved' | 'Sticker' | 'Other';
export type TrackedPartStatus = 'Pending' | 'In Progress' | 'Completed' | 'Scrapped' | 'On Hold';
export type QualityStatus = 'Pass' | 'Fail' | 'Pending';

export interface RouteTemplate {
    id: number;
    name: string;
    description?: string;
    stepCount?: number;
    createdAt: string;
    updatedAt: string;
    steps?: RouteTemplateStep[];
}

export interface RouteTemplateStep {
    id: number;
    routeTemplateId: number;
    stepOrder: number;
    stationName: string;
    machineId?: number;
    machineName?: string;
    estimatedMinutes?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TrackedPart {
    id: number;
    jobId: number;
    jobNumber?: string;
    bomItemId?: number;
    workOrderId?: number;
    trackingId?: string;
    identificationType: IdentificationType;
    routeTemplateId?: number;
    routeTemplateName?: string;
    currentStepId?: number;
    currentStationName?: string;
    status: TrackedPartStatus;
    partNumber?: string;
    description?: string;
    serialNumber?: number;
    scrapReason?: string;
    scrappedAt?: string;
    recutFromId?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    stationLogs?: PartStationLog[];
}

export interface PartStationLog {
    id: number;
    trackedPartId: number;
    routeStepId: number;
    stationName?: string;
    stepOrder?: number;
    operatorName?: string;
    checkedInAt: string;
    checkedOutAt?: string;
    timeSpentMinutes?: number;
    qualityStatus: QualityStatus;
    notes?: string;
    createdAt: string;
}

// Route Template Requests
export interface CreateRouteTemplateRequest {
    name: string;
    description?: string;
    steps?: CreateRouteTemplateStepRequest[];
}

export interface UpdateRouteTemplateRequest {
    name?: string;
    description?: string;
}

export interface CreateRouteTemplateStepRequest {
    stepOrder: number;
    stationName: string;
    machineId?: number;
    estimatedMinutes?: number;
    notes?: string;
}

export interface UpdateRouteTemplateStepRequest {
    stationName?: string;
    machineId?: number;
    estimatedMinutes?: number;
    notes?: string;
}

export interface ReorderStepsRequest {
    stepIds: number[];
}

// Tracked Part Requests
export interface CreateTrackedPartRequest {
    bomItemId?: number;
    workOrderId?: number;
    trackingId?: string;
    identificationType?: IdentificationType;
    routeTemplateId?: number;
    partNumber?: string;
    description?: string;
    serialNumber?: number;
    notes?: string;
}

export interface BulkCreateTrackedPartsRequest {
    bomItemId?: number;
    workOrderId?: number;
    quantity: number;
    routeTemplateId?: number;
    identificationType?: IdentificationType;
    trackingIdPrefix?: string;
    partNumber?: string;
    description?: string;
    recutFromIds?: number[];
}

export interface UpdateTrackedPartRequest {
    trackingId?: string;
    identificationType?: IdentificationType;
    routeTemplateId?: number;
    status?: TrackedPartStatus;
    partNumber?: string;
    description?: string;
    scrapReason?: string;
    notes?: string;
}

// Station Check-in/Check-out Requests
export interface CheckInRequest {
    operatorName: string;
    notes?: string;
}

export interface CheckOutRequest {
    operatorName?: string;
    qualityStatus: QualityStatus;
    notes?: string;
    timeSpentMinutes?: number;
}

export interface TrackedPartsSummary {
    total: number;
    byStatus: Record<TrackedPartStatus, number>;
    byStation: { stationName: string; count: number }[];
}

// ============================================================================
// STATION KIOSK TYPES
// ============================================================================

export interface StationKiosk {
    id: number;
    stationName: string;
    pinCode: string;
    machineId?: number;
    machineName?: string;
    isActive: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStationKioskRequest {
    stationName: string;
    pinCode: string;
    machineId?: number;
    isActive?: boolean;
    notes?: string;
}

export interface UpdateStationKioskRequest {
    stationName?: string;
    pinCode?: string;
    machineId?: number | null;
    isActive?: boolean;
    notes?: string;
}

export interface StationAuthRequest {
    pinCode: string;
}

export interface StationAuthResponse {
    stationName: string;
    kioskId: number;
}

export interface StationQueuePart extends TrackedPart {
    queueStatus: 'checked_in' | 'waiting';
    checkedInAt?: string;
    operatorName?: string;
    timeElapsedMinutes?: number;
}

// ============================================================
// AUTH & PROFILES
// ============================================================

export type UserRole = 'admin' | 'manager' | 'engineer' | 'operator';

export interface Profile {
  id: string;         // UUID from auth.users
  email: string;      // From auth.users, joined at query time
  name: string;
  role: UserRole;
  pin: string | null;  // Always masked in API responses
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  pin?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  role?: UserRole;
  pin?: string;
  isActive?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuditLogEntry {
  id: number;
  userId: string | null;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  tableName?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================
// PRODUCTION DASHBOARD
// ============================================================

export type MachineStatus = 'running' | 'idle' | 'down';

export interface ProductionDashboardData {
  kpis: {
    activeJobs: number;
    partsCompletedToday: number;
    onTimeRate: number;
    blockedJobs: number;
  };
  machines: DashboardMachine[];
  jobQueue: DashboardJob[];
  bottlenecks: Bottleneck[];
}

export interface DashboardMachine {
  id: number;
  name: string;
  type: string;
  status: MachineStatus;
  currentJob: { id: number; jobNumber: string; description: string } | null;
  currentOperator: string | null;
  currentPart: { description: string; completed: number; total: number } | null;
  nextJob: { id: number; jobNumber: string } | null;
  downReason: string | null;
  downSince: string | null;
}

export interface DashboardJob {
  id: number;
  jobNumber: string;
  clientName: string;
  description: string;
  priority: string;
  currentStage: string;
  stageStatus: string;
  targetEndDate: string | null;
}

export interface Bottleneck {
  type: 'machine_down' | 'job_blocked' | 'job_overdue';
  message: string;
  severity: 'critical' | 'warning';
  relatedId: number;
}

// ============================================================
// REPORTS
// ============================================================

export interface KpiReport {
  jobsCompleted: number;
  avgCycleTimeDays: number;
  onTimeRate: number;
  scrapRate: number;
  totalLaborHours: number;
  laborByStage: Record<string, number>;
}

export interface ReportFilters {
  from?: string;
  to?: string;
}
