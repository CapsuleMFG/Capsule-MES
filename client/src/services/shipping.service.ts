import api from './api';
import type { Shipment, ShipmentWithJob, CreateShipmentRequest, UpdateShipmentRequest } from '../../../shared/types';

export async function getShipments(status?: string): Promise<ShipmentWithJob[]> {
  const params = status ? { status } : {};
  const { data } = await api.get('/shipments', { params });
  return data;
}

export async function getShipment(id: number): Promise<ShipmentWithJob> {
  const { data } = await api.get(`/shipments/${id}`);
  return data;
}

export async function getShipmentByJob(jobId: number): Promise<Shipment | null> {
  try {
    const { data } = await api.get(`/shipments/job/${jobId}`);
    return data;
  } catch {
    return null;
  }
}

export async function createShipment(request: CreateShipmentRequest): Promise<Shipment> {
  const { data } = await api.post('/shipments', request);
  return data;
}

export async function updateShipment(id: number, request: UpdateShipmentRequest): Promise<Shipment> {
  const { data } = await api.put(`/shipments/${id}`, request);
  return data;
}

export async function deleteShipment(id: number): Promise<void> {
  await api.delete(`/shipments/${id}`);
}
