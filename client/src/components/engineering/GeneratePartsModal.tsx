import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useBulkCreateTrackedParts } from '../../hooks/usePartsTracking';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { BomItem, IdentificationType } from '../../types';

interface GeneratePartsModalProps {
    jobId: number;
    bomItem: BomItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function GeneratePartsModal({ jobId, bomItem, isOpen, onClose }: GeneratePartsModalProps) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const bulkCreate = useBulkCreateTrackedParts(jobId);

    const [trackingIdPrefix, setTrackingIdPrefix] = useState('');
    const [identificationType, setIdentificationType] = useState<IdentificationType>('Other');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (bomItem) {
            setTrackingIdPrefix(bomItem.partNumber || '');
            setQuantity(bomItem.quantity);
            setIdentificationType('Other');
        }
    }, [bomItem]);

    useEffect(() => {
        if (!isOpen) {
            setTrackingIdPrefix('');
            setIdentificationType('Other');
            setQuantity(1);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bomItem) return;

        bulkCreate.mutate({
            bomItemId: bomItem.id,
            quantity,
            routeTemplateId: bomItem.routeTemplateId,
            partNumber: bomItem.partNumber,
            description: bomItem.description,
            trackingIdPrefix: trackingIdPrefix || undefined,
            identificationType,
        }, {
            onSuccess: () => {
                toast.success(`Generated ${quantity} tracked parts for ${bomItem.partNumber}`);
                queryClient.invalidateQueries({ queryKey: ['trackedParts'] });
                onClose();
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error || 'Failed to generate parts');
            },
        });
    };

    if (!bomItem) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate Tracked Parts">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                        Generate <span className="text-gray-900 font-semibold">{quantity}</span> tracked parts for{' '}
                        <span className="text-gray-900 font-semibold">{bomItem.partNumber}</span>{' '}
                        using route: <span className="text-gray-900 font-semibold">{bomItem.routeTemplateName}</span>
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        max="1000"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID Prefix</label>
                        <input
                            type="text"
                            value={trackingIdPrefix}
                            onChange={(e) => setTrackingIdPrefix(e.target.value)}
                            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                            placeholder="e.g., PRT-001"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                        <select
                            value={identificationType}
                            onChange={(e) => setIdentificationType(e.target.value as IdentificationType)}
                            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                            <option value="QR">QR Code</option>
                            <option value="Engraved">Engraved</option>
                            <option value="Sticker">Sticker</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={bulkCreate.isPending}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={bulkCreate.isPending || quantity < 1}
                        className="flex-1"
                    >
                        {bulkCreate.isPending ? 'Generating...' : `Generate ${quantity} Part${quantity !== 1 ? 's' : ''}`}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
