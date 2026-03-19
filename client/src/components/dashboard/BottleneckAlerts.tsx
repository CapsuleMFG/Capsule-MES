import { Warning, Prohibit, Clock } from '@phosphor-icons/react';
import type { Bottleneck } from '../../types';

interface BottleneckAlertsProps {
  bottlenecks: Bottleneck[];
}

const iconMap = {
  machine_down: Prohibit,
  job_blocked: Warning,
  job_overdue: Clock,
};

export default function BottleneckAlerts({ bottlenecks }: BottleneckAlertsProps) {
  if (bottlenecks.length === 0) {
    return (
      <div className="bg-emerald-50 rounded-2xl p-4">
        <p className="text-sm text-emerald-700 font-medium">No bottlenecks detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bottlenecks.map((b, i) => {
        const Icon = iconMap[b.type] || Warning;
        const isCritical = b.severity === 'critical';
        return (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
              isCritical ? 'bg-red-50' : 'bg-amber-50'
            }`}
          >
            <Icon
              size={18}
              weight="regular"
              className={isCritical ? 'text-red-500 flex-shrink-0' : 'text-amber-500 flex-shrink-0'}
            />
            <p className={`text-sm font-medium ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
              {b.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
