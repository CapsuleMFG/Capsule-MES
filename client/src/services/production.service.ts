import type { WorkOrder, ProductionStatus, Machine, JobPriority } from '../../../shared/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Send a work order to the production pool
 */
export async function sendToProduction(
  jobId: number,
  woId: number,
  machineType: string
): Promise<WorkOrder> {
  const response = await fetch(
    `${API_BASE}/production/jobs/${jobId}/work-orders/${woId}/send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineType }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send work order to production');
  }

  return response.json();
}

/**
 * Get all work orders in the production pool
 */
export async function getProductionPool(): Promise<WorkOrder[]> {
  const response = await fetch(`${API_BASE}/production/pool`);

  if (!response.ok) {
    throw new Error('Failed to fetch production pool');
  }

  return response.json();
}

/**
 * Assign a work order to a specific machine
 */
export async function assignToMachine(woId: number, machineId: number): Promise<WorkOrder> {
  const response = await fetch(`${API_BASE}/production/work-orders/${woId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machineId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign work order to machine');
  }

  return response.json();
}

/**
 * Update production status of a work order
 */
export async function updateProductionStatus(
  woId: number,
  status: ProductionStatus
): Promise<WorkOrder> {
  const response = await fetch(`${API_BASE}/production/work-orders/${woId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update production status');
  }

  return response.json();
}

/**
 * Update production priority of a work order
 */
export async function updateProductionPriority(
  woId: number,
  priority: JobPriority
): Promise<WorkOrder> {
  const response = await fetch(`${API_BASE}/production/work-orders/${woId}/priority`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update production priority');
  }

  return response.json();
}

/**
 * Get all active machines
 */
export async function getMachines(): Promise<Machine[]> {
  const response = await fetch(`${API_BASE}/production/machines`);

  if (!response.ok) {
    throw new Error('Failed to fetch machines');
  }

  return response.json();
}
