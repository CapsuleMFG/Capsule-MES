import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import * as inventoryService from '../../services/inventory.service';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { PbomItem, UpdatePbomItemRequest, PbomStatus } from '../../types';

interface EditPbomItemModalSupplyChainProps {
    jobId: number;
    pbomItem: PbomItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditPbomItemModalSupplyChain({
    jobId,
    pbomItem,
    isOpen,
    onClose
}: EditPbomItemModalSupplyChainProps) {
    const queryClient = useQueryClient();
    const toast = useToast();

    const [formData, setFormData] = useState<UpdatePbomItemRequest>({
        mfrVendor: '',
        mfrVendorPart: '',
        category: '',
        reqNumber: '',
        poNumber: '',
        notes: '',
        status: 'Ready',
        globalInventoryId: undefined,
        qtyAllocated: 0,
        qtyOrdered: 0,
        qtyReceived: 0,
    });

    // Fetch available inventory items for dropdown
    const { data: availableInventory } = useQuery({
        queryKey: ['inventoryAvailable'],
        queryFn: () => inventoryService.getAvailableInventory(),
        enabled: isOpen,
    });

    // Pre-populate form when pbomItem changes
    useEffect(() => {
        if (pbomItem) {
            setFormData({
                mfrVendor: pbomItem.mfrVendor || '',
                mfrVendorPart: pbomItem.mfrVendorPart || '',
                category: pbomItem.category || '',
                reqNumber: pbomItem.reqNumber || '',
                poNumber: pbomItem.poNumber || '',
                notes: pbomItem.notes || '',
                status: pbomItem.status,
                globalInventoryId: pbomItem.globalInventoryId || undefined,
                qtyAllocated: pbomItem.qtyAllocated || 0,
                qtyOrdered: pbomItem.qtyOrdered || 0,
                qtyReceived: pbomItem.qtyReceived || 0,
            });
        }
    }, [pbomItem]);

    const updateMutation = useMutation({
        mutationFn: (data: UpdatePbomItemRequest) =>
            engineeringService.updatePbomItem(jobId, pbomItem!.id, data),
        onSuccess: async () => {
            // Invalidate all PBOM queries (cross-job) and inventory data
            await queryClient.invalidateQueries({ queryKey: ['pbomItems'] });
            await queryClient.invalidateQueries({ queryKey: ['inventory'] });
            await queryClient.invalidateQueries({ queryKey: ['inventoryAvailable'] });
            await queryClient.invalidateQueries({ queryKey: ['pbom-orders'] });
            toast.success('PBOM item updated successfully');
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update PBOM item');
        },
    });

    const handleClose = () => {
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (!pbomItem) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Edit PBOM Item - Supply Chain">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Read-only info from Engineering */}
                <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-2">From Engineering:</p>
                    <p className="text-sm text-gray-900 font-medium">{pbomItem.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Quantity Required: {pbomItem.qtyRequired}</p>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Status <span className="text-red-400">*</span>
                    </label>
                    <Select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as PbomStatus })}
                        options={[
                            { value: 'Ready', label: 'Ready' },
                            { value: 'In Progress', label: 'In Progress' },
                            { value: 'Ordered', label: 'Ordered' },
                            { value: 'Received', label: 'Received' },
                        ]}
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Qty Ordered - visible when Ordered or Received */}
                {(formData.status === 'Ordered' || formData.status === 'Received') && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Qty Ordered
                        </label>
                        <input
                            type="number"
                            min={0}
                            step="any"
                            value={formData.qtyOrdered ?? 0}
                            onChange={(e) => setFormData({ ...formData, qtyOrdered: parseFloat(e.target.value) || 0 })}
                            disabled={updateMutation.isPending}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How many were actually ordered from the supplier
                        </p>
                    </div>
                )}

                {/* Qty Received - visible when Received */}
                {formData.status === 'Received' && (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Qty Received
                        </label>
                        <input
                            type="number"
                            min={0}
                            step="any"
                            value={formData.qtyReceived ?? 0}
                            onChange={(e) => setFormData({ ...formData, qtyReceived: parseFloat(e.target.value) || 0 })}
                            disabled={updateMutation.isPending}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How many were actually received (surplus goes to inventory)
                        </p>
                    </div>
                )}

                {/* Mfr/Vendor */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Manufacturer/Vendor
                    </label>
                    <Input
                        value={formData.mfrVendor}
                        onChange={(e) => setFormData({ ...formData, mfrVendor: e.target.value })}
                        placeholder="e.g., McMaster-Carr, Amazon, etc."
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Mfr/Vendor Part */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Manufacturer Part #
                    </label>
                    <Input
                        value={formData.mfrVendorPart}
                        onChange={(e) => setFormData({ ...formData, mfrVendorPart: e.target.value })}
                        placeholder="Part or SKU number"
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Category
                    </label>
                    <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Raw Materials, Hardware, etc."
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Inventory Linking */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Inventory Link <span className="text-xs text-gray-500">(Stock Allocation)</span>
                    </label>

                    {/* Auto-match suggestion */}
                    {pbomItem.mfrVendorPart && !formData.globalInventoryId && availableInventory && (() => {
                        const match = availableInventory.find(
                            inv => inv.partNumber?.toLowerCase() === pbomItem.mfrVendorPart!.toLowerCase()
                        );
                        return match ? (
                            <div className="flex items-center gap-2 text-xs bg-white border border-gray-100 rounded px-2 py-1">
                                <span className="text-green-300">Match found: {match.partNumber} ({match.availableQty} avail)</span>
                                <button
                                    type="button"
                                    className="text-green-400 hover:text-green-300 underline"
                                    onClick={() => setFormData({
                                        ...formData,
                                        globalInventoryId: match.id,
                                        qtyAllocated: Math.min(pbomItem.qtyRequired, match.availableQty),
                                    })}
                                >
                                    Link
                                </button>
                            </div>
                        ) : null;
                    })()}

                    {/* Inventory Item Dropdown */}
                    <div>
                        <select
                            value={formData.globalInventoryId ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                    setFormData({ ...formData, globalInventoryId: null, qtyAllocated: 0 });
                                } else {
                                    const invId = parseInt(val);
                                    const inv = availableInventory?.find(i => i.id === invId);
                                    const maxAvail = inv ? inv.availableQty + (pbomItem.globalInventoryId === invId ? pbomItem.qtyAllocated : 0) : 0;
                                    setFormData({
                                        ...formData,
                                        globalInventoryId: invId,
                                        qtyAllocated: Math.min(pbomItem.qtyRequired, maxAvail),
                                    });
                                }
                            }}
                            disabled={updateMutation.isPending}
                            className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        >
                            <option value="">None (not linked)</option>
                            {availableInventory?.map((inv) => {
                                const avail = inv.availableQty + (pbomItem.globalInventoryId === inv.id ? pbomItem.qtyAllocated : 0);
                                return (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.partNumber} - {inv.description || 'No description'} ({avail} {inv.unit} avail)
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Qty to Allocate */}
                    {formData.globalInventoryId && (
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">
                                Qty to Allocate from Stock
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    max={(() => {
                                        const inv = availableInventory?.find(i => i.id === formData.globalInventoryId);
                                        return inv ? inv.availableQty + (pbomItem.globalInventoryId === formData.globalInventoryId ? pbomItem.qtyAllocated : 0) : 0;
                                    })()}
                                    step="any"
                                    value={formData.qtyAllocated ?? 0}
                                    onChange={(e) => setFormData({ ...formData, qtyAllocated: parseFloat(e.target.value) || 0 })}
                                    disabled={updateMutation.isPending}
                                    className="w-24 px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                />
                                <span className="text-xs text-gray-400">
                                    of {pbomItem.qtyRequired} needed
                                    {(() => {
                                        const toOrder = Math.max(0, pbomItem.qtyRequired - (formData.qtyAllocated || 0));
                                        if (toOrder === 0) return <span className="text-green-400 ml-1">(fully covered)</span>;
                                        return <span className="text-yellow-400 ml-1">({toOrder} to order)</span>;
                                    })()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Req Number (SC Only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Requisition # <span className="text-xs text-gray-500">(SC Use Only)</span>
                    </label>
                    <Input
                        value={formData.reqNumber}
                        onChange={(e) => setFormData({ ...formData, reqNumber: e.target.value })}
                        placeholder="Internal requisition number"
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* PO Number (PM Only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Purchase Order # <span className="text-xs text-gray-500">(PM Use Only)</span>
                    </label>
                    <Input
                        value={formData.poNumber}
                        onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                        placeholder="PO number"
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Notes (SC Only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                        Notes <span className="text-xs text-gray-500">(SC Use Only)</span>
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Procurement notes, lead times, special instructions, etc."
                        disabled={updateMutation.isPending}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={updateMutation.isPending}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={updateMutation.isPending}
                        className="flex-1"
                    >
                        {updateMutation.isPending ? 'Updating...' : 'Update'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
