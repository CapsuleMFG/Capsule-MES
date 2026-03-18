import { useState } from 'react';
import { Plus, Trash, DotsSixVertical, PencilSimple, Check, X } from '@phosphor-icons/react';
import type { RouteTemplateStep, Machine } from '../../../../shared/types';

interface RouteStepEditorProps {
  steps: RouteTemplateStep[];
  machines: Machine[];
  onAddStep: (data: { stationName: string; machineId?: number; estimatedMinutes?: number; notes?: string }) => void;
  onUpdateStep: (stepId: number, data: { stationName?: string; machineId?: number; estimatedMinutes?: number; notes?: string }) => void;
  onDeleteStep: (stepId: number) => void;
  onReorder: (stepIds: number[]) => void;
  isAdding: boolean;
}

export default function RouteStepEditor({ steps, machines, onAddStep, onUpdateStep, onDeleteStep, onReorder, isAdding }: RouteStepEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [newStep, setNewStep] = useState({ stationName: '', machineId: '', estimatedMinutes: '', notes: '' });
  const [editStep, setEditStep] = useState({ stationName: '', machineId: '', estimatedMinutes: '', notes: '' });

  const handleAdd = () => {
    if (!newStep.stationName.trim()) return;
    onAddStep({
      stationName: newStep.stationName,
      machineId: newStep.machineId ? Number(newStep.machineId) : undefined,
      estimatedMinutes: newStep.estimatedMinutes ? Number(newStep.estimatedMinutes) : undefined,
      notes: newStep.notes || undefined,
    });
    setNewStep({ stationName: '', machineId: '', estimatedMinutes: '', notes: '' });
    setShowAddForm(false);
  };

  const startEdit = (step: RouteTemplateStep) => {
    setEditingStepId(step.id);
    setEditStep({
      stationName: step.stationName,
      machineId: step.machineId ? String(step.machineId) : '',
      estimatedMinutes: step.estimatedMinutes ? String(step.estimatedMinutes) : '',
      notes: step.notes || '',
    });
  };

  const saveEdit = (stepId: number) => {
    onUpdateStep(stepId, {
      stationName: editStep.stationName,
      machineId: editStep.machineId ? Number(editStep.machineId) : undefined,
      estimatedMinutes: editStep.estimatedMinutes ? Number(editStep.estimatedMinutes) : undefined,
      notes: editStep.notes || undefined,
    });
    setEditingStepId(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSteps.length) return;
    [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
    onReorder(newSteps.map(s => s.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-600">Route Steps ({steps.length})</h4>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors"
          >
            <Plus size={16} />
            Add Step
          </button>
        )}
      </div>

      {steps.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-400 italic">No steps defined. Add steps to define the manufacturing route.</p>
      )}

      {/* Steps list */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="bg-white border border-gray-100 rounded-lg p-3">
            {editingStepId === step.id ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editStep.stationName}
                    onChange={(e) => setEditStep({ ...editStep, stationName: e.target.value })}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                    placeholder="Station name"
                  />
                  <select
                    value={editStep.machineId}
                    onChange={(e) => setEditStep({ ...editStep, machineId: e.target.value })}
                    className="bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No machine</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={editStep.estimatedMinutes}
                    onChange={(e) => setEditStep({ ...editStep, estimatedMinutes: e.target.value })}
                    className="w-32 bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                    placeholder="Est. minutes"
                  />
                  <input
                    type="text"
                    value={editStep.notes}
                    onChange={(e) => setEditStep({ ...editStep, notes: e.target.value })}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                    placeholder="Notes"
                  />
                  <button onClick={() => saveEdit(step.id)} className="text-emerald-600 hover:text-emerald-700">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingStepId(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors"
                  >
                    <DotsSixVertical size={16} />
                  </button>
                </div>
                <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">{step.stationName}</p>
                  <div className="flex gap-3 text-xs text-gray-400">
                    {step.machineName && <span>Machine: {step.machineName}</span>}
                    {step.estimatedMinutes && <span>{step.estimatedMinutes} min</span>}
                    {step.notes && <span>{step.notes}</span>}
                  </div>
                </div>
                <button onClick={() => startEdit(step)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <PencilSimple size={16} />
                </button>
                <button onClick={() => moveStep(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs">
                  Up
                </button>
                <button onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 transition-colors text-xs">
                  Down
                </button>
                <button onClick={() => onDeleteStep(step.id)} className="text-red-400 hover:text-red-500 transition-colors">
                  <Trash size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add step form */}
      {showAddForm && (
        <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newStep.stationName}
              onChange={(e) => setNewStep({ ...newStep, stationName: e.target.value })}
              className="flex-1 bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="Station name (e.g., Laser Cut, Brake Press, Powder Coat)"
              autoFocus
            />
            <select
              value={newStep.machineId}
              onChange={(e) => setNewStep({ ...newStep, machineId: e.target.value })}
              className="bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">No machine</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newStep.estimatedMinutes}
              onChange={(e) => setNewStep({ ...newStep, estimatedMinutes: e.target.value })}
              className="w-32 bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="Est. minutes"
            />
            <input
              type="text"
              value={newStep.notes}
              onChange={(e) => setNewStep({ ...newStep, notes: e.target.value })}
              className="flex-1 bg-gray-50 border border-gray-100 rounded px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="Notes (optional)"
            />
            <button
              onClick={handleAdd}
              disabled={!newStep.stationName.trim() || isAdding}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
