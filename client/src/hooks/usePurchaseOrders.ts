import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as purchaseOrdersService from '../services/purchase-orders.service';
import type { UpdatePurchaseOrderRequest } from '../types';

export function usePurchaseOrders() {
    return useQuery({
        queryKey: ['purchase-orders'],
        queryFn: purchaseOrdersService.getPurchaseOrders,
    });
}

export function useUpdatePurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdatePurchaseOrderRequest }) =>
            purchaseOrdersService.updatePurchaseOrder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['pbom-orders'] });
            queryClient.invalidateQueries({ queryKey: ['pbomItems'] });
        },
    });
}

export function useReceivePurchaseOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, qtyReceived }: { id: number; qtyReceived: number }) =>
            purchaseOrdersService.receivePurchaseOrder(id, qtyReceived),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['pbom-orders'] });
            queryClient.invalidateQueries({ queryKey: ['pbomItems'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventoryAvailable'] });
        },
    });
}
