import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import * as productionService from '../../services/production.service';
import type { WorkOrder } from '../../../../shared/types';

interface SendToProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
}

export default function SendToProductionModal({
  isOpen,
  onClose,
  workOrder,
}: SendToProductionModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Extract machine name from notes
  const extractMachine = (notes: string | undefined) => {
    if (!notes) return null;
    const match = notes.match(/Machine:\s*(.+)/);
    return match ? match[1].trim() : null;
  };

  const machineName = extractMachine(workOrder.notes);
  const machineType = workOrder.machineType;

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!machineType) {
        throw new Error('Work order does not have a machine type assigned');
      }
      return productionService.sendToProduction(workOrder.jobId, workOrder.id, machineType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders', workOrder.jobId] });
      queryClient.invalidateQueries({ queryKey: ['productionPool'] });
      toast.success(`Work order ${workOrder.woNumber} sent to production pool`);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send work order to production');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineType) {
      toast.error('This work order does not have a machine type assigned');
      return;
    }
    sendMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send to Production" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Send work order <span className="font-medium text-white">{workOrder.woNumber}</span> to the production pool
          </p>

          {/* Machine Info */}
          {machineName && machineType && (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Machine</p>
                  <p className="text-sm font-medium text-white">{machineName}</p>
                </div>
                <span className="badge text-xs bg-blue-500/20 text-blue-400">
                  {machineType}
                </span>
              </div>
            </div>
          )}

          {/* Warning if no machine type */}
          {!machineType && (
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <p className="text-sm text-yellow-400 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span>This work order does not have a machine type assigned. Please edit the work order and select a machine.</span>
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500">
            This will add the work order to the production pool for {machineType || 'the assigned'} machine type, where production managers can assign it to a specific machine.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={sendMutation.isPending || !machineType} className="flex-1">
            {sendMutation.isPending ? 'Sending...' : 'Send to Production'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
