import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../contexts/ToastContext';
import * as jobsService from '../../../services/jobs.service';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { Plus, Trash2 } from 'lucide-react';

interface ProductionTabProps {
  jobId: number;
}

export default function ProductionTab({ jobId }: ProductionTabProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newLabor, setNewLabor] = useState({
    employeeName: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
    stageId: '',
    notes: '',
  });

  const { data: labor, isLoading } = useQuery({
    queryKey: ['labor', jobId],
    queryFn: () => jobsService.getJobLabor(jobId),
  });

  const { data: stages } = useQuery({
    queryKey: ['workflow', 'stages'],
    queryFn: () => jobsService.getWorkflowStages(),
  });

  const createLaborMutation = useMutation({
    mutationFn: (data: any) => jobsService.createLabor(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      toast.success('Labor entry added successfully!');
      setIsAdding(false);
      setNewLabor({ employeeName: '', hours: '', date: new Date().toISOString().split('T')[0], stageId: '', notes: '' });
    },
    onError: () => {
      toast.error('Failed to add labor entry. Please try again.');
    },
  });

  const deleteLaborMutation = useMutation({
    mutationFn: (laborId: number) => jobsService.deleteLabor(jobId, laborId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      toast.success('Labor entry deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete labor entry. Please try again.');
    },
  });

  const handleAddLabor = () => {
    if (!newLabor.employeeName || !newLabor.hours || !newLabor.date) {
      alert('Please fill in all required fields');
      return;
    }

    createLaborMutation.mutate({
      employeeName: newLabor.employeeName,
      hours: parseFloat(newLabor.hours),
      date: newLabor.date,
      stageId: newLabor.stageId ? parseInt(newLabor.stageId) : undefined,
      notes: newLabor.notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalHours = labor?.reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Labor Tracking</h3>
          <p className="text-sm text-gray-400 mt-1">
            Total Hours Logged: <span className="text-white font-semibold">{totalHours.toFixed(1)}</span>
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Labor Entry
        </Button>
      </div>

      {/* Add Labor Form */}
      {isAdding && (
        <Card className="mb-6">
          <h4 className="text-lg font-semibold mb-4">Add Labor Entry</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Employee Name *</label>
              <input
                type="text"
                placeholder="e.g., John Smith"
                value={newLabor.employeeName}
                onChange={(e) => setNewLabor({ ...newLabor, employeeName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hours *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g., 8"
                value={newLabor.hours}
                onChange={(e) => setNewLabor({ ...newLabor, hours: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
              <input
                type="date"
                value={newLabor.date}
                onChange={(e) => setNewLabor({ ...newLabor, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Workflow Stage</label>
              <select
                value={newLabor.stageId}
                onChange={(e) => setNewLabor({ ...newLabor, stageId: e.target.value })}
              >
                <option value="">Not specified</option>
                {stages?.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <input
                type="text"
                placeholder="e.g., Welding work"
                value={newLabor.notes}
                onChange={(e) => setNewLabor({ ...newLabor, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddLabor}
              disabled={createLaborMutation.isPending}
            >
              {createLaborMutation.isPending ? 'Adding...' : 'Add Labor Entry'}
            </Button>
          </div>
        </Card>
      )}

      {/* Labor Entries Table */}
      <Card>
        {labor && labor.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Employee</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Hours</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Stage</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Notes</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {labor.map((entry: any) => (
                  <tr key={entry.id} className="border-b border-gray-800">
                    <td className="py-3 px-4 text-white">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{entry.employee_name}</td>
                    <td className="py-3 px-4 text-white font-semibold">{entry.hours}h</td>
                    <td className="py-3 px-4 text-gray-300">{entry.stage_name || '-'}</td>
                    <td className="py-3 px-4 text-gray-300">{entry.notes || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteLaborMutation.mutate(entry.id)}
                        className="text-red-500 hover:text-red-400"
                        disabled={deleteLaborMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>No labor entries yet</p>
            <p className="text-sm mt-2">Click "Add Labor Entry" to track work hours</p>
          </div>
        )}
      </Card>
    </div>
  );
}
