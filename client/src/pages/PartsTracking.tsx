import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlass, Trash, ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react';
import { exportToCsv } from '../utils/exportCsv';
import { useToast } from '../contexts/ToastContext';
import { useTrackedParts, useDeleteTrackedPart, useLookupByTrackingId } from '../hooks/usePartsTracking';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { TrackedPartStatus } from '../../../shared/types';

const STATUS_COLORS: Record<TrackedPartStatus, string> = {
  'Pending': 'text-gray-400',
  'In Progress': 'text-amber-500',
  'Completed': 'text-emerald-500',
  'Scrapped': 'text-red-500',
  'On Hold': 'text-amber-500',
};

export default function PartsTracking() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [trackingIdSearch, setTrackingIdSearch] = useState('');
  const deleteMutation = useDeleteTrackedPart();
  const lookupMutation = useLookupByTrackingId();

  const { data: parts, isLoading } = useTrackedParts({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const handleTrackingLookup = async () => {
    if (!trackingIdSearch.trim()) return;
    try {
      const results = await lookupMutation.mutateAsync(trackingIdSearch.trim());
      if (results.length === 0) {
        toast.warning('No parts found with that tracking ID');
      } else if (results.length === 1) {
        window.location.href = `/parts/${results[0].id}`;
      } else {
        toast.info(`Found ${results.length} parts with that tracking ID`);
      }
    } catch {
      toast.error('Part not found with this tracking ID');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this tracked part?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Part deleted');
    } catch {
      toast.error('Failed to delete part');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Parts Tracking</h1>
          <p className="text-gray-400 mt-1">Track individual parts through manufacturing stations</p>
        </div>
        <button
          onClick={() => exportToCsv('parts-tracking', ['Tracking ID', 'Job Number', 'Part Number', 'Description', 'Status', 'Route Template'], (parts || []).map(p => [p.trackingId || '', p.jobNumber || '', p.partNumber || '', p.description || '', p.status, p.routeTemplateName || '']))}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white ring-1 ring-gray-200 rounded-[10px] hover:bg-gray-50"
        >
          <DownloadSimple size={16} weight="regular" />
          Export
        </button>
      </div>

      {/* Tracking ID Lookup */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-4 mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-2">Quick Lookup by Tracking ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={trackingIdSearch}
            onChange={(e) => setTrackingIdSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrackingLookup()}
            className="flex-1 bg-white ring-1 ring-gray-200 rounded-[10px] px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
            placeholder="Enter QR code, engraved number, or sticker ID..."
          />
          <button
            onClick={handleTrackingLookup}
            disabled={lookupMutation.isPending}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-[10px] active:scale-[0.98] transition-all"
          >
            {lookupMutation.isPending ? 'Searching...' : 'Lookup'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white ring-1 ring-gray-200 rounded-[10px] pl-10 pr-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
            placeholder="Search by tracking ID, part number, or description..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white ring-1 ring-gray-200 rounded-[10px] px-4 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Scrapped">Scrapped</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>

      {/* Results */}
      {parts?.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-12 text-center">
          <p className="text-gray-400">No tracked parts found. Create parts from a job's detail page.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-4 text-sm font-medium text-gray-400">Tracking ID</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Part Number</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Job</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Route</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Current Station</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">ID Type</th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parts?.map((part) => (
                <tr key={part.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <Link to={`/parts/${part.id}`} className="text-blue-600 hover:underline font-mono">
                      {part.trackingId || `#${part.id}`}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-900">{part.partNumber || '-'}</td>
                  <td className="p-4">
                    <Link to={`/jobs/${part.jobId}`} className="text-blue-600 hover:underline">
                      {part.jobNumber || `Job #${part.jobId}`}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-600">{part.routeTemplateName || '-'}</td>
                  <td className="p-4 text-gray-600">{part.currentStationName || '-'}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium ${STATUS_COLORS[part.status]}`}>
                      {part.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">{part.identificationType}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/parts/${part.id}`} className="text-gray-400 hover:text-gray-900 transition-colors">
                        <ArrowSquareOut className="w-4 h-4" />
                      </Link>
                      <button onClick={() => handleDelete(part.id)} className="text-red-400 hover:text-red-500 transition-colors">
                        <Trash className="w-4 h-4" />
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
