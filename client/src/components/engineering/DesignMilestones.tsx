import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { CheckCircle2, Circle, Clock, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { DesignMilestone, DesignMilestoneStatus } from '../../types';

interface DesignMilestonesProps {
    jobId: number;
}

export default function DesignMilestones({ jobId }: DesignMilestonesProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        milestoneName: '',
        status: '' as DesignMilestoneStatus,
        targetDate: '',
        completedDate: '',
        notes: '',
    });
    const [newMilestoneName, setNewMilestoneName] = useState('');
    const [newTargetDate, setNewTargetDate] = useState('');

    // Fetch milestones
    const { data: milestones, isLoading } = useQuery({
        queryKey: ['designMilestones', jobId],
        queryFn: () => engineeringService.getDesignMilestones(jobId),
    });

    // Create single milestone mutation
    const createMutation = useMutation({
        mutationFn: (data: { milestoneName: string; targetDate?: string }) =>
            engineeringService.createSingleMilestone(jobId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['designMilestones', jobId] });
            toast.success('Milestone added!');
            setNewMilestoneName('');
            setNewTargetDate('');
        },
        onError: () => {
            toast.error('Failed to add milestone.');
        },
    });

    // Update milestone mutation
    const updateMutation = useMutation({
        mutationFn: ({ milestoneId, data }: { milestoneId: number; data: any }) =>
            engineeringService.updateDesignMilestone(jobId, milestoneId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['designMilestones', jobId] });
            toast.success('Milestone updated!');
            setEditingId(null);
        },
        onError: () => {
            toast.error('Failed to update milestone.');
        },
    });

    // Delete milestone mutation
    const deleteMutation = useMutation({
        mutationFn: (milestoneId: number) =>
            engineeringService.deleteDesignMilestone(jobId, milestoneId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['designMilestones', jobId] });
            toast.success('Milestone deleted!');
        },
        onError: () => {
            toast.error('Failed to delete milestone.');
        },
    });

    const handleEdit = (milestone: DesignMilestone) => {
        setEditingId(milestone.id);
        setEditForm({
            milestoneName: milestone.milestoneName,
            status: milestone.status,
            targetDate: milestone.targetDate || '',
            completedDate: milestone.completedDate || '',
            notes: milestone.notes || '',
        });
    };

    const handleSave = (milestoneId: number) => {
        updateMutation.mutate({
            milestoneId,
            data: {
                milestoneName: editForm.milestoneName,
                status: editForm.status,
                targetDate: editForm.targetDate || undefined,
                completedDate: editForm.completedDate || undefined,
                notes: editForm.notes || undefined,
            },
        });
    };

    const handleAdd = () => {
        if (!newMilestoneName.trim()) return;
        createMutation.mutate({
            milestoneName: newMilestoneName.trim(),
            targetDate: newTargetDate || undefined,
        });
    };

    const handleDelete = (milestone: DesignMilestone) => {
        if (confirm(`Delete milestone "${milestone.milestoneName}"?`)) {
            deleteMutation.mutate(milestone.id);
        }
    };

    const getStatusIcon = (status: DesignMilestoneStatus) => {
        switch (status) {
            case 'Completed':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'In Progress':
                return <Clock className="w-5 h-5 text-blue-500" />;
            default:
                return <Circle className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: DesignMilestoneStatus) => {
        switch (status) {
            case 'Completed':
                return 'bg-green-100 text-green-800';
            case 'In Progress':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const isOverdue = (milestone: DesignMilestone) => {
        if (!milestone.targetDate || milestone.status === 'Completed') return false;
        return new Date(milestone.targetDate) < new Date();
    };

    if (isLoading) {
        return <div>Loading milestones...</div>;
    }

    if (!milestones || milestones.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Design Milestones</h3>
                    <p className="text-gray-400 mb-4">No milestones set up for this job yet.</p>
                    
                    {/* Add new milestone form */}
                    <div className="text-left">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Add First Milestone</h4>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Input
                                    placeholder="Milestone name..."
                                    value={newMilestoneName}
                                    onChange={(e) => setNewMilestoneName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                />
                            </div>
                            <div className="w-44">
                                <input
                                    type="date"
                                    value={newTargetDate}
                                    onChange={(e) => setNewTargetDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white text-sm"
                                    placeholder="Target date"
                                />
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleAdd}
                                disabled={!newMilestoneName.trim() || createMutation.isPending}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Design Milestones</h3>

            <div className="space-y-4">
                {milestones.map((milestone, index) => (
                    <div
                        key={milestone.id}
                        className="relative pl-8 pb-4 last:pb-0"
                    >
                        {/* Vertical line */}
                        {index < milestones.length - 1 && (
                            <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-700" />
                        )}

                        {/* Status icon */}
                        <div className="absolute left-0 top-1">
                            {getStatusIcon(milestone.status)}
                        </div>

                        {editingId === milestone.id ? (
                            // Edit mode
                            <div className="bg-rivian-hover rounded-lg p-4 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Milestone Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.milestoneName}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, milestoneName: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, status: e.target.value as DesignMilestoneStatus })
                                        }
                                        className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white"
                                    >
                                        <option value="Not Started">Not Started</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Target Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.targetDate}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, targetDate: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Completed Date
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.completedDate}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, completedDate: e.target.value })
                                        }
                                        className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={editForm.notes}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, notes: e.target.value })
                                        }
                                        rows={2}
                                        className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleSave(milestone.id)}
                                        disabled={updateMutation.isPending}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // View mode
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex-1 cursor-pointer hover:bg-rivian-hover rounded-lg p-3 transition-colors"
                                    onClick={() => handleEdit(milestone)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-white">{milestone.milestoneName}</h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(milestone.status)}`}>
                                            {milestone.status}
                                        </span>
                                    </div>
                                    {milestone.targetDate && (
                                        <p className={`text-sm mb-1 ${
                                            isOverdue(milestone) ? 'text-red-400 font-medium' : 'text-gray-400'
                                        }`}>
                                            {isOverdue(milestone) && <AlertCircle className="w-3.5 h-3.5 inline mr-1" />}
                                            Target: {new Date(milestone.targetDate).toLocaleDateString()}
                                            {isOverdue(milestone) && ' (Overdue)'}
                                        </p>
                                    )}
                                    {milestone.completedDate && (
                                        <p className="text-sm text-gray-400">
                                            Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                                        </p>
                                    )}
                                    {milestone.notes && (
                                        <p className="text-sm text-gray-300 mt-1">{milestone.notes}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(milestone)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                    title="Delete milestone"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add new milestone form */}
            <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Add Custom Milestone</h4>
                <div className="flex gap-3">
                    <div className="flex-1">
                        <Input
                            placeholder="Milestone name..."
                            value={newMilestoneName}
                            onChange={(e) => setNewMilestoneName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </div>
                    <div className="w-44">
                        <input
                            type="date"
                            value={newTargetDate}
                            onChange={(e) => setNewTargetDate(e.target.value)}
                            className="w-full px-3 py-2 bg-rivian-soft-black border border-gray-700 rounded-lg text-white text-sm"
                            placeholder="Target date"
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={handleAdd}
                        disabled={!newMilestoneName.trim() || createMutation.isPending}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
