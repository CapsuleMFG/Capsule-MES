import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ExternalLink } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useTrackedParts, useTrackedPartsSummary, useBulkCreateTrackedParts } from '../../hooks/usePartsTracking';
import BulkCreatePartsModal from './BulkCreatePartsModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { TrackedPartStatus, BomItem } from '../../../../shared/types';

const STATUS_COLORS: Record<TrackedPartStatus, string> = {
  'Pending': 'bg-gray-500/20 text-gray-300',
  'In Progress': 'bg-blue-500/20 text-blue-300',
  'Completed': 'bg-green-500/20 text-green-300',
  'Scrapped': 'bg-red-500/20 text-red-300',
  'On Hold': 'bg-yellow-500/20 text-yellow-300',
};

interface JobPartsPanelProps {
  jobId: number;
  bomItems?: BomItem[];
}

export default function JobPartsPanel({ jobId, bomItems = [] }: JobPartsPanelProps) {
  const toast = useToast();
  const { data: summary } = useTrackedPartsSummary(jobId);
  const { data: parts, isLoading } = useTrackedParts({ jobId });
  const bulkCreateMutation = useBulkCreateTrackedParts(jobId);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const handleBulkCreate = async (data: any) => {
    try {
      const result = await bulkCreateMutation.mutateAsync(data);
      toast.success(result.message);
      setIsBulkModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create parts');
    }
  };

  return (
    <div>
      {/* Summary */}
      {summary && summary.total > 0 && (
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="bg-rivian-black rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{summary.total}</p>
            <p className="text-xs text-gray-400">Total Parts</p>
          </div>
          {(['Pending', 'In Progress', 'Completed', 'Scrapped'] as TrackedPartStatus[]).map(status => (
            <div key={status} className="bg-rivian-black rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{summary.byStatus[status] || 0}</p>
              <p className="text-xs text-gray-400">{status}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Tracked Parts</h3>
        <div className="flex gap-2">
          <button onClick={() => setIsBulkModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Create Parts
          </button>
          <Link to={`/parts?jobId=${jobId}`} className="flex items-center gap-1 text-sm text-rivian-accent hover:text-rivian-accent/80 transition-colors">
            View All <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner size="sm" />
      ) : !parts || parts.length === 0 ? (
        <div className="bg-rivian-black rounded-lg p-8 text-center border border-gray-700">
          <p className="text-gray-400 mb-3">No tracked parts for this job yet.</p>
          <button onClick={() => setIsBulkModalOpen(true)} className="btn-primary text-sm">
            Create Parts from BOM
          </button>
        </div>
      ) : (
        <div className="bg-rivian-black rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-3 text-xs font-medium text-gray-400">ID</th>
                <th className="text-left p-3 text-xs font-medium text-gray-400">Part #</th>
                <th className="text-left p-3 text-xs font-medium text-gray-400">Station</th>
                <th className="text-left p-3 text-xs font-medium text-gray-400">Status</th>
                <th className="text-left p-3 text-xs font-medium text-gray-400">Serial</th>
              </tr>
            </thead>
            <tbody>
              {parts.slice(0, 10).map((part) => (
                <tr key={part.id} className="border-b border-gray-700/50 hover:bg-rivian-hover transition-colors">
                  <td className="p-3">
                    <Link to={`/parts/${part.id}`} className="text-rivian-accent hover:underline font-mono text-sm">
                      {part.trackingId || `#${part.id}`}
                    </Link>
                  </td>
                  <td className="p-3 text-white text-sm">{part.partNumber || '-'}</td>
                  <td className="p-3 text-gray-300 text-sm">{part.currentStationName || '-'}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[part.status]}`}>
                      {part.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">{part.serialNumber || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parts.length > 10 && (
            <div className="p-3 text-center border-t border-gray-700">
              <Link to={`/parts?jobId=${jobId}`} className="text-sm text-rivian-accent hover:underline">
                View all {parts.length} parts
              </Link>
            </div>
          )}
        </div>
      )}

      <BulkCreatePartsModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSubmit={handleBulkCreate}
        isPending={bulkCreateMutation.isPending}
        jobId={jobId}
        bomItems={bomItems}
      />
    </div>
  );
}
