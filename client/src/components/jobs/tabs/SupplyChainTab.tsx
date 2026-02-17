import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../contexts/ToastContext';
import * as jobsService from '../../../services/jobs.service';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import LoadingSpinner from '../../ui/LoadingSpinner';
import GlobalInventoryPanel from '../../supplychain/GlobalInventoryPanel';
import { Plus, Edit, Trash2, Package, Truck } from 'lucide-react';
import type { ProcurementStatus } from '../../../types';

interface SupplyChainTabProps {
  jobId: number;
}

export default function SupplyChainTab({ jobId }: SupplyChainTabProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeView, setActiveView] = useState<'boms' | 'procurement' | 'inventory'>('boms');
  const [isAddingProcurement, setIsAddingProcurement] = useState(false);
  const [isEditingProcurement, setIsEditingProcurement] = useState<number | null>(null);

  const [procurementForm, setProcurementForm] = useState({
    bomItemId: '',
    quantityNeeded: '',
    supplierName: '',
    expectedDeliveryDate: '',
    cost: '',
    notes: '',
  });

  // Queries
  const { data: workOrders } = useQuery({
    queryKey: ['workOrders', jobId],
    queryFn: () => jobsService.getWorkOrders(jobId),
  });

  const { data: procurement, isLoading: procLoading } = useQuery({
    queryKey: ['procurement', jobId],
    queryFn: () => jobsService.getProcurementItems(jobId),
  });

  // Load all BOM items from all work orders
  const allBomItems = workOrders?.flatMap((wo) => wo.bomItems || []) || [];

  // Mutations
  const createProcurementMutation = useMutation({
    mutationFn: (data: any) => jobsService.createProcurementItem(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', jobId] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Procurement item created successfully!');
      setIsAddingProcurement(false);
      setProcurementForm({
        bomItemId: '',
        quantityNeeded: '',
        supplierName: '',
        expectedDeliveryDate: '',
        cost: '',
        notes: '',
      });
    },
    onError: () => {
      toast.error('Failed to create procurement item.');
    },
  });

  const updateProcurementMutation = useMutation({
    mutationFn: ({ procId, data }: { procId: number; data: any }) =>
      jobsService.updateProcurementItem(jobId, procId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', jobId] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Procurement item updated successfully!');
      setIsEditingProcurement(null);
    },
    onError: () => {
      toast.error('Failed to update procurement item.');
    },
  });

  const deleteProcurementMutation = useMutation({
    mutationFn: (procId: number) => jobsService.deleteProcurementItem(jobId, procId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', jobId] });
      toast.success('Procurement item deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete procurement item.');
    },
  });

  // Handlers
  const handleCreateProcurement = () => {
    if (!procurementForm.quantityNeeded) {
      alert('Quantity needed is required');
      return;
    }
    createProcurementMutation.mutate({
      bomItemId: procurementForm.bomItemId ? parseInt(procurementForm.bomItemId) : undefined,
      quantityNeeded: parseFloat(procurementForm.quantityNeeded),
      supplierName: procurementForm.supplierName || undefined,
      expectedDeliveryDate: procurementForm.expectedDeliveryDate || undefined,
      cost: procurementForm.cost ? parseFloat(procurementForm.cost) : undefined,
      notes: procurementForm.notes || undefined,
    });
  };

  const getProcurementStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Received':
        return 'bg-green-100 text-green-800';
      case 'Ordered':
        return 'bg-blue-100 text-blue-800';
      case 'Partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalProcurementCost = () => {
    if (!procurement) return 0;
    return procurement.reduce((sum, item) => sum + (item.cost || 0) * item.quantityNeeded, 0);
  };

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex gap-2">
        <Button
          variant={activeView === 'boms' ? 'primary' : 'secondary'}

          onClick={() => setActiveView('boms')}
        >
          <Package className="h-4 w-4 mr-2" />
          BOMs from Engineering
        </Button>
        <Button
          variant={activeView === 'procurement' ? 'primary' : 'secondary'}

          onClick={() => setActiveView('procurement')}
        >
          <Truck className="h-4 w-4 mr-2" />
          Job Procurement
        </Button>
        <Button
          variant={activeView === 'inventory' ? 'primary' : 'secondary'}

          onClick={() => setActiveView('inventory')}
        >
          <Package className="h-4 w-4 mr-2" />
          Global Inventory
        </Button>
      </div>

      {/* BOMs View (Read-only from Engineering) */}
      {activeView === 'boms' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Bill of Materials from Engineering</h3>
          {workOrders && workOrders.length > 0 ? (
            <div className="space-y-6">
              {workOrders.map((wo) => (
                <div key={wo.id} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                  <h4 className="font-semibold mb-2">{wo.woNumber}</h4>
                  {wo.bomItems && wo.bomItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Part Number
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Description
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Quantity
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Unit Cost
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Supplier
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {wo.bomItems.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm font-medium">{item.partNumber}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {item.description || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                -
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                -
                              </td>
                              <td className="px-4 py-2">
                                <Button
                                  variant="primary"

                                  onClick={() => {
                                    setProcurementForm({
                                      bomItemId: item.id.toString(),
                                      quantityNeeded: item.quantity.toString(),
                                      supplierName: '',
                                      expectedDeliveryDate: '',
                                      cost: '',
                                      notes: '',
                                    });
                                    setIsAddingProcurement(true);
                                    setActiveView('procurement');
                                  }}
                                >
                                  Procure
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No BOM items for this work order</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No work orders with BOMs yet. Create them in the Engineering tab.
            </p>
          )}
        </Card>
      )}

      {/* Procurement View */}
      {activeView === 'procurement' && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Job Procurement</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total Cost: ${calculateTotalProcurementCost().toFixed(2)}
                </p>
              </div>
              <Button variant="primary" onClick={() => setIsAddingProcurement(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Procurement Item
              </Button>
            </div>

            {procLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner />
              </div>
            ) : procurement && procurement.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Supplier
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        PO Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Expected
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Cost
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {procurement.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getProcurementStatusBadgeColor(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {item.quantityReceived}/{item.quantityNeeded}
                        </td>
                        <td className="px-4 py-2 text-sm">{item.supplierName || '-'}</td>
                        <td className="px-4 py-2 text-sm">{item.poNumber || '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          {item.expectedDeliveryDate
                            ? new Date(item.expectedDeliveryDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {item.cost ? `$${(item.cost * item.quantityNeeded).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <Button
                              variant="secondary"

                              onClick={() => {
                                setIsEditingProcurement(item.id);
                                setProcurementForm({
                                  bomItemId: item.bomItemId?.toString() || '',
                                  quantityNeeded: item.quantityNeeded.toString(),
                                  supplierName: item.supplierName || '',
                                  expectedDeliveryDate: item.expectedDeliveryDate || '',
                                  cost: item.cost?.toString() || '',
                                  notes: item.notes || '',
                                });
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="danger"

                              onClick={() => {
                                if (confirm('Delete this procurement item?')) {
                                  deleteProcurementMutation.mutate(item.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No procurement items yet</p>
            )}
          </Card>

          {/* Add/Edit Procurement Modal */}
          {(isAddingProcurement || isEditingProcurement !== null) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">
                  {isAddingProcurement ? 'Add Procurement Item' : 'Edit Procurement Item'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From BOM Item (optional)
                    </label>
                    <select
                      value={procurementForm.bomItemId}
                      onChange={(e) =>
                        setProcurementForm({ ...procurementForm, bomItemId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">-- Select BOM Item --</option>
                      {allBomItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.partNumber} - {item.description || 'No description'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Needed *
                    </label>
                    <input
                      type="number"
                      value={procurementForm.quantityNeeded}
                      onChange={(e) =>
                        setProcurementForm({ ...procurementForm, quantityNeeded: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={procurementForm.supplierName}
                      onChange={(e) =>
                        setProcurementForm({ ...procurementForm, supplierName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={procurementForm.cost}
                      onChange={(e) =>
                        setProcurementForm({ ...procurementForm, cost: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={procurementForm.expectedDeliveryDate}
                      onChange={(e) =>
                        setProcurementForm({
                          ...procurementForm,
                          expectedDeliveryDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  {isEditingProcurement !== null && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={procurementForm.notes} // Temporarily using notes field
                          onChange={(e) =>
                            updateProcurementMutation.mutate({
                              procId: isEditingProcurement,
                              data: { status: e.target.value as ProcurementStatus },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Ordered">Ordered</option>
                          <option value="Partial">Partial</option>
                          <option value="Received">Received</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity Received
                        </label>
                        <input
                          type="number"
                          placeholder="Enter quantity received"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          onBlur={(e) => {
                            const qty = parseFloat(e.target.value);
                            if (qty > 0) {
                              updateProcurementMutation.mutate({
                                procId: isEditingProcurement,
                                data: { quantityReceived: qty },
                              });
                            }
                          }}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={procurementForm.notes}
                      onChange={(e) =>
                        setProcurementForm({ ...procurementForm, notes: e.target.value })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIsAddingProcurement(false);
                        setIsEditingProcurement(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (isAddingProcurement) {
                          handleCreateProcurement();
                        } else if (isEditingProcurement) {
                          updateProcurementMutation.mutate({
                            procId: isEditingProcurement,
                            data: {
                              quantityNeeded: parseFloat(procurementForm.quantityNeeded),
                              supplierName: procurementForm.supplierName || undefined,
                              expectedDeliveryDate:
                                procurementForm.expectedDeliveryDate || undefined,
                              cost: procurementForm.cost
                                ? parseFloat(procurementForm.cost)
                                : undefined,
                              notes: procurementForm.notes || undefined,
                            },
                          });
                        }
                      }}
                      disabled={
                        createProcurementMutation.isPending || updateProcurementMutation.isPending
                      }
                    >
                      {isAddingProcurement ? 'Add' : 'Update'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Global Inventory View */}
      {activeView === 'inventory' && (
        <GlobalInventoryPanel />
      )}
    </div>
  );
}
