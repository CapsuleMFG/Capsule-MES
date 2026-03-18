import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, CaretDown, CaretUp } from '@phosphor-icons/react';
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
            <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden hover:shadow-md transition-shadow ${isDragging ? 'ring-2 ring-blue-500' : ''}`}>
                {/* Job Header */}
                <div className="flex items-center">
                    {/* Drag Handle + Priority Badge */}
                    {!isDragDisabled && (
                        <div
                            className="flex items-center gap-2 pl-3 pr-1 py-5 cursor-grab active:cursor-grabbing self-stretch"
                            {...attributes}
                            {...listeners}
                        >
                            <DotsSixVertical size={16} className="text-gray-400" />
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                                {priority}
                            </span>
                        </div>
                    )}

                    {/* Priority badge when drag disabled (filtered state) */}
                    {isDragDisabled && (
                        <div className="flex items-center gap-2 pl-4 pr-1 py-5">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-sm font-bold">
                                {priority}
                            </span>
                        </div>
                    )}

                    {/* Job Info */}
                    <div
                        className="flex-1 p-5 pl-2 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={onToggleExpand}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900">{job.jobNumber}</h3>
                                    <span className={`text-xs font-medium ${
                                        job.priority === 'Critical' ? 'text-red-400' :
                                        job.priority === 'High' ? 'text-amber-500' :
                                        job.priority === 'Medium' ? 'text-blue-400' :
                                        'text-gray-400'
                                    }`}>
                                        {job.priority}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400">{job.clientName}</p>
                                <p className="text-gray-600 text-sm mt-1">{job.description}</p>
                            </div>
                            <div className="ml-4">
                                {isExpanded ? (
                                    <CaretUp size={20} className="text-gray-400" />
                                ) : (
                                    <CaretDown size={20} className="text-gray-400" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50 space-y-6">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
