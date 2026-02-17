import api from './api';
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from '../types';

// ============================================================================
// Suppliers API
// ============================================================================

export async function getSuppliers(): Promise<Supplier[]> {
  const response = await api.get<Supplier[]>('/suppliers');
  return response.data;
}

export async function getSupplier(id: number): Promise<Supplier> {
  const response = await api.get<Supplier>(`/suppliers/${id}`);
  return response.data;
}

export async function createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
  const response = await api.post<Supplier>('/suppliers', data);
  return response.data;
}

export async function updateSupplier(id: number, data: UpdateSupplierRequest): Promise<Supplier> {
  const response = await api.put<Supplier>(`/suppliers/${id}`, data);
  return response.data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}
