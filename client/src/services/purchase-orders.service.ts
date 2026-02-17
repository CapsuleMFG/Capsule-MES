import api from './api';
import type { PurchaseOrder, UpdatePurchaseOrderRequest } from '../types';

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const response = await api.get('/purchase-orders');
    return response.data;
}

export async function updatePurchaseOrder(
    id: number,
    data: UpdatePurchaseOrderRequest
): Promise<void> {
    await api.put(`/purchase-orders/${id}`, data);
}

export async function receivePurchaseOrder(
    id: number,
    qtyReceived: number
): Promise<{ message: string; newTotalReceived: number; status: string }> {
    const response = await api.post(`/purchase-orders/${id}/receive`, { qtyReceived });
    return response.data;
}
