import KpiBar from './KpiBar';
import JobQueuePanel from './JobQueuePanel';
import BottleneckAlerts from './BottleneckAlerts';
import { useOeeMetrics } from '../../hooks/useDowntime';
import type { ProductionDashboardData, DashboardMachine } from '../../types';

interface CommandCenterTabProps {
  data: ProductionDashboardData;
}

const statusConfig = {
  running: { dot: 'bg-emerald-500', label: 'Running' },
  idle: { dot: 'bg-gray-300', label: 'Idle' },
  down: { dot: 'bg-red-500', label: 'Down' },
};

function getOeeColor(value: number): string {
  if (value >= 85) return 'text-emerald-400';
  if (value >= 60) return 'text-amber-400';
  return 'text-red-400';
}

export default function CommandCenterTab({ data }: CommandCenterTabProps) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const from = thirtyDaysAgo.toISOString().split('T')[0];
  const to = today.toISOString().split('T')[0];
  const { data: oeeData } = useOeeMetrics(from, to);

  const agg = oeeData?.aggregate;
  const oeeKpis = [
    { label: 'OEE', value: Number(agg?.oee) || 0 },
    { label: 'Availability', value: Number(agg?.availability) || 0 },
    { label: 'Performance', value: Number(agg?.performance) || 0 },
    { label: 'Quality', value: Number(agg?.quality) || 0 },
  ];

  return (
    <div className="space-y-6">
      <KpiBar kpis={data.kpis} />

      {/* OEE Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {oeeKpis.map((kpi) => (
          <div key={kpi.label} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wider font-medium text-gray-400">{kpi.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${getOeeColor(kpi.value)}`}>
              {kpi.value.toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Status */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Machine Status</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.machines.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">No machines configured</p>
            ) : (
              data.machines.map((m: DashboardMachine) => {
                const config = statusConfig[m.status];
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        {m.currentJob && (
                          <p className="text-xs text-gray-400">{m.currentJob.jobNumber}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-gray-400 uppercase">{config.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Job Queue */}
        <JobQueuePanel jobs={data.jobQueue} />
      </div>

      {/* Bottleneck Alerts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Alerts</h3>
        <BottleneckAlerts bottlenecks={data.bottlenecks} />
      </div>
    </div>
  );
}
