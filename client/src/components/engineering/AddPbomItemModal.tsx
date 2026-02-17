import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import type { CreatePbomItemRequest } from '../../types';

interface AddPbomItemModalProps {
    jobId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddPbomItemModal({ jobId, isOpen, onClose }: AddPbomItemModalProps) {
    const queryClient = useQueryClient();
    const toast = useToast();

    const [formData, setFormData] = useState<CreatePbomItemRequest>({
        description: '',
        qtyRequired: 1,
        mfrVendor: '',
        mfrVendorPart: '',
        category: '',
    });

    const createMutation = useMutation({
        mutationFn: (data: CreatePbomItemRequest) => engineeringService.createPbomItem(jobId, data),
        onSuccess: async () => {
            // Force immediate refetch to show auto-linked inventory data
            await queryClient.refetchQueries({ queryKey: ['pbomItems', jobId] });
            toast.success('PBOM item added successfully');
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to add PBOM item');
        },
    });

    const handleClose = () => {
        setFormData({
            description: '',
            qtyRequired: 1,
            mfrVendor: '',
            mfrVendorPart: '',
            category: '',
        });
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.description) {
            toast.error('Description is required');
            return;
        }

        if (!formData.qtyRequired || formData.qtyRequired <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        createMutation.mutate(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add PBOM Item">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description <span className="text-red-400">*</span>
                    </label>
                    <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder='e.g., 11ga Galv Steel, 3/4" Plywood, etc.'
                        disabled={createMutation.isPending}
                        required
                    />
                </div>

                {/* Quantity Required */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Quantity Required <span className="text-red-400">*</span>
                    </label>
                    <Input
                        type="number"
                        step="0.01"
                        value={formData.qtyRequired}
                        onChange={(e) => setFormData({ ...formData, qtyRequired: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        disabled={createMutation.isPending}
                        required
                    />
                </div>

                {/* Mfr/Vendor (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Manufacturer/Vendor <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <Input
                        value={formData.mfrVendor}
                        onChange={(e) => setFormData({ ...formData, mfrVendor: e.target.value })}
                        placeholder="e.g., McMaster-Carr, Amazon, etc."
                        disabled={createMutation.isPending}
                    />
                </div>

                {/* Mfr/Vendor Part (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Manufacturer Part # <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <Input
                        value={formData.mfrVendorPart}
                        onChange={(e) => setFormData({ ...formData, mfrVendorPart: e.target.value })}
                        placeholder="Part or SKU number"
                        disabled={createMutation.isPending}
                    />
                </div>

                {/* Category (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Category <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Raw Materials, Hardware, etc."
                        disabled={createMutation.isPending}
                    />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-gray-400">
                        <strong className="text-blue-400">Note:</strong> Supply Chain will complete additional fields (Req #, PO, Notes) when procuring materials.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
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
                        {createMutation.isPending ? 'Adding...' : 'Add PBOM Item'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
