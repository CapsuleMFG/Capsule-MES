import { useState } from 'react';
import { useStationKiosks, useCreateStationKiosk, useUpdateStationKiosk, useDeleteStationKiosk } from '../hooks/usePartsTracking';
import { useToast } from '../contexts/ToastContext';
import type { StationKiosk, CreateStationKioskRequest } from '../../../shared/types';
import { Plus, Pencil, Trash2, Monitor, ExternalLink } from 'lucide-react';

export default function StationKiosks() {
  const { data: kiosks = [], isLoading } = useStationKiosks();
  const createKiosk = useCreateStationKiosk();
  const updateKiosk = useUpdateStationKiosk();
  const deleteKiosk = useDeleteStationKiosk();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateStationKioskRequest>({
    stationName: '',
    pinCode: '',
    isActive: true,
    notes: '',
  });

  const resetForm = () => {
    setForm({ stationName: '', pinCode: '', isActive: true, notes: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (kiosk: StationKiosk) => {
    setForm({
      stationName: kiosk.stationName,
      pinCode: kiosk.pinCode,
      isActive: kiosk.isActive,
      notes: kiosk.notes || '',
    });
    setEditingId(kiosk.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateKiosk.mutateAsync({ id: editingId, data: form });
        toast.success('Kiosk updated');
      } else {
        await createKiosk.mutateAsync(form);
        toast.success('Kiosk created');
      }
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save kiosk');
    }
  };

  const handleDelete = async (kiosk: StationKiosk) => {
    if (!confirm(`Delete kiosk "${kiosk.stationName}"?`)) return;
    try {
      await deleteKiosk.mutateAsync(kiosk.id);
      toast.success('Kiosk deleted');
    } catch {
      toast.error('Failed to delete kiosk');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Station Kiosks</h1>
          <p className="text-gray-400 mt-1">Manage kiosk PIN codes for factory floor stations</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Kiosk
          </a>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Kiosk
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-rivian-soft-black border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Edit Kiosk' : 'New Kiosk'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Station Name *</label>
              <input
                type="text"
                required
                value={form.stationName}
                onChange={(e) => setForm({ ...form, stationName: e.target.value })}
                placeholder="e.g. Laser Cut"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">PIN Code (4-6 digits) *</label>
              <input
                type="text"
                required
                pattern="\d{4,6}"
                value={form.pinCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setForm({ ...form, pinCode: val });
                }}
                placeholder="e.g. 1234"
                className="input w-full font-mono text-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
                className="input w-full"
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-gray-600"
                />
                Active
              </label>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={createKiosk.isPending || updateKiosk.isPending}
                className="btn-primary"
              >
                {editingId ? 'Update' : 'Create'} Kiosk
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-gray-400 text-center py-12">Loading kiosks...</div>
      ) : kiosks.length === 0 ? (
        <div className="text-center py-12">
          <Monitor className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No station kiosks configured</p>
          <p className="text-gray-500 text-sm mt-1">Create a kiosk to assign a PIN code to a station</p>
        </div>
      ) : (
        <div className="bg-rivian-soft-black border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Station Name</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">PIN Code</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Notes</th>
                <th className="text-right px-4 py-3 text-gray-400 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {kiosks.map((kiosk) => (
                <tr key={kiosk.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-white font-medium">{kiosk.stationName}</td>
                  <td className="px-4 py-3 font-mono text-amber-400 text-lg">{kiosk.pinCode}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      kiosk.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {kiosk.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{kiosk.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(kiosk)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(kiosk)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
