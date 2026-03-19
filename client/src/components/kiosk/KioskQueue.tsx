import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as schedulingService from '../../services/scheduling.service';
import KioskFlagModal from './KioskFlagModal';
import type { ScheduleEntryWithJob } from '../../types';

interface KioskQueueProps {
  machineId: number;
  machineName: string;
}

const statusColors: Record<string, string> = {
  Queued: 'bg-gray-100 text-gray-500',
  'In Progress': 'bg-amber-50 text-amber-700',
  Blocked: 'bg-red-50 text-red-700',
};

export default function KioskQueue({ machineId, machineName }: KioskQueueProps) {
  const [flagEntry, setFlagEntry] = useState<ScheduleEntryWithJob | null>(null);
  const queryClient = useQueryClient();

  const { data: queues, isLoading } = useQuery({
    queryKey: ['scheduling', 'board'],
    queryFn: schedulingService.getSchedule,
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, blockedReason }: { id: number; status: string; blockedReason?: string }) =>
      schedulingService.updateScheduleStatus(id, { status: status as any, blockedReason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduling'] }),
  });

  const machineQueue = queues?.find(q => q.machineId === machineId);
  const entries = machineQueue?.entries || [];

  const canStart = (entry: ScheduleEntryWithJob) => {
    if (entry.status !== 'Queued') return false;
    const currentOrder = entry.routeSteps.find(s => s.id === entry.id)?.stepOrder ?? 0;
    const prevStep = entry.routeSteps.find(s => s.stepOrder === currentOrder - 1);
    return !prevStep || prevStep.status === 'Completed';
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Loading queue...</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Queue — {machineName}
        <span className="text-sm font-normal text-gray-400 ml-2">{entries.length} jobs</span>
      </h3>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No jobs scheduled</p>
          <p className="text-sm mt-1">Check back later or contact your supervisor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const isActive = entry.status === 'In Progress';
            const startable = canStart(entry);
            const isWaiting = !startable && entry.status === 'Queued';

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-4 ${
                  isActive ? 'ring-2 ring-amber-400' : ''
                } ${isWaiting ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-base font-semibold text-gray-900">{entry.jobNumber}</span>
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[entry.status] || 'bg-gray-100 text-gray-500'}`}>
                      {entry.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">#{idx + 1}</span>
                </div>

                <p className="text-sm text-gray-600">{entry.stepName}</p>
                <p className="text-xs text-gray-400 mt-1">{entry.jobDescription} — {entry.clientName}</p>

                {isWaiting && (
                  <p className="text-xs text-gray-400 mt-2">Waiting on previous step to complete</p>
                )}

                {entry.status === 'Blocked' && entry.blockedReason && (
                  <p className="text-xs text-red-600 mt-2">{entry.blockedReason}</p>
                )}

                <div className="flex gap-2 mt-3">
                  {entry.status === 'Queued' && startable && (
                    <button
                      onClick={() => updateStatus.mutate({ id: entry.id, status: 'In Progress' })}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 px-4 rounded-xl active:scale-[0.98] transition-all"
                    >
                      Start
                    </button>
                  )}
                  {entry.status === 'In Progress' && (
                    <>
                      <button
                        onClick={() => updateStatus.mutate({ id: entry.id, status: 'Completed' })}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 px-4 rounded-xl active:scale-[0.98] transition-all"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => setFlagEntry(entry)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium py-3 px-4 rounded-xl active:scale-[0.98] transition-all"
                      >
                        Flag Issue
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {flagEntry && (
        <KioskFlagModal
          isOpen={!!flagEntry}
          onClose={() => setFlagEntry(null)}
          jobNumber={flagEntry.jobNumber}
          onSubmit={(reason) => {
            updateStatus.mutate({ id: flagEntry.id, status: 'Blocked', blockedReason: reason });
            setFlagEntry(null);
          }}
        />
      )}
    </div>
  );
}
