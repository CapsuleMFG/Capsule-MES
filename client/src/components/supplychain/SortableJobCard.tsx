import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../ui/Card';
import type { Job } from '../../types';

interface SortableJobCardProps {
    job: Job;
    priority: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    isDragDisabled: boolean;
    children?: React.ReactNode;
}

export default function SortableJobCard({
    job,
    priority,
    isExpanded,
    onToggleExpand,
    isDragDisabled,
    children,
}: SortableJobCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: job.id,
        disabled: isDragDisabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`p-0 overflow-hidden ${isDragging ? 'ring-2 ring-rivian-accent shadow-lg' : ''}`}>
                {/* Job Header */}
                <div className="flex items-center">
                    {/* Drag Handle + Priority Badge */}
                    {!isDragDisabled && (
                        <div
                            className="flex items-center gap-2 pl-3 pr-1 py-5 cursor-grab active:cursor-grabbing self-stretch"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="w-5 h-5 text-gray-500" />
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-rivian-accent/20 text-rivian-accent text-sm font-bold">
                                {priority}
                            </span>
                        </div>
                    )}

                    {/* Priority badge when drag disabled (filtered state) */}
                    {isDragDisabled && (
                        <div className="flex items-center gap-2 pl-4 pr-1 py-5">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-gray-400 text-sm font-bold">
                                {priority}
                            </span>
                        </div>
                    )}

                    {/* Job Info */}
                    <div
                        className="flex-1 p-5 pl-2 cursor-pointer hover:bg-rivian-hover transition-colors"
                        onClick={onToggleExpand}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold text-white">{job.jobNumber}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        job.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                        job.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                        job.priority === 'Medium' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {job.priority}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400">{job.clientName}</p>
                                <p className="text-gray-300 text-sm mt-1">{job.description}</p>
                            </div>
                            <div className="ml-4">
                                {isExpanded ? (
                                    <ChevronUp className="w-6 h-6 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="border-t border-gray-800 p-6 bg-rivian-black space-y-6">
                        {children}
                    </div>
                )}
            </Card>
        </div>
    );
}
