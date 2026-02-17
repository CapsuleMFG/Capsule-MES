import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import Card from '../ui/Card';
import Select from '../ui/Select';
import EditPbomItemModalSupplyChain from './EditPbomItemModalSupplyChain';
import { Edit2, FileSpreadsheet, CheckCircle, Link2 } from 'lucide-react';
import type { PbomItem, PbomStatus, UpdatePbomItemRequest } from '../../types';

interface PbomTableSupplyChainProps {
    jobId: number;
}

export default function PbomTableSupplyChain({ jobId }: PbomTableSupplyChainProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [editingItem, setEditingItem] = useState<PbomItem | null>(null);
    // Track pending status changes that need qty input before submitting
    const [pendingStatus, setPendingStatus] = useState<Record<number, { status: PbomStatus; qty: number }>>({});

    // Fetch PBOM items
    const { data: pbomItems, isLoading } = useQuery({
        queryKey: ['pbomItems', jobId],
        queryFn: () => engineeringService.getPbomItems(jobId),
    });

    // Filter only items sent to Supply Chain
    const sentItems = pbomItems?.filter(item => item.sentToSc) || [];

    // Calculate % complete
    const totalItems = sentItems.length;
    const receivedItems = sentItems.filter(item => item.status === 'Received').length;
    const percentComplete = totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0;

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ pbomId, data }: { pbomId: number; data: UpdatePbomItemRequest }) =>
            engineeringService.updatePbomItem(jobId, pbomId, data),
        onSuccess: async (_, variables) => {
            // Clear pending status for this item
            setPendingStatus(prev => {
                const next = { ...prev };
                delete next[variables.pbomId];
                return next;
            });
            // Invalidate ALL pbomItems queries (cross-job) since shared inventory changes affect other jobs
            await queryClient.invalidateQueries({ queryKey: ['pbomItems'] });
            // Invalidate inventory data since "Received" status updates global inventory
            await queryClient.invalidateQueries({ queryKey: ['inventory'] });
            await queryClient.invalidateQueries({ queryKey: ['inventoryAvailable'] });
            // Invalidate order tracking since status/qty changes affect it
            await queryClient.invalidateQueries({ queryKey: ['pbom-orders'] });
            toast.success('Status updated successfully');
        },
        onError: () => {
            toast.error('Failed to update status');
        },
    });

    const handleStatusChange = (item: PbomItem, status: PbomStatus) => {
        if (status === 'Ordered') {
            // Show inline qty input pre-filled with toOrder
            const toOrder = Math.max(0, item.qtyRequired - item.qtyAllocated);
            setPendingStatus(prev => ({ ...prev, [item.id]: { status, qty: toOrder } }));
        } else if (status === 'Received') {
            // Show inline qty input pre-filled with qty_ordered
            setPendingStatus(prev => ({ ...prev, [item.id]: { status, qty: item.qtyOrdered || 0 } }));
        } else {
            // Ready or In Progress — submit immediately
            updateStatusMutation.mutate({ pbomId: item.id, data: { status } });
        }
    };

    const handleConfirmPendingStatus = (item: PbomItem) => {
        const pending = pendingStatus[item.id];
        if (!pending) return;

        const data: UpdatePbomItemRequest = { status: pending.status };
        if (pending.status === 'Ordered') {
            data.qtyOrdered = pending.qty;
        } else if (pending.status === 'Received') {
            data.qtyReceived = pending.qty;
        }
        updateStatusMutation.mutate({ pbomId: item.id, data });
    };

    const handleCancelPendingStatus = (itemId: number) => {
        setPendingStatus(prev => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    };

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="text-center text-gray-400">Loading PBOM items...</div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Production Bill of Materials (PBOM)</h3>
                    {sentItems.length > 0 && (
                        <p className="text-sm text-gray-400 mt-1">
                            {sentItems.length} items • {percentComplete}% Complete
                        </p>
                    )}
                </div>
                {sentItems.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">{percentComplete}%</p>
                            <p className="text-xs text-gray-400">{receivedItems}/{totalItems} received</p>
                        </div>
                        <CheckCircle className={`w-8 h-8 ${percentComplete === 100 ? 'text-green-500' : 'text-gray-600'}`} />
                    </div>
                )}
            </div>

            {sentItems.length === 0 ? (
                <div className="text-center py-12 bg-rivian-hover rounded-lg">
                    <FileSpreadsheet className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No PBOM items received from Engineering yet</p>
                    <p className="text-gray-500 text-xs mt-2">
                        Engineering will send PBOM items here for procurement
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">Status</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">Description</th>
                                <th className="text-right py-3 px-3 text-xs font-medium text-gray-400">Qty Req'd</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">Mfr/Vendor</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">Part #</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400">Category</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 bg-green-500/10">Inventory</th>
                                <th className="text-right py-3 px-3 text-xs font-medium text-gray-400 bg-green-500/10">In Stock</th>
                                <th className="text-right py-3 px-3 text-xs font-medium text-gray-400 bg-green-500/10">To Order</th>
                                <th className="text-right py-3 px-3 text-xs font-medium text-gray-400 bg-orange-500/10">Qty Ordered</th>
                                <th className="text-right py-3 px-3 text-xs font-medium text-gray-400 bg-orange-500/10">Qty Received</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 bg-blue-500/10">Req #</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 bg-purple-500/10">PO</th>
                                <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 bg-blue-500/10">Notes</th>
                                <th className="text-center py-3 px-3 text-xs font-medium text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sentItems.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-b border-gray-800 hover:bg-rivian-hover"
                                >
                                    <td className="py-3 px-3">
                                        <Select
                                            value={pendingStatus[item.id]?.status ?? item.status}
                                            onChange={(e) => handleStatusChange(item, e.target.value as PbomStatus)}
                                            options={[
                                                { value: 'Ready', label: 'Ready' },
                                                { value: 'In Progress', label: 'In Progress' },
                                                { value: 'Ordered', label: 'Ordered' },
                                                { value: 'Received', label: 'Received' },
                                            ]}
                                            className="text-xs"
                                            disabled={updateStatusMutation.isPending}
                                        />
                                        {pendingStatus[item.id] && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={pendingStatus[item.id].qty}
                                                    onChange={(e) => setPendingStatus(prev => ({
                                                        ...prev,
                                                        [item.id]: { ...prev[item.id], qty: parseFloat(e.target.value) || 0 }
                                                    }))}
                                                    className="w-16 px-1 py-0.5 bg-rivian-soft-black border border-orange-500/50 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleConfirmPendingStatus(item)}
                                                    disabled={updateStatusMutation.isPending}
                                                    className="px-1.5 py-0.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded transition-colors"
                                                >
                                                    OK
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelPendingStatus(item.id)}
                                                    className="px-1 py-0.5 text-gray-400 hover:text-white text-xs"
                                                >
                                                    X
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-white">
                                        {item.description}
                                    </td>
                                    <td className="py-3 px-3 text-right text-white">
                                        {item.qtyRequired}
                                    </td>
                                    <td className="py-3 px-3 text-gray-300">
                                        {item.mfrVendor || '-'}
                                    </td>
                                    <td className="py-3 px-3 text-gray-300">
                                        {item.mfrVendorPart || '-'}
                                    </td>
                                    <td className="py-3 px-3 text-gray-300">
                                        {item.category || '-'}
                                    </td>
                                    <td className="py-3 px-3 bg-green-500/5">
                                        {item.inventoryItem ? (
                                            <span className="flex items-center gap-1 text-green-400 text-xs">
                                                <Link2 className="w-3 h-3" />
                                                {item.inventoryItem.partNumber}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 text-xs">Not linked</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right bg-green-500/5">
                                        {item.inventoryItem ? (
                                            <span className="text-xs text-gray-300">
                                                {item.qtyAllocated} / {item.inventoryItem.availableQty + item.qtyAllocated} avail
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 text-xs">0 in stock</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right bg-green-500/5">
                                        {(() => {
                                            const toOrder = Math.max(0, item.qtyRequired - item.qtyAllocated);
                                            if (toOrder === 0) return <span className="text-green-400 font-medium text-xs">0</span>;
                                            if (item.qtyAllocated > 0) return <span className="text-yellow-400 font-medium text-xs">{toOrder}</span>;
                                            return <span className="text-red-400 font-medium text-xs">{toOrder}</span>;
                                        })()}
                                    </td>
                                    <td className="py-3 px-3 text-right bg-orange-500/5">
                                        {item.qtyOrdered > 0 ? (
                                            <span className="text-orange-300 font-medium text-xs">{item.qtyOrdered}</span>
                                        ) : (
                                            <span className="text-gray-600 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right bg-orange-500/5">
                                        {item.qtyReceived > 0 ? (
                                            <span className="text-orange-300 font-medium text-xs">{item.qtyReceived}</span>
                                        ) : (
                                            <span className="text-gray-600 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-gray-300 bg-blue-500/5">
                                        {item.reqNumber || '-'}
                                    </td>
                                    <td className="py-3 px-3 text-gray-300 bg-purple-500/5">
                                        {item.poNumber || '-'}
                                    </td>
                                    <td className="py-3 px-3 text-gray-300 bg-blue-500/5">
                                        {item.notes || '-'}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <button
                                            onClick={() => setEditingItem(item)}
                                            className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                            title="Edit details"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend */}
            {sentItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-2">Column Guide:</p>
                    <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500/20 rounded"></div>
                            <span className="text-gray-400">Inventory (Inventory, In Stock, To Order)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500/20 rounded"></div>
                            <span className="text-gray-400">Ordering (Qty Ordered, Qty Received)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500/20 rounded"></div>
                            <span className="text-gray-400">SC Use Only (Req #, Notes)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500/20 rounded"></div>
                            <span className="text-gray-400">PM Use Only (PO)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit PBOM Item Modal for Supply Chain */}
            <EditPbomItemModalSupplyChain
                jobId={jobId}
                pbomItem={editingItem}
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
            />
        </Card>
    );
}
