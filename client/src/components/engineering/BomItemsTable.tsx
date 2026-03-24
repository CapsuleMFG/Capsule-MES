import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import { useTrackedParts } from '../../hooks/usePartsTracking';
import * as engineeringService from '../../services/engineering.service';
import Card from '../ui/Card';
import Button from '../ui/Button';
import AddBomItemModal from './AddBomItemModal';
import EditBomItemModal from './EditBomItemModal';
import GeneratePartsModal from './GeneratePartsModal';
import { Plus, PencilSimple, Trash, DownloadSimple, FileXls, Barcode, CheckCircle } from '@phosphor-icons/react';
import type { BomItem } from '../../types';

interface BomItemsTableProps {
    jobId: number;
}

export default function BomItemsTable({ jobId }: BomItemsTableProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [editingItem, setEditingItem] = useState<BomItem | null>(null);
    const [generatingItem, setGeneratingItem] = useState<BomItem | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Fetch BOM items
    const { data: bomItems, isLoading } = useQuery({
        queryKey: ['bomItems', jobId],
        queryFn: () => engineeringService.getBomItems(jobId),
    });

    // Fetch tracked parts for this job to show counts per BOM item
    const { data: trackedParts } = useTrackedParts({ jobId });

    // Count tracked parts per BOM item
    const partsCountByBomItem = useMemo(() => {
        const counts: Record<number, number> = {};
        if (Array.isArray(trackedParts)) {
            for (const part of trackedParts) {
                if (part.bomItemId) {
                    counts[part.bomItemId] = (counts[part.bomItemId] || 0) + 1;
                }
            }
        }
        return counts;
    }, [trackedParts]);

    // Delete BOM item mutation
    const deleteMutation = useMutation({
        mutationFn: (bomId: number) => engineeringService.deleteBomItem(jobId, bomId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bomItems', jobId] });
            toast.success('BOM item deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete BOM item');
        },
    });

    // Delete all BOM items mutation
    const deleteAllMutation = useMutation({
        mutationFn: () => engineeringService.deleteAllBomItems(jobId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['bomItems', jobId] });
            toast.success(`Deleted ${data.deleted} BOM items`);
        },
        onError: () => {
            toast.error('Failed to delete BOM items');
        },
    });

    const handleDeleteAll = () => {
        if (confirm(`Delete all ${bomItems?.length} BOM items? This cannot be undone.`)) {
            deleteAllMutation.mutate();
        }
    };

    const handleDelete = (item: BomItem) => {
        if (confirm(`Delete BOM item "${item.partNumber}"?`)) {
            deleteMutation.mutate(item.id);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const blob = await engineeringService.exportBomToCsv(jobId);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from blob or use default
            const date = new Date().toISOString().split('T')[0];
            link.download = `BOM_${date}.csv`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('BOM exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export BOM');
        } finally {
            setExporting(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="text-center text-gray-400">Loading BOM items...</div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Bill of Materials</h3>
                    {bomItems && bomItems.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                            {bomItems.length} items
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {bomItems && bomItems.length > 0 && (
                        <>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleDeleteAll}
                                disabled={deleteAllMutation.isPending}
                            >
                                <Trash size={16} className="mr-2" />
                                Clear All
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                <DownloadSimple size={16} className="mr-2" />
                                {exporting ? 'Exporting...' : 'Export CSV'}
                            </Button>
                        </>
                    )}
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus size={16} className="mr-2" />
                        Add Item
                    </Button>
                </div>
            </div>

            {!bomItems || bomItems.length === 0 ? (
                <Card className="text-center py-12 border border-gray-100">
                    <FileXls size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm font-medium">No BOM items yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                        Upload an Excel file or add items manually
                    </p>
                </Card>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Part Number</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Qty</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Unit</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Material</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Thickness</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Powdercoat</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Route</th>
                                    <th className="text-center py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Parts</th>
                                    <th className="w-32"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {bomItems.map((item) => {
                                    const partsCount = partsCountByBomItem[item.id] || 0;
                                    const allGenerated = partsCount >= item.quantity && item.quantity > 0;

                                    return (
                                        <tr
                                            key={item.id}
                                            className="text-sm text-gray-600 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                {item.partNumber}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {item.description || <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right text-gray-900">
                                                {item.quantity}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {item.unit}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {item.material || <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {item.thickness || <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {item.powdercoat || <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {item.routeTemplateName || <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-center">
                                                {partsCount > 0 ? (
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                                        allGenerated
                                                            ? 'text-emerald-500'
                                                            : 'text-blue-500'
                                                    }`}>
                                                        {allGenerated && <CheckCircle size={12} />}
                                                        {partsCount}/{item.quantity}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {item.routeTemplateId && !allGenerated && (
                                                        <button
                                                            onClick={() => setGeneratingItem(item)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                                                            title="Generate Tracked Parts"
                                                        >
                                                            <Barcode size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <PencilSimple size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                        disabled={deleteMutation.isPending}
                                                        title="Delete"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add BOM Item Modal */}
            <AddBomItemModal
                jobId={jobId}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
            />

            {/* Edit BOM Item Modal */}
            <EditBomItemModal
                jobId={jobId}
                bomItem={editingItem}
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
            />

            {/* Generate Parts Modal */}
            <GeneratePartsModal
                jobId={jobId}
                bomItem={generatingItem}
                isOpen={!!generatingItem}
                onClose={() => setGeneratingItem(null)}
            />
        </div>
    );
}
