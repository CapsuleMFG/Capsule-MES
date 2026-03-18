import { useEffect, useState } from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import { SignOut } from '@phosphor-icons/react';
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
    <div className="bg-gray-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">CAPSULE</h1>
          <div className="h-8 w-px bg-gray-100" />
          <h2 className="text-xl font-semibold text-gray-900">{station.stationName}</h2>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 py-3 px-6 text-base bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors touch-manipulation"
        >
          <SignOut className="w-4 h-4" />
          Log Out
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select Your Machine</h2>
        <p className="text-lg text-gray-400 mb-8">Choose a machine to view its work order queue</p>

        {loading ? (
          <div className="text-lg text-gray-400">Loading machines...</div>
        ) : machines.length === 0 ? (
          <div className="text-lg text-gray-400">No active machines configured</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            {machines.map((machine) => {
              const woCount = getWoCount(machine.id);
              return (
                <button
                  key={machine.id}
                  onClick={() => selectMachine(machine.id, machine.name)}
                  className="bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 rounded-xl p-6 text-left transition-colors touch-manipulation"
                >
                  <div className="text-gray-900 font-semibold text-lg mb-1">{machine.name}</div>
                  {machine.type && (
                    <div className="text-gray-400 text-sm mb-3">{machine.type}</div>
                  )}
                  <div className={`text-sm font-medium ${woCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
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
