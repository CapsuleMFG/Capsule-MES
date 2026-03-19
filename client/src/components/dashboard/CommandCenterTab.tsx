import KpiBar from './KpiBar';
import JobQueuePanel from './JobQueuePanel';
import BottleneckAlerts from './BottleneckAlerts';
import type { ProductionDashboardData, DashboardMachine } from '../../types';

interface CommandCenterTabProps {
  data: ProductionDashboardData;
}

const statusConfig = {
  running: { dot: 'bg-emerald-500', label: 'Running' },
  idle: { dot: 'bg-gray-300', label: 'Idle' },
  down: { dot: 'bg-red-500', label: 'Down' },
};

export default function CommandCenterTab({ data }: CommandCenterTabProps) {
  return (
    <div className="space-y-6">
      <KpiBar kpis={data.kpis} />

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
