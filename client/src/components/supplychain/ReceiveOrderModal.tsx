import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useReceivePurchaseOrder } from '../../hooks/usePurchaseOrders';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { PurchaseOrder } from '../../types';

interface ReceiveOrderModalProps {
    item: PurchaseOrder | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ReceiveOrderModal({ item, isOpen, onClose }: ReceiveOrderModalProps) {
    const toast = useToast();
    const [qtyToReceive, setQtyToReceive] = useState(0);

    const remaining = item ? item.qtyOrdered - item.qtyReceived : 0;

    const receiveMutation = useReceivePurchaseOrder();

    useEffect(() => {
        if (item) {
            setQtyToReceive(remaining);
        }
    }, [item, remaining]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!item || qtyToReceive <= 0) return;

        receiveMutation.mutate(
            { id: item.id, qtyReceived: qtyToReceive },
            {
                onSuccess: () => {
                    toast.success(`Received ${qtyToReceive} of "${item.description}"`);
                    onClose();
                },
                onError: () => {
                    toast.error('Failed to receive order');
                },
            }
        );
    };

    if (!item) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Receive Order">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm text-gray-600">{item.description}</p>
                    {item.poNumber && (
                        <p className="text-xs text-purple-500">PO# {item.poNumber}</p>
                    )}
                    {item.linkedJobs && item.linkedJobs.length > 1 && (
                        <p className="text-xs text-gray-400">
                            Distributes to: {item.linkedJobs.map(j => j.jobNumber).join(', ')}
                        </p>
                    )}
                    {item.linkedJobs && item.linkedJobs.length === 1 && (
                        <p className="text-xs text-gray-400">
                            {item.linkedJobs[0].jobNumber} — {item.linkedJobs[0].clientName}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs">Ordered</p>
                        <p className="text-gray-900 font-semibold text-base">{item.qtyOrdered}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs">Received</p>
                        <p className="text-gray-900 font-semibold text-base">{item.qtyReceived}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs">Remaining</p>
                        <p className="text-gray-900 font-semibold text-base">{remaining}</p>
                    </div>
                </div>

                {/* Job breakdown for multi-job POs */}
                {item.linkedJobs && item.linkedJobs.length > 1 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-2">Distribution (by SC priority):</p>
                        {item.linkedJobs.map((job) => (
                            <div key={job.pbomItemId} className="flex justify-between text-xs py-1">
                                <span className="text-gray-600">{job.jobNumber}</span>
                                <span className="text-gray-400">
                                    {job.qtyReceived}/{job.qtyOrdered}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Quantity to Receive Now
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={remaining}
                        step="any"
                        value={qtyToReceive}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setQtyToReceive(Math.min(val, remaining));
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {qtyToReceive > 0 && qtyToReceive + item.qtyReceived >= item.qtyOrdered && (
                        <p className="text-xs text-green-400 mt-1">
                            This will fully receive the order and update status to "Received"
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={receiveMutation.isPending || qtyToReceive <= 0}
                    >
                        {receiveMutation.isPending ? 'Receiving...' : `Receive ${qtyToReceive}`}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
