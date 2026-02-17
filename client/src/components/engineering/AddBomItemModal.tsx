import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import { useRouteTemplates } from '../../hooks/usePartsTracking';
import * as engineeringService from '../../services/engineering.service';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import type { CreateBomItemRequest } from '../../types';

interface AddBomItemModalProps {
    jobId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddBomItemModal({ jobId, isOpen, onClose }: AddBomItemModalProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { data: routeTemplates } = useRouteTemplates();

    const [formData, setFormData] = useState<CreateBomItemRequest>({
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

    const createMutation = useMutation({
        mutationFn: (data: CreateBomItemRequest) => engineeringService.createBomItem(jobId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bomItems', jobId] });
            toast.success('BOM item added successfully');
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to add BOM item');
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

        createMutation.mutate(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add BOM Item" maxWidth="2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Part Number <span className="text-red-400">*</span>
                            </label>
                            <Input
                                value={formData.partNumber}
                                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                                placeholder="PRT-12345"
                                disabled={createMutation.isPending}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Quantity <span className="text-red-400">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
                                    disabled={createMutation.isPending}
                                    className="col-span-2"
                                    required
                                />
                                <Input
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="EA"
                                    disabled={createMutation.isPending}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Description
                        </label>
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Part description"
                            disabled={createMutation.isPending}
                        />
                    </div>
                </div>

                {/* Material Specifications */}
                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Material Specifications</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Material
                            </label>
                            <Input
                                value={formData.material}
                                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                                placeholder="Galvanized Steel"
                                disabled={createMutation.isPending}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Thickness
                            </label>
                            <Input
                                value={formData.thickness}
                                onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                                placeholder="0.035"
                                disabled={createMutation.isPending}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
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
                                disabled={createMutation.isPending}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Powdercoat / Finish
                            </label>
                            <Input
                                value={formData.powdercoat}
                                onChange={(e) => setFormData({ ...formData, powdercoat: e.target.value })}
                                placeholder="Finish specification"
                                disabled={createMutation.isPending}
                            />
                        </div>
                    </div>
                </div>

                {/* Manufacturing */}
                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Manufacturing</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Route Template
                        </label>
                        <select
                            value={formData.routeTemplateId || ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                routeTemplateId: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            disabled={createMutation.isPending}
                            className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rivian-accent focus:border-transparent"
                        >
                            <option value="">None</option>
                            {routeTemplates?.map((rt) => (
                                <option key={rt.id} value={rt.id}>{rt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes or specifications"
                            disabled={createMutation.isPending}
                            rows={3}
                            className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rivian-accent focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-800">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClose}
                        disabled={createMutation.isPending}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={createMutation.isPending}
                        className="flex-1"
                    >
                        {createMutation.isPending ? 'Adding...' : 'Add BOM Item'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
