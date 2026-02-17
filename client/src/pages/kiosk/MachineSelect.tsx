import { useEffect, useState } from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import { LogOut } from 'lucide-react';
import * as productionService from '../../services/production.service';
import type { Machine, WorkOrder } from '../../../../shared/types';

export default function MachineSelect() {
  const { station, selectMachine, logout } = useKiosk();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, wo] = await Promise.all([
          productionService.getMachines(),
          productionService.getProductionPool(),
        ]);
        setMachines(m.filter(machine => machine.active));
        setWorkOrders(wo);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!station) return null;

  const getWoCount = (machineId: number) =>
    workOrders.filter(wo => wo.assignedMachineId === machineId && wo.productionStatus !== 'Completed' && wo.productionStatus !== 'Discarded').length;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-amber-500">CAPSULE</h1>
          <div className="h-8 w-px bg-gray-700" />
          <h2 className="text-xl font-semibold text-white">{station.stationName}</h2>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors touch-manipulation"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Select Your Machine</h2>
        <p className="text-gray-400 mb-8">Choose a machine to view its work order queue</p>

        {loading ? (
          <div className="text-gray-400 text-lg">Loading machines...</div>
        ) : machines.length === 0 ? (
          <div className="text-gray-500 text-lg">No active machines configured</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            {machines.map((machine) => {
              const woCount = getWoCount(machine.id);
              return (
                <button
                  key={machine.id}
                  onClick={() => selectMachine(machine.id, machine.name)}
                  className="bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-amber-500/50 rounded-xl p-6 text-left transition-colors touch-manipulation"
                >
                  <div className="text-white font-semibold text-lg mb-1">{machine.name}</div>
                  {machine.type && (
                    <div className="text-gray-500 text-sm mb-3">{machine.type}</div>
                  )}
                  <div className={`text-sm font-medium ${woCount > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                    {woCount} work order{woCount !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
