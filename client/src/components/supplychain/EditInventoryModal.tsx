import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as inventoryService from '../../services/inventory.service';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { GlobalInventory } from '../../types';

interface EditInventoryModalProps {
    item: GlobalInventory | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditInventoryModal({ item, isOpen, onClose }: EditInventoryModalProps) {
    const queryClient = useQueryClient();
    const toast = useToast();

    const [formData, setFormData] = useState({
        description: '',
        partNumber: '',
        quantityOnHand: '',
        unit: 'EA',
        unitCost: '',
        reorderLevel: '',
        reorderQuantity: '',
        supplierName: '',
        notes: '',
    });

    useEffect(() => {
        if (item) {
            setFormData({
                description: item.description || '',
                partNumber: item.partNumber || '',
                quantityOnHand: item.quantityOnHand.toString(),
                unit: item.unit,
                unitCost: item.unitCost?.toString() || '',
                reorderLevel: item.reorderLevel?.toString() || '',
                reorderQuantity: item.reorderQuantity?.toString() || '',
                supplierName: item.supplierName || '',
                notes: item.notes || '',
            });
        }
    }, [item]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => inventoryService.updateInventoryItem(item!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['pbomItems'] });
            toast.success('Inventory item updated successfully!');
            onClose();
        },
        onError: () => {
            toast.error('Failed to update inventory item.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate({
            description: formData.description || undefined,
            partNumber: formData.partNumber || undefined,
            quantityOnHand: formData.quantityOnHand ? parseFloat(formData.quantityOnHand) : undefined,
            unit: formData.unit,
            reorderLevel: formData.reorderLevel ? parseFloat(formData.reorderLevel) : undefined,
            reorderQuantity: formData.reorderQuantity ? parseFloat(formData.reorderQuantity) : undefined,
            unitCost: formData.unitCost ? parseFloat(formData.unitCost) : undefined,
            supplierName: formData.supplierName || undefined,
            notes: formData.notes || undefined,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Inventory Item" maxWidth="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Part Number <span className="text-gray-500">(optional)</span>
                        </label>
                        <Input
                            value={formData.partNumber}
                            onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                            placeholder="e.g., PRT-12345 or leave blank"
                            disabled={updateMutation.isPending}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Quantity On Hand
                        </label>
                        <Input
                            type="number"
                            value={formData.quantityOnHand}
                            onChange={(e) => setFormData({ ...formData, quantityOnHand: e.target.value })}
                            placeholder="0"
                            disabled={updateMutation.isPending}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                    <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description of the item"
                        disabled={updateMutation.isPending}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Unit</label>
                        <Select
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            options={[
                                { value: 'EA', label: 'EA' },
                                { value: 'FT', label: 'FT' },
                                { value: 'LB', label: 'LB' },
                                { value: 'GAL', label: 'GAL' },
                                { value: 'SQ FT', label: 'SQ FT' },
                                { value: 'BOX', label: 'BOX' },
                            ]}
                            disabled={updateMutation.isPending}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Unit Cost ($)</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.unitCost}
                            onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                            placeholder="0.00"
                            disabled={updateMutation.isPending}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Reorder Level</label>
                        <Input
                            type="number"
                            value={formData.reorderLevel}
                            onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                            placeholder="0"
                            disabled={updateMutation.isPending}
                        />
                    </div>
                </div>

                <div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Reorder Quantity</label>
                        <Input
                            type="number"
                            value={formData.reorderQuantity}
                            onChange={(e) => setFormData({ ...formData, reorderQuantity: e.target.value })}
                            placeholder="0"
                            disabled={updateMutation.isPending}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Supplier</label>
                    <Input
                        value={formData.supplierName}
                        onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                        placeholder="Supplier name"
                        disabled={updateMutation.isPending}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes"
                        disabled={updateMutation.isPending}
                        rows={2}
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
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
                        {updateMutation.isPending ? 'Updating...' : 'Update Item'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
