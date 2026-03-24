import { useState, useMemo } from 'react';
import {
  useDowntimeAnalytics,
  useDowntimeEvents,
  useCreateDowntimeEvent,
  useResolveDowntimeEvent,
} from '../../hooks/useDowntime';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import type { DowntimeCategory, DowntimeAnalytics } from '../../types';

interface DowntimeTabProps {
  machines: { id: number; name: string }[];
}

const CATEGORIES: DowntimeCategory[] = [
  'Mechanical',
  'Electrical',
  'Material',
  'Changeover',
  'Planned Maintenance',
  'Operator',
  'Quality',
  'Other',
];

function formatHours(minutes: number): string {
  const hrs = minutes / 60;
  return hrs < 0.1 ? '< 0.1' : hrs.toFixed(1);
}

export default function DowntimeTab({ machines }: DowntimeTabProps) {
  const toast = useToast();

  // Date range state (default last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);

  // Data queries
  const { data: analytics } = useDowntimeAnalytics(fromDate, toDate);
  const { data: events } = useDowntimeEvents({ from: fromDate, to: toDate });
  const createEvent = useCreateDowntimeEvent();
  const resolveEvent = useResolveDowntimeEvent();

  // Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logMachineId, setLogMachineId] = useState<number | ''>('');
  const [logCategory, setLogCategory] = useState<DowntimeCategory | ''>('');
  const [logReason, setLogReason] = useState('');

  // Active (unresolved) events
  const activeEvents = useMemo(
    () => (events ?? []).filter((e) => !e.endedAt),
    [events]
  );

  // Category breakdown — compute max for bar widths
  const maxCategoryMinutes = useMemo(() => {
    if (!analytics?.byCategory.length) return 1;
    return Math.max(...analytics.byCategory.map((c: DowntimeAnalytics['byCategory'][number]) => c.totalMinutes), 1);
  }, [analytics]);

  const handleLogSubmit = () => {
    if (!logMachineId || !logCategory) return;
    createEvent.mutate(
      { machineId: logMachineId as number, category: logCategory, reason: logReason || undefined },
      {
        onSuccess: () => {
          toast.success('Downtime event logged');
          setShowLogModal(false);
          setLogMachineId('');
          setLogCategory('');
          setLogReason('');
        },
        onError: () => toast.error('Failed to log downtime event'),
      }
    );
  };

  const handleResolve = (id: number) => {
    resolveEvent.mutate(
      { id },
      {
        onSuccess: () => toast.success('Downtime event resolved'),
        onError: () => toast.error('Failed to resolve event'),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Date range filter + Log button */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-3 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md"
        >
          Log Downtime
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider font-medium text-gray-400">Total Downtime</p>
          <p className="text-2xl font-semibold text-gray-100 mt-1">
            {formatHours(analytics?.totalDowntimeMinutes ?? 0)}h
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider font-medium text-gray-400">Total Events</p>
          <p className="text-2xl font-semibold text-gray-100 mt-1">
            {analytics?.totalEvents ?? 0}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider font-medium text-gray-400">MTTR</p>
          <p className="text-2xl font-semibold text-gray-100 mt-1">
            {formatHours(analytics?.mttr ?? 0)}h
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider font-medium text-gray-400">MTBF</p>
          <p className="text-2xl font-semibold text-gray-100 mt-1">
            {formatHours(analytics?.mtbf ?? 0)}h
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-100 mb-4">Downtime by Category</h3>
          <div className="space-y-3">
            {(analytics?.byCategory ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No downtime data for this period</p>
            ) : (
              analytics!.byCategory.map((cat: DowntimeAnalytics['byCategory'][number]) => {
                const pct = (cat.totalMinutes / maxCategoryMinutes) * 100;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{cat.category}</span>
                      <span className="text-xs text-gray-400">
                        {cat.count} events &middot; {formatHours(cat.totalMinutes)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded h-2">
                      <div
                        className="bg-blue-500 rounded h-2 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Machine breakdown table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-100 mb-4">Downtime by Machine</h3>
          {(analytics?.byMachine ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No downtime data for this period</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                  <th className="text-left pb-2">Machine</th>
                  <th className="text-right pb-2">Events</th>
                  <th className="text-right pb-2">Total (h)</th>
                  <th className="text-right pb-2">Avg (h)</th>
                </tr>
              </thead>
              <tbody>
                {analytics!.byMachine.map((m: DowntimeAnalytics['byMachine'][number]) => (
                  <tr key={m.machineId} className="text-gray-300 border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-2">{m.machineName}</td>
                    <td className="py-2 text-right">{m.count}</td>
                    <td className="py-2 text-right">{formatHours(m.totalMinutes)}</td>
                    <td className="py-2 text-right">
                      {m.count > 0 ? formatHours(m.totalMinutes / m.count) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Active downtime events */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-100 mb-4">
          Active Downtime Events
          {activeEvents.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">({activeEvents.length})</span>
          )}
        </h3>
        {activeEvents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No active downtime events</p>
        ) : (
          <div className="space-y-2">
            {activeEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div>
                    <p className="text-sm text-gray-200">{evt.machineName ?? `Machine #${evt.machineId}`}</p>
                    <p className="text-xs text-gray-400">
                      <span className="inline-block bg-gray-700 rounded px-1.5 py-0.5 mr-2 text-gray-300">
                        {evt.category}
                      </span>
                      {evt.reason && <span>{evt.reason}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {new Date(evt.startedAt).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleResolve(evt.id)}
                    disabled={resolveEvent.isPending}
                    className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-medium px-2 py-1 rounded-md disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Downtime Modal */}
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Log Downtime Event">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Machine</label>
            <select
              value={logMachineId}
              onChange={(e) => setLogMachineId(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a machine...</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={logCategory}
              onChange={(e) => setLogCategory(e.target.value as DowntimeCategory)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Reason</label>
            <input
              type="text"
              value={logReason}
              onChange={(e) => setLogReason(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowLogModal(false)}
              className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-sm font-medium px-3 py-1.5 rounded-md flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleLogSubmit}
              disabled={!logMachineId || !logCategory || createEvent.isPending}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md flex-1 disabled:opacity-50"
            >
              Log Event
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
