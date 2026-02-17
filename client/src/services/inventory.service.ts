import api from './api';
import type {
  GlobalInventory,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  DemandDetailsResponse,
  MassOrderResponse,
} from '../types';

// ============================================================================
// Global Inventory API
// ============================================================================

export async function getInventoryItems(): Promise<GlobalInventory[]> {
  const response = await api.get<GlobalInventory[]>('/inventory');
  return response.data;
}

export async function getInventoryItem(id: number): Promise<GlobalInventory> {
  const response = await api.get<GlobalInventory>(`/inventory/${id}`);
  return response.data;
}

export async function createInventoryItem(data: CreateInventoryRequest): Promise<GlobalInventory> {
  const response = await api.post<GlobalInventory>('/inventory', data);
  return response.data;
}

export async function updateInventoryItem(
  id: number,
  data: UpdateInventoryRequest
): Promise<GlobalInventory> {
  const response = await api.put<GlobalInventory>(`/inventory/${id}`, data);
  return response.data;
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await api.delete(`/inventory/${id}`);
}

// ============================================================================
// Inventory Availability (with allocation tracking)
// ============================================================================

export interface AvailableInventoryItem extends GlobalInventory {
  availableQty: number;
}

export async function getAvailableInventory(): Promise<AvailableInventoryItem[]> {
  const response = await api.get<AvailableInventoryItem[]>('/inventory/available');
  return response.data;
}

// ============================================================================
// Demand & Mass Order
// ============================================================================

export async function getDemandDetails(id: number): Promise<DemandDetailsResponse> {
  const response = await api.get<DemandDetailsResponse>(`/inventory/${id}/demand-details`);
  return response.data;
}

export async function massOrder(id: number, orderQuantity: number): Promise<MassOrderResponse> {
  const response = await api.post<MassOrderResponse>(`/inventory/${id}/mass-order`, { orderQuantity });
  return response.data;
}
