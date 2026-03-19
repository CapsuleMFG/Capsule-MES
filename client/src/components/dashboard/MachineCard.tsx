import type { DashboardMachine } from '../../types';

interface MachineCardProps {
  machine: DashboardMachine;
}

const statusConfig = {
  running: { dot: 'bg-emerald-500', label: 'Running' },
  idle: { dot: 'bg-gray-300', label: 'Idle' },
  down: { dot: 'bg-red-500', label: 'Down' },
};

export default function MachineCard({ machine }: MachineCardProps) {
  const config = statusConfig[machine.status];

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
          <h3 className="text-sm font-semibold text-gray-900">{machine.name}</h3>
        </div>
        <span className="text-[11px] font-medium text-gray-400 uppercase">{config.label}</span>
      </div>

      {machine.type && (
        <p className="text-xs text-gray-400 mb-3">{machine.type}</p>
      )}

      {machine.status === 'running' && machine.currentJob && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{machine.currentJob.jobNumber}</span>
            {' '}&middot; {machine.currentJob.description}
          </p>
          {machine.currentOperator && (
            <p className="text-xs text-gray-400">Operator: {machine.currentOperator}</p>
          )}
          {machine.currentPart && machine.currentPart.total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Parts</span>
                <span>{machine.currentPart.completed}/{machine.currentPart.total}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(machine.currentPart.completed / machine.currentPart.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {machine.status === 'idle' && (
        <div>
          {machine.nextJob ? (
            <p className="text-sm text-gray-400">Next: <span className="text-gray-600">{machine.nextJob.jobNumber}</span></p>
          ) : (
            <p className="text-sm text-gray-400">No job assigned</p>
          )}
        </div>
      )}

      {machine.status === 'down' && (
        <div>
          {machine.downReason && (
            <p className="text-sm text-red-600">{machine.downReason}</p>
          )}
          {machine.downSince && (
            <p className="text-xs text-gray-400 mt-1">Since {new Date(machine.downSince).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
