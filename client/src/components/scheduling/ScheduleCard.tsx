import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import type { ScheduleEntryWithJob } from '../../types';

interface ScheduleCardProps {
  entry: ScheduleEntryWithJob;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700',
  High: 'bg-amber-50 text-amber-700',
  Medium: 'bg-gray-100 text-gray-500',
  Low: 'bg-gray-100 text-gray-400',
};

const stepStatusColor: Record<string, string> = {
  Completed: 'bg-emerald-500',
  'In Progress': 'bg-amber-500',
  Blocked: 'bg-red-500',
  Queued: 'bg-gray-200',
};

export default function ScheduleCard({ entry, onClick }: ScheduleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, data: { entry } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentStepOrder = entry.routeSteps.find(s => s.id === entry.id)?.stepOrder ?? 0;
  const prevStep = entry.routeSteps.find(s => s.stepOrder === currentStepOrder - 1);
  const isWaiting = prevStep && prevStep.status !== 'Completed';

  const daysLeft = entry.targetEndDate
    ? Math.ceil((new Date(entry.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-sm ring-1 ring-black/[0.02] p-3 cursor-pointer
        transition-shadow hover:shadow-md
        ${isWaiting ? 'opacity-50' : ''}
        ${entry.status === 'In Progress' ? 'border-l-4 border-amber-500' : ''}
        ${entry.status === 'Blocked' ? 'border-l-4 border-red-500' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <DotsSixVertical size={16} weight="bold" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 truncate">{entry.jobNumber}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${priorityColors[entry.priority] || 'bg-gray-100 text-gray-500'}`}>
              {entry.priority}
            </span>
          </div>

          <p className="text-xs text-gray-500 truncate">{entry.jobDescription}</p>
          <p className="text-[11px] text-gray-400 truncate">{entry.clientName}</p>

          {entry.routeSteps.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-0.5">
                {entry.routeSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`h-1 flex-1 rounded-full ${stepStatusColor[step.status] || 'bg-gray-200'}`}
                    title={`${step.stepName}: ${step.status}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 truncate">
                {entry.routeSteps.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ' \u2192 '}
                    <span className={s.id === entry.id ? 'font-semibold text-gray-600' : ''}>
                      {s.status === 'Completed' ? `${s.stepName}\u2713` : s.stepName}
                    </span>
                  </span>
                ))}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            {entry.targetEndDate && (
              <span className={`text-[10px] ${daysLeft !== null && daysLeft <= 2 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {daysLeft !== null && daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
              </span>
            )}
            {isWaiting && (
              <span className="text-[10px] text-gray-400">Waiting on {prevStep?.stepName}</span>
            )}
            {entry.status === 'Blocked' && entry.blockedReason && (
              <span className="text-[10px] text-red-600 truncate">{entry.blockedReason}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
