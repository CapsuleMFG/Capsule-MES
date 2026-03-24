import { useState } from 'react';
import { useProductionDashboard } from '../hooks/useDashboard';
import CommandCenterTab from '../components/dashboard/CommandCenterTab';
import MachineGridTab from '../components/dashboard/MachineGridTab';
import DowntimeTab from '../components/dashboard/DowntimeTab';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ProductionDashboard() {
  const [activeTab, setActiveTab] = useState<'command' | 'grid' | 'downtime'>('command');
  const refetchInterval = activeTab === 'command' ? 30000 : 15000;
  const { data, isLoading, error } = useProductionDashboard(refetchInterval);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-600">Failed to load dashboard data</p>
      </div>
    );
  }

  const tabs = [
    { id: 'command' as const, label: 'Command Center' },
    { id: 'grid' as const, label: 'Machine Grid' },
    { id: 'downtime' as const, label: 'Downtime' },
  ];

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 pb-3 pt-0 text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'command' ? (
        <CommandCenterTab data={data} />
      ) : activeTab === 'grid' ? (
        <MachineGridTab machines={data.machines} />
      ) : (
        <DowntimeTab machines={data.machines.map((m) => ({ id: m.id, name: m.name }))} />
      )}
    </div>
  );
}
