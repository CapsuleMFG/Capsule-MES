import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useUpdatePurchaseOrder } from '../../hooks/usePurchaseOrders';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { PurchaseOrder } from '../../types';

interface EditOrderModalProps {
    item: PurchaseOrder | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditOrderModal({ item, isOpen, onClose }: EditOrderModalProps) {
    const toast = useToast();
    const [poNumber, setPoNumber] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [vendor, setVendor] = useState('');
    const [notes, setNotes] = useState('');

    const updateMutation = useUpdatePurchaseOrder();

    useEffect(() => {
        if (item) {
            setPoNumber(item.poNumber || '');
            setExpectedDate(item.expectedReceiveDate || '');
            setVendor(item.vendor || '');
            setNotes(item.notes || '');
        }
    }, [item]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!item) return;

        updateMutation.mutate(
            { id: item.id, data: { poNumber, expectedReceiveDate: expectedDate, vendor, notes } },
            {
                onSuccess: () => {
                    toast.success('Order details updated');
                    onClose();
                },
                onError: () => {
                    toast.error('Failed to update order details');
                },
            }
        );
    };

    if (!item) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Order Details">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm text-gray-600">{item.description}</p>
                    {item.linkedJobs && item.linkedJobs.length > 0 && (
                        <p className="text-xs text-gray-400">
                            {item.linkedJobs.map(j => j.jobNumber).join(', ')}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Qty Ordered</p>
                        <p className="text-gray-900 font-medium">{item.qtyOrdered}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-400 text-xs">Qty Received</p>
                        <p className="text-gray-900 font-medium">{item.qtyReceived}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">PO Number</label>
                    <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="Enter PO number..."
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Vendor</label>
                    <input
                        type="text"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        placeholder="Enter vendor name..."
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Expected Receive Date</label>
                    <input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
