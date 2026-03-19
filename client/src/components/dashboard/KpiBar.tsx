import type { ProductionDashboardData } from '../../types';

interface KpiBarProps {
  kpis: ProductionDashboardData['kpis'];
}

export default function KpiBar({ kpis }: KpiBarProps) {
  const items = [
    { label: 'Active Jobs', value: kpis.activeJobs },
    { label: 'Parts Today', value: kpis.partsCompletedToday },
    { label: 'On-Time Rate', value: `${kpis.onTimeRate}%` },
    { label: 'Blocked', value: kpis.blockedJobs, alert: kpis.blockedJobs > 0 },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5">
          <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">{item.label}</p>
          <p className={`text-2xl font-semibold mt-1 ${item.alert ? 'text-red-600' : 'text-gray-900'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
