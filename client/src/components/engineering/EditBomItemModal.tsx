import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import { useRouteTemplates } from '../../hooks/usePartsTracking';
import * as engineeringService from '../../services/engineering.service';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import type { BomItem, UpdateBomItemRequest } from '../../types';

interface EditBomItemModalProps {
    jobId: number;
    bomItem: BomItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditBomItemModal({ jobId, bomItem, isOpen, onClose }: EditBomItemModalProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { data: routeTemplates } = useRouteTemplates();

    const [formData, setFormData] = useState<UpdateBomItemRequest>({
        partNumber: '',
        description: '',
        quantity: 1,
        unit: 'EA',
        material: '',
        thickness: '',
        surfaceArea: undefined,
        powdercoat: '',
        notes: '',
    });

    // Pre-populate form when bomItem changes
    useEffect(() => {
        if (bomItem) {
            setFormData({
                partNumber: bomItem.partNumber,
                description: bomItem.description || '',
                quantity: bomItem.quantity,
                unit: bomItem.unit,
                material: bomItem.material || '',
                thickness: bomItem.thickness || '',
                surfaceArea: bomItem.surfaceArea,
                powdercoat: bomItem.powdercoat || '',
                routeTemplateId: bomItem.routeTemplateId || undefined,
                notes: bomItem.notes || '',
            });
        }
    }, [bomItem]);

    const updateMutation = useMutation({
        mutationFn: (data: UpdateBomItemRequest) =>
            engineeringService.updateBomItem(jobId, bomItem!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bomItems', jobId] });
            toast.success('BOM item updated successfully');
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update BOM item');
        },
    });

    const handleClose = () => {
        setFormData({
            partNumber: '',
            description: '',
            quantity: 1,
            unit: 'EA',
            material: '',
            thickness: '',
            surfaceArea: undefined,
            powdercoat: '',
            notes: '',
        });
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.partNumber) {
            toast.error('Part number is required');
            return;
        }

        if (!formData.quantity || formData.quantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        updateMutation.mutate(formData);
    };

    if (!bomItem) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Edit BOM Item">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Part Number */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Part Number <span className="text-red-400">*</span>
                    </label>
                    <Input
                        value={formData.partNumber}
                        onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                        placeholder="e.g., PRT-12345"
                        disabled={updateMutation.isPending}
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                    </label>
                    <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description of the part"
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Quantity and Unit */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Quantity <span className="text-red-400">*</span>
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            disabled={updateMutation.isPending}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Unit
                        </label>
                        <Input
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            placeholder="EA, FT, LBS, etc."
                            disabled={updateMutation.isPending}
                        />
                    </div>
                </div>

                {/* Material */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Material
                    </label>
                    <Input
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        placeholder="e.g., Galvanized Steel, 3/4 Wilsonart"
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Thickness and Surface Area */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Thickness
                        </label>
                        <Input
                            value={formData.thickness}
                            onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                            placeholder="e.g., 0.035"
                            disabled={updateMutation.isPending}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Surface Area (sqft)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.surfaceArea || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                surfaceArea: e.target.value ? parseFloat(e.target.value) : undefined
                            })}
                            placeholder="0.00"
                            disabled={updateMutation.isPending}
                        />
                    </div>
                </div>

                {/* Powdercoat */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Powdercoat / Finish
                    </label>
                    <Input
                        value={formData.powdercoat}
                        onChange={(e) => setFormData({ ...formData, powdercoat: e.target.value })}
                        placeholder="Finish or coating specification"
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Route Template */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Route Template
                    </label>
                    <select
                        value={formData.routeTemplateId || ''}
                        onChange={(e) => setFormData({
                            ...formData,
                            routeTemplateId: e.target.value ? parseInt(e.target.value) : null
                        })}
                        disabled={updateMutation.isPending}
                        className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rivian-accent focus:border-transparent"
                    >
                        <option value="">None</option>
                        {routeTemplates?.map((rt) => (
                            <option key={rt.id} value={rt.id}>{rt.name}</option>
                        ))}
                    </select>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notes
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes or specifications"
                        disabled={updateMutation.isPending}
                        rows={3}
                        className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rivian-accent focus:border-transparent"
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
                        {updateMutation.isPending ? 'Updating...' : 'Update BOM Item'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
