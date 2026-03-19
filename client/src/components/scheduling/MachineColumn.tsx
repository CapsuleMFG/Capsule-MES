import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ScheduleCard from './ScheduleCard';
import type { MachineQueue } from '../../types';

interface MachineColumnProps {
  queue: MachineQueue;
  onCardClick?: (entryId: number) => void;
}

export default function MachineColumn({ queue, onCardClick }: MachineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `machine-${queue.machineId}` });

  const activeCount = queue.entries.filter(e => e.status === 'In Progress').length;
  const blockedCount = queue.entries.filter(e => e.status === 'Blocked').length;

  const statusDot = blockedCount > 0
    ? 'bg-red-500'
    : activeCount > 0
    ? 'bg-emerald-500'
    : 'bg-gray-300';

  return (
    <div className="flex-shrink-0 w-[260px]">
      <div className="bg-white rounded-t-xl px-3 py-2.5 border-b border-gray-100 ring-1 ring-black/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
            <h3 className="text-sm font-semibold text-gray-900">{queue.machineName}</h3>
          </div>
          <span className="text-[11px] text-gray-400">{queue.entries.length}</span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`
          bg-gray-50/50 rounded-b-xl ring-1 ring-black/[0.02] p-2 space-y-2
          min-h-[200px] max-h-[calc(100vh-240px)] overflow-y-auto
          transition-colors
          ${isOver ? 'bg-blue-50/50 ring-blue-200' : ''}
        `}
      >
        <SortableContext
          items={queue.entries.map(e => e.id)}
          strategy={verticalListSortingStrategy}
        >
          {queue.entries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No jobs queued</p>
          ) : (
            queue.entries.map((entry) => (
              <ScheduleCard
                key={entry.id}
                entry={entry}
                onClick={() => onCardClick?.(entry.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
