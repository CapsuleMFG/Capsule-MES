import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../contexts/ToastContext';
import * as jobsService from '../../../services/jobs.service';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { Plus, Trash } from '@phosphor-icons/react';
import type { MaterialStatus } from '../../../types';

interface MaterialsTabProps {
  jobId: number;
}

export default function MaterialsTab({ jobId }: MaterialsTabProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    materialName: '',
    quantity: '',
    unit: '',
    status: 'Needed' as MaterialStatus,
    cost: '',
    supplier: '',
  });

  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', jobId],
    queryFn: () => jobsService.getJobMaterials(jobId),
  });

  const createMaterialMutation = useMutation({
    mutationFn: (data: any) => jobsService.createMaterial(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', jobId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      toast.success('Material added successfully!');
      setIsAdding(false);
      setNewMaterial({ materialName: '', quantity: '', unit: '', status: 'Needed', cost: '', supplier: '' });
    },
    onError: () => {
      toast.error('Failed to add material. Please try again.');
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ materialId, data }: { materialId: number; data: any }) =>
      jobsService.updateMaterial(jobId, materialId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', jobId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      toast.success('Material status updated!');
    },
    onError: () => {
      toast.error('Failed to update material. Please try again.');
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: number) => jobsService.deleteMaterial(jobId, materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', jobId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'metrics'] });
      toast.success('Material deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete material. Please try again.');
    },
  });

  const handleAddMaterial = () => {
    if (!newMaterial.materialName || !newMaterial.quantity || !newMaterial.unit) {
      alert('Please fill in all required fields');
      return;
    }

    createMaterialMutation.mutate({
      materialName: newMaterial.materialName,
      quantity: parseFloat(newMaterial.quantity),
      unit: newMaterial.unit,
      status: newMaterial.status,
      cost: newMaterial.cost ? parseFloat(newMaterial.cost) : undefined,
      supplier: newMaterial.supplier || undefined,
    });
  };

  const handleStatusChange = (materialId: number, status: MaterialStatus) => {
    updateMaterialMutation.mutate({
      materialId,
      data: { status },
    });
  };


  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate total material cost
  const totalCost = materials?.reduce((sum: number, material: any) => {
    return sum + (material.cost || 0) * material.quantity;
  }, 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Bill of Materials</h3>
          {totalCost > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              Total Material Cost: <span className="text-gray-900 font-semibold">${totalCost.toFixed(2)}</span>
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2">
          <Plus size={16} />
          Add Material
        </Button>
      </div>

      {/* Add Material Form */}
      {isAdding && (
        <Card className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Material</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Material Name *</label>
              <input
                type="text"
                placeholder="e.g., Steel Sheet 4x8"
                value={newMaterial.materialName}
                onChange={(e) => setNewMaterial({ ...newMaterial, materialName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 100"
                value={newMaterial.quantity}
                onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
              <input
                type="text"
                placeholder="e.g., sheets"
                value={newMaterial.unit}
                onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 45.50"
                value={newMaterial.cost}
                onChange={(e) => setNewMaterial({ ...newMaterial, cost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={newMaterial.status}
                onChange={(e) => setNewMaterial({ ...newMaterial, status: e.target.value as MaterialStatus })}
              >
                <option value="Needed">Needed</option>
                <option value="Ordered">Ordered</option>
                <option value="Received">Received</option>
                <option value="Issued">Issued</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <input
                type="text"
                placeholder="e.g., BuildPro Supply"
                value={newMaterial.supplier}
                onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddMaterial}
              disabled={createMaterialMutation.isPending}
            >
              {createMaterialMutation.isPending ? 'Adding...' : 'Add Material'}
            </Button>
          </div>
        </Card>
      )}

      {/* Materials Table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
        {materials && materials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100">Material</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100">Quantity</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100">Unit Cost</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100">Total Cost</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100">Supplier</th>
                  <th className="text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100">Status</th>
                  <th className="text-right text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3 border-b border-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material: any) => (
                  <tr key={material.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="text-sm text-gray-900 px-5 py-3">{material.material_name}</td>
                    <td className="text-sm text-gray-600 px-5 py-3">
                      {material.quantity} {material.unit}
                    </td>
                    <td className="text-sm text-gray-600 px-5 py-3">
                      {material.cost ? `$${parseFloat(material.cost).toFixed(2)}` : '-'}
                    </td>
                    <td className="text-sm text-gray-900 font-semibold px-5 py-3">
                      {material.cost ? `$${(parseFloat(material.cost) * material.quantity).toFixed(2)}` : '-'}
                    </td>
                    <td className="text-sm text-gray-600 px-5 py-3">{material.supplier || '-'}</td>
                    <td className="text-sm text-gray-600 px-5 py-3">
                      <select
                        value={material.status}
                        onChange={(e) => handleStatusChange(material.id, e.target.value as MaterialStatus)}
                        className="bg-transparent text-sm text-gray-600"
                        disabled={updateMaterialMutation.isPending}
                      >
                        <option value="Needed">Needed</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Received">Received</option>
                        <option value="Issued">Issued</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => deleteMaterialMutation.mutate(material.id)}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        disabled={deleteMaterialMutation.isPending}
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">No materials added yet</p>
            <p className="text-sm text-gray-400 mt-2">Click "Add Material" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
