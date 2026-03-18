import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import Card from '../ui/Card';
import Button from '../ui/Button';
import AddPbomItemModal from './AddPbomItemModal';
import EditPbomItemModal from './EditPbomItemModal';
import { Plus, PencilSimple, Trash, PaperPlaneTilt, FileXls } from '@phosphor-icons/react';
import type { PbomItem } from '../../types';

interface PbomTableEngineeringProps {
    jobId: number;
}

export default function PbomTableEngineering({ jobId }: PbomTableEngineeringProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [editingItem, setEditingItem] = useState<PbomItem | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch PBOM items
    const { data: pbomItems, isLoading } = useQuery({
        queryKey: ['pbomItems', jobId],
        queryFn: () => engineeringService.getPbomItems(jobId),
    });

    // Check if any items have been sent to Supply Chain
    const isSentToSc = pbomItems?.some(item => item.sentToSc) || false;

    // Delete PBOM item mutation
    const deleteMutation = useMutation({
        mutationFn: (pbomId: number) => engineeringService.deletePbomItem(jobId, pbomId),
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['pbomItems', jobId] });
            toast.success('PBOM item deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete PBOM item');
        },
    });

    // Delete all PBOM items mutation
    const deleteAllMutation = useMutation({
        mutationFn: () => engineeringService.deleteAllPbomItems(jobId),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: ['pbomItems', jobId] });
            toast.success(`Deleted ${data.deleted} PBOM items`);
        },
        onError: () => {
            toast.error('Failed to delete PBOM items');
        },
    });

    const handleDeleteAll = () => {
        if (confirm(`Delete all ${pbomItems?.length} PBOM items? Items already sent to Supply Chain will be kept. This cannot be undone.`)) {
            deleteAllMutation.mutate();
        }
    };

    // Send to Supply Chain mutation
    const sendToScMutation = useMutation({
        mutationFn: () => engineeringService.sendPbomToSupplyChain(jobId),
        onSuccess: async (data) => {
            // Force immediate refetch to show auto-matched inventory data
            await queryClient.refetchQueries({ queryKey: ['pbomItems', jobId] });
            toast.success(`PBOM sent to Supply Chain! (${data.itemCount} items${(data as any).matchedCount ? `, ${(data as any).matchedCount} auto-linked to inventory` : ''})`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to send PBOM to Supply Chain');
        },
    });

    const handleDelete = (item: PbomItem) => {
        if (confirm(`Delete PBOM item "${item.description}"?`)) {
            deleteMutation.mutate(item.id);
        }
    };

    const handleSendToSupplyChain = () => {
        if (!pbomItems || pbomItems.length === 0) {
            toast.error('No PBOM items to send');
            return;
        }

        if (confirm(`Send ${pbomItems.length} PBOM items to Supply Chain? Supply Chain will be notified and can begin procurement.`)) {
            sendToScMutation.mutate();
        }
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
                    <h3 className="text-lg font-semibold text-gray-900">Production Bill of Materials (PBOM)</h3>
                    {pbomItems && pbomItems.length > 0 && (
                        <p className="text-sm text-gray-400 mt-1">
                            {pbomItems.length} items
                            {isSentToSc && <span className="ml-2 text-emerald-500">• Sent to Supply Chain</span>}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {pbomItems && pbomItems.length > 0 && (
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
                                variant="primary"
                                size="sm"
                                onClick={handleSendToSupplyChain}
                                disabled={sendToScMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <PaperPlaneTilt size={16} className="mr-2" />
                                {sendToScMutation.isPending ? 'Sending...' : isSentToSc ? 'Resend to Supply Chain' : 'Send to Supply Chain'}
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

            {isSentToSc && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <p className="text-sm text-emerald-600">
                        ✓ This PBOM has been sent to Supply Chain. You can still make changes if needed.
                    </p>
                </div>
            )}

            {!pbomItems || pbomItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FileXls size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No PBOM items yet</p>
                    <p className="text-gray-400 text-xs mt-2">
                        Add items to create a Production Bill of Materials
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                                <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Qty Req'd</th>
                                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Mfr/Vendor</th>
                                <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Part #</th>
                                <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pbomItems.map((item) => (
                                <tr
                                    key={item.id}
                                    className="text-sm text-gray-600 border-b border-gray-50 hover:bg-gray-50"
                                >
                                    <td className="py-3 px-4 text-sm text-gray-900">
                                        {item.description}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                                        {item.qtyRequired}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {item.mfrVendor || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">
                                        {item.mfrVendorPart || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setEditingItem(item)}
                                                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                                                title="Edit"
                                            >
                                                <PencilSimple size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                disabled={deleteMutation.isPending}
                                                title="Delete"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add PBOM Item Modal */}
            <AddPbomItemModal
                jobId={jobId}
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
            />

            {/* Edit PBOM Item Modal */}
            <EditPbomItemModal
                jobId={jobId}
                pbomItem={editingItem}
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
            />
        </Card>
    );
}
