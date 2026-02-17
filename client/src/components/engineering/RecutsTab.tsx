import { useTrackedParts } from '../../hooks/usePartsTracking';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { TrackedPart } from '../../../../shared/types';

interface RecutsTabProps {
  jobId: number;
}

export default function RecutsTab({ jobId }: RecutsTabProps) {
  // Get all scrapped parts for this job
  const { data: scrappedParts, isLoading: scrappedLoading } = useTrackedParts({ jobId, status: 'Scrapped' });

  // Get all parts for this job to check for existing recuts
  const { data: allParts } = useTrackedParts({ jobId });

  // Check if a recut already exists for a given scrapped part
  const getRecutForPart = (partId: number): TrackedPart | undefined => {
    return allParts?.find((p) => p.recutFromId === partId);
  };

  if (scrappedLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!scrappedParts || scrappedParts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No scrapped parts for this job</p>
        <p className="text-gray-500 text-sm mt-1">
          When parts are scrapped during production, they will appear here for recut review
        </p>
      </div>
    );
  }

  const needsRecut = scrappedParts.filter((p) => !getRecutForPart(p.id));
  const recutCreated = scrappedParts.filter((p) => getRecutForPart(p.id));

  return (
    <div>
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white">
          Scrapped Parts — Recut Queue
        </h4>
        <p className="text-sm text-gray-400 mt-1">
          {scrappedParts.length} scrapped part{scrappedParts.length !== 1 ? 's' : ''}
          {needsRecut.length > 0 && (
            <span className="text-red-400 ml-2">
              {needsRecut.length} awaiting recut
            </span>
          )}
          {recutCreated.length > 0 && (
            <span className="text-green-400 ml-2">
              {recutCreated.length} recut{recutCreated.length !== 1 ? 's' : ''} created
            </span>
          )}
        </p>
        {needsRecut.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Create a recut Work Order and mark it as "Recut" to automatically link replacement parts to these scrapped parts.
          </p>
        )}
      </div>

      <div className="bg-rivian-soft-black rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-xs font-medium text-gray-400">Tracking ID</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Part Number</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Description</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Scrap Reason</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Scrapped At</th>
              <th className="text-left p-3 text-xs font-medium text-gray-400">Last Station</th>
              <th className="text-center p-3 text-xs font-medium text-gray-400">Recut Status</th>
            </tr>
          </thead>
          <tbody>
            {scrappedParts.map((part) => {
              const existingRecut = getRecutForPart(part.id);
              return (
                <tr key={part.id} className="border-b border-gray-700/50 hover:bg-rivian-hover transition-colors">
                  <td className="p-3 text-white font-mono text-sm">
                    {part.trackingId || `#${part.id}`}
                  </td>
                  <td className="p-3 text-white text-sm">{part.partNumber || '-'}</td>
                  <td className="p-3 text-gray-300 text-sm max-w-[200px] truncate">
                    {part.description || '-'}
                  </td>
                  <td className="p-3 text-sm">
                    <span className="text-red-300">{part.scrapReason || '-'}</span>
                  </td>
                  <td className="p-3 text-gray-300 text-sm">
                    {part.scrappedAt
                      ? new Date(part.scrappedAt).toLocaleDateString() + ' ' + new Date(part.scrappedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '-'}
                  </td>
                  <td className="p-3 text-gray-300 text-sm">
                    {part.currentStationName || '-'}
                  </td>
                  <td className="p-3 text-center">
                    {existingRecut ? (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        Recut Created
                        {existingRecut.trackingId && (
                          <span className="ml-1 font-mono">({existingRecut.trackingId})</span>
                        )}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                        Needs Recut
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
