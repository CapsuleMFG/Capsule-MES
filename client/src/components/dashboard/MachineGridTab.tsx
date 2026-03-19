import MachineCard from './MachineCard';
import type { DashboardMachine } from '../../types';

interface MachineGridTabProps {
  machines: DashboardMachine[];
}

export default function MachineGridTab({ machines }: MachineGridTabProps) {
  if (machines.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">No machines configured</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {machines.map((machine) => (
        <MachineCard key={machine.id} machine={machine} />
      ))}
    </div>
  );
}
