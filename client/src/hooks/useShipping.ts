import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as shippingService from '../services/shipping.service';
import type { CreateShipmentRequest, UpdateShipmentRequest } from '../../../shared/types';

export function useShipments(status?: string) {
  return useQuery({
    queryKey: ['shipments', status],
    queryFn: () => shippingService.getShipments(status),
  });
}

export function useShipment(id: number) {
  return useQuery({
    queryKey: ['shipments', id],
    queryFn: () => shippingService.getShipment(id),
    enabled: !!id,
  });
}

export function useShipmentByJob(jobId: number) {
  return useQuery({
    queryKey: ['shipments', 'job', jobId],
    queryFn: () => shippingService.getShipmentByJob(jobId),
    enabled: !!jobId,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateShipmentRequest) => shippingService.createShipment(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...request }: UpdateShipmentRequest & { id: number }) =>
      shippingService.updateShipment(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => shippingService.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
}
