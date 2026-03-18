import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { PbomItem, UpdatePbomItemRequest, PbomStatus } from '../../types';

interface EditPbomItemModalProps {
    jobId: number;
    pbomItem: PbomItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditPbomItemModal({ jobId, pbomItem, isOpen, onClose }: EditPbomItemModalProps) {
    const queryClient = useQueryClient();
    const toast = useToast();

    const [formData, setFormData] = useState<UpdatePbomItemRequest>({
        description: '',
        qtyRequired: 1,
        mfrVendor: '',
        mfrVendorPart: '',
        category: '',
        status: 'Ready',
    });

    // Pre-populate form when pbomItem changes
    useEffect(() => {
        if (pbomItem) {
            setFormData({
                description: pbomItem.description,
                qtyRequired: pbomItem.qtyRequired,
                mfrVendor: pbomItem.mfrVendor || '',
                mfrVendorPart: pbomItem.mfrVendorPart || '',
                category: pbomItem.category || '',
                status: pbomItem.status || 'Ready',
            });
        }
    }, [pbomItem]);

    const updateMutation = useMutation({
        mutationFn: (data: UpdatePbomItemRequest) =>
            engineeringService.updatePbomItem(jobId, pbomItem!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pbomItems', jobId] });
            toast.success('PBOM item updated successfully');
            handleClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to update PBOM item');
        },
    });

    const handleClose = () => {
        setFormData({
            description: '',
            qtyRequired: 1,
            mfrVendor: '',
            mfrVendorPart: '',
            category: '',
            status: 'Ready',
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

        updateMutation.mutate(formData);
    };

    if (!pbomItem) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Edit PBOM Item">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-red-400">*</span>
                    </label>
                    <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder='e.g., 11ga Galv Steel, 3/4" Plywood, etc.'
                        disabled={updateMutation.isPending}
                        required
                    />
                </div>

                {/* Quantity Required */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity Required <span className="text-red-400">*</span>
                    </label>
                    <Input
                        type="number"
                        step="0.01"
                        value={formData.qtyRequired}
                        onChange={(e) => setFormData({ ...formData, qtyRequired: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        disabled={updateMutation.isPending}
                        required
                    />
                </div>

                {/* Mfr/Vendor */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                    </label>
                    <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Raw Materials, Hardware, etc."
                        disabled={updateMutation.isPending}
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
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
                        {updateMutation.isPending ? 'Updating...' : 'Update PBOM Item'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
