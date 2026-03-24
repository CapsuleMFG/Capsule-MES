import { useState, useMemo } from 'react';
import { useShipments, useCreateShipment, useUpdateShipment, useDeleteShipment } from '../hooks/useShipping';
import { useJobs } from '../hooks/useJobs';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Package, Truck, PencilSimple, Trash, Plus, X } from '@phosphor-icons/react';
import type { ShipmentWithJob, ShipmentStatus, CreateShipmentRequest, UpdateShipmentRequest } from '../../../shared/types';

const STATUSES: ShipmentStatus[] = ['Pending', 'Packing', 'Packed', 'Shipped', 'Delivered'];

const STATUS_BADGE: Record<ShipmentStatus, string> = {
  Pending: 'bg-gray-100 text-gray-500',
  Packing: 'bg-amber-50 text-amber-700',
  Packed: 'bg-blue-50 text-blue-700',
  Shipped: 'bg-blue-50 text-blue-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
};

type FilterTab = 'All' | ShipmentStatus;

export default function Shipping() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<ShipmentWithJob | null>(null);

  const { data: shipments, isLoading, error } = useShipments();
  const deleteShipment = useDeleteShipment();

  const filteredShipments = useMemo(() => {
    if (!shipments) return [];
    if (activeTab === 'All') return shipments;
    return shipments.filter((s) => s.status === activeTab);
  }, [shipments, activeTab]);

  const counts = useMemo(() => {
    if (!shipments) return { All: 0, Pending: 0, Packing: 0, Packed: 0, Shipped: 0, Delivered: 0 };
    const c: Record<string, number> = { All: shipments.length };
    for (const s of STATUSES) c[s] = 0;
    for (const sh of shipments) c[sh.status] = (c[sh.status] || 0) + 1;
    return c;
  }, [shipments]);

  const handleDelete = async (shipment: ShipmentWithJob) => {
    if (!window.confirm(`Delete shipment for ${shipment.jobNumber}? This cannot be undone.`)) return;
    try {
      await deleteShipment.mutateAsync(shipment.id);
      toast.success(`Shipment for ${shipment.jobNumber} deleted`);
    } catch {
      toast.error('Failed to delete shipment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        Error loading shipments. Please try again.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Shipping</h1>
          <p className="text-sm text-gray-400 mt-1">
            {shipments?.length || 0} total shipments
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] flex items-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Plus size={16} weight="light" />
          Create Shipment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {(['All', ...STATUSES] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-[10px] text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === tab
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {counts[tab] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
        {filteredShipments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Job #</th>
                  <th className="text-left py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Client</th>
                  <th className="text-left py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                  <th className="text-left py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Carrier</th>
                  <th className="text-left py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Tracking #</th>
                  <th className="text-left py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Ship Date</th>
                  <th className="text-right py-3 px-5 text-[11px] uppercase tracking-wider font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-5">
                      <span className="text-blue-600 font-medium text-sm">{shipment.jobNumber}</span>
                    </td>
                    <td className="py-3 px-5 text-gray-600 text-sm">{shipment.clientName || '-'}</td>
                    <td className="py-3 px-5 text-gray-600 text-sm max-w-[200px] truncate">{shipment.jobDescription || '-'}</td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_BADGE[shipment.status]}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-gray-600 text-sm">{shipment.carrier || '-'}</td>
                    <td className="py-3 px-5 text-gray-600 text-sm font-mono text-xs">{shipment.trackingNumber || '-'}</td>
                    <td className="py-3 px-5 text-gray-400 text-sm">
                      {shipment.shipDate ? new Date(shipment.shipDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingShipment(shipment)}
                          className="text-gray-400 hover:text-gray-900 transition-colors"
                          title="Edit shipment"
                        >
                          <PencilSimple size={16} weight="light" />
                        </button>
                        <button
                          onClick={() => handleDelete(shipment)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete shipment"
                          disabled={deleteShipment.isPending}
                        >
                          <Trash size={16} weight="light" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package size={48} weight="light" className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No shipments found</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab !== 'All'
                ? `No shipments with status "${activeTab}"`
                : 'Click "Create Shipment" to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Create Shipment Modal */}
      {isCreateOpen && (
        <CreateShipmentModal onClose={() => setIsCreateOpen(false)} />
      )}

      {/* Edit Shipment Modal */}
      {editingShipment && (
        <EditShipmentModal
          shipment={editingShipment}
          onClose={() => setEditingShipment(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create Shipment Modal                                               */
/* ------------------------------------------------------------------ */

const INPUT_CLASS = 'w-full bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:outline-none placeholder:text-gray-400';

function CreateShipmentModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const createShipment = useCreateShipment();
  const { data: jobs } = useJobs({});

  const [form, setForm] = useState<CreateShipmentRequest>({
    jobId: 0,
    shippingMethod: '',
    carrier: '',
    shippingNotes: '',
  });

  // Only show jobs that are Active (could be in Production or completed production stage)
  const availableJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((j) => j.status === 'Active' || j.status === 'Completed');
  }, [jobs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobId) {
      toast.error('Please select a job');
      return;
    }
    try {
      await createShipment.mutateAsync(form);
      toast.success('Shipment created successfully');
      onClose();
    } catch {
      toast.error('Failed to create shipment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 animate-modalIn">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Truck size={18} weight="light" className="text-gray-400" />
            Create Shipment
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={18} weight="light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Job Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Job *</label>
            <select
              value={form.jobId}
              onChange={(e) => setForm({ ...form, jobId: Number(e.target.value) })}
              className={INPUT_CLASS}
            >
              <option value={0}>Select a job...</option>
              {availableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobNumber} — {job.clientName || 'No client'} — {job.description}
                </option>
              ))}
            </select>
          </div>

          {/* Shipping Method */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Shipping Method</label>
            <select
              value={form.shippingMethod}
              onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="">Select method...</option>
              <option value="LTL Freight">LTL Freight</option>
              <option value="FTL Freight">FTL Freight</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Parcel">Parcel</option>
              <option value="Customer Pickup">Customer Pickup</option>
              <option value="Company Truck">Company Truck</option>
            </select>
          </div>

          {/* Carrier */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Carrier</label>
            <input
              type="text"
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              placeholder="e.g. FedEx Freight, XPO Logistics"
              className={INPUT_CLASS}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.shippingNotes}
              onChange={(e) => setForm({ ...form, shippingNotes: e.target.value })}
              placeholder="Special instructions, dock requirements, etc."
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createShipment.isPending}
              className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {createShipment.isPending ? 'Creating...' : 'Create Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Edit Shipment Modal                                                 */
/* ------------------------------------------------------------------ */

function EditShipmentModal({
  shipment,
  onClose,
}: {
  shipment: ShipmentWithJob;
  onClose: () => void;
}) {
  const toast = useToast();
  const updateShipment = useUpdateShipment();

  const [form, setForm] = useState<UpdateShipmentRequest>({
    status: shipment.status,
    shippingMethod: shipment.shippingMethod || '',
    trackingNumber: shipment.trackingNumber || '',
    carrier: shipment.carrier || '',
    shipDate: shipment.shipDate?.split('T')[0] || '',
    deliveryDate: shipment.deliveryDate?.split('T')[0] || '',
    shippingNotes: shipment.shippingNotes || '',
    packedBy: shipment.packedBy || '',
    shippedBy: shipment.shippedBy || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateShipment.mutateAsync({ id: shipment.id, ...form });
      toast.success(`Shipment for ${shipment.jobNumber} updated`);
      onClose();
    } catch {
      toast.error('Failed to update shipment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col animate-modalIn">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package size={18} weight="light" className="text-gray-400" />
              Edit Shipment
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {shipment.jobNumber} — {shipment.clientName}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X size={18} weight="light" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ShipmentStatus })}
              className={INPUT_CLASS}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Two-column: Carrier + Tracking */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Carrier</label>
              <input
                type="text"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                placeholder="e.g. FedEx Freight"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tracking #</label>
              <input
                type="text"
                value={form.trackingNumber}
                onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                placeholder="Tracking number"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Shipping Method */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Shipping Method</label>
            <select
              value={form.shippingMethod}
              onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })}
              className={INPUT_CLASS}
            >
              <option value="">Select method...</option>
              <option value="LTL Freight">LTL Freight</option>
              <option value="FTL Freight">FTL Freight</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Parcel">Parcel</option>
              <option value="Customer Pickup">Customer Pickup</option>
              <option value="Company Truck">Company Truck</option>
            </select>
          </div>

          {/* Two-column: Ship Date + Delivery Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Ship Date</label>
              <input
                type="date"
                value={form.shipDate}
                onChange={(e) => setForm({ ...form, shipDate: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Delivery Date</label>
              <input
                type="date"
                value={form.deliveryDate}
                onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Two-column: Packed By + Shipped By */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Packed By</label>
              <input
                type="text"
                value={form.packedBy}
                onChange={(e) => setForm({ ...form, packedBy: e.target.value })}
                placeholder="Name"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Shipped By</label>
              <input
                type="text"
                value={form.shippedBy}
                onChange={(e) => setForm({ ...form, shippedBy: e.target.value })}
                placeholder="Name"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Packing List (read-only display) */}
          {shipment.packingList && shipment.packingList.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Packing List</label>
              <div className="bg-gray-50 ring-1 ring-gray-200 rounded-[10px] p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1 px-2 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                      <th className="text-right py-1 px-2 text-[11px] uppercase tracking-wider font-medium text-gray-400">Qty</th>
                      <th className="text-left py-1 px-2 text-[11px] uppercase tracking-wider font-medium text-gray-400">Tracking ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipment.packingList.map((item: { description: string; quantity: number; trackingId?: string }, idx: number) => (
                      <tr key={idx} className="border-b border-gray-50 last:border-0">
                        <td className="py-1 px-2 text-gray-600">{item.description}</td>
                        <td className="py-1 px-2 text-gray-600 text-right">{item.quantity}</td>
                        <td className="py-1 px-2 text-gray-400 font-mono text-xs">{item.trackingId || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={form.shippingNotes}
              onChange={(e) => setForm({ ...form, shippingNotes: e.target.value })}
              placeholder="Special instructions, dock requirements, etc."
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateShipment.isPending}
              className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {updateShipment.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
