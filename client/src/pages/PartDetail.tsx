import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, SignIn, SignOut, CheckCircle, Circle, XCircle, Clock } from '@phosphor-icons/react';
import { useToast } from '../contexts/ToastContext';
import { useTrackedPart, useRouteTemplate, useCheckInPart, useCheckOutPart } from '../hooks/usePartsTracking';
import StationCheckInOut from '../components/parts-tracking/StationCheckInOut';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { TrackedPartStatus, QualityStatus } from '../../../shared/types';

const STATUS_COLORS: Record<TrackedPartStatus, string> = {
  'Pending': 'text-gray-400 border-gray-200',
  'In Progress': 'text-amber-500 border-amber-500/30',
  'Completed': 'text-emerald-500 border-emerald-500/30',
  'Scrapped': 'text-red-500 border-red-500/30',
  'On Hold': 'text-amber-500 border-amber-500/30',
};

export default function PartDetail() {
  const { id } = useParams<{ id: string }>();
  const partId = parseInt(id || '0');
  const toast = useToast();

  const { data: part, isLoading } = useTrackedPart(partId);
  const { data: routeTemplate } = useRouteTemplate(part?.routeTemplateId || 0);
  const checkInMutation = useCheckInPart();
  const checkOutMutation = useCheckOutPart();

  const [checkMode, setCheckMode] = useState<'check-in' | 'check-out' | null>(null);

  // Determine if part is currently checked in (has open log)
  const openLog = part?.stationLogs?.find(l => !l.checkedOutAt);
  const isCheckedIn = !!openLog;

  const handleCheckIn = async (data: { operatorName: string; notes?: string }) => {
    try {
      await checkInMutation.mutateAsync({ id: partId, data });
      toast.success('Part checked in successfully');
      setCheckMode(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to check in');
    }
  };

  const handleCheckOut = async (data: { qualityStatus: QualityStatus; operatorName?: string; notes?: string; timeSpentMinutes?: number }) => {
    try {
      await checkOutMutation.mutateAsync({ id: partId, data });
      toast.success('Part checked out successfully');
      setCheckMode(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to check out');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>Part not found.</p>
        <Link to="/parts" className="text-blue-600 hover:underline mt-4 inline-block">Back to Parts</Link>
      </div>
    );
  }

  // Build route progress
  const routeSteps = routeTemplate?.steps || [];
  const completedStepIds = new Set(
    part.stationLogs?.filter(l => l.checkedOutAt && l.qualityStatus === 'Pass').map(l => l.routeStepId) || []
  );
  const failedStepIds = new Set(
    part.stationLogs?.filter(l => l.qualityStatus === 'Fail').map(l => l.routeStepId) || []
  );

  return (
    <div>
      <Link to="/parts" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Parts
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 font-mono">{part.trackingId || `Part #${part.id}`}</h1>
            <p className="text-sm text-gray-400">{part.partNumber || 'No part number'}</p>
            {part.description && <p className="text-gray-400 mt-1">{part.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${STATUS_COLORS[part.status]}`}>
              {part.status}
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-medium text-gray-400 border border-gray-200">
              {part.identificationType}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-400">Job</p>
            <Link to={`/jobs/${part.jobId}`} className="text-blue-600 hover:underline font-semibold">
              {part.jobNumber || `#${part.jobId}`}
            </Link>
          </div>
          <div>
            <p className="text-sm text-gray-400">Route</p>
            <p className="text-gray-900 font-semibold">{part.routeTemplateName || 'None'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Current Station</p>
            <p className="text-gray-900 font-semibold">{part.currentStationName || 'Not started'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Serial #</p>
            <p className="text-gray-900 font-semibold">{part.serialNumber || '-'}</p>
          </div>
        </div>

        {/* Action buttons */}
        {part.status !== 'Completed' && part.status !== 'Scrapped' && part.routeTemplateId && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            {!isCheckedIn ? (
              <button
                onClick={() => setCheckMode('check-in')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-[10px] text-sm font-medium active:scale-[0.98] transition-all"
              >
                <SignIn className="w-4 h-4" />
                Check In to Next Station
              </button>
            ) : (
              <button
                onClick={() => setCheckMode('check-out')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[10px] text-sm font-medium active:scale-[0.98] transition-all"
              >
                <SignOut className="w-4 h-4" />
                Check Out of {openLog?.stationName || 'Station'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Route Progress Timeline */}
      {routeSteps.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Route Progress</h2>
          <div className="flex items-start gap-0">
            {routeSteps.map((step, index) => {
              const isCompleted = completedStepIds.has(step.id);
              const isFailed = failedStepIds.has(step.id);
              const isCurrent = part.currentStepId === step.id;
              return (
                <div key={step.id} className="flex items-start flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isCompleted ? 'bg-green-500/20 border-green-500' :
                      isFailed ? 'bg-red-500/20 border-red-500' :
                      isCurrent ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                       isFailed ? <XCircle className="w-5 h-5 text-red-400" /> :
                       isCurrent ? <Clock className="w-5 h-5 text-blue-400" /> :
                       <Circle className="w-5 h-5 text-gray-400" />}
                    </div>
                    <p className={`text-xs mt-2 text-center ${
                      isCurrent ? 'text-blue-500 font-medium' :
                      isCompleted ? 'text-green-600' :
                      isFailed ? 'text-red-500' :
                      'text-gray-400'
                    }`}>
                      {step.stationName}
                    </p>
                    {step.estimatedMinutes && (
                      <p className="text-xs text-gray-400">{step.estimatedMinutes}m</p>
                    )}
                  </div>
                  {index < routeSteps.length - 1 && (
                    <div className={`h-0.5 flex-1 mt-5 ${
                      isCompleted ? 'bg-green-500/50' : 'bg-gray-100'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Station Logs */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-6">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Station Log History</h2>
        {(!part.stationLogs || part.stationLogs.length === 0) ? (
          <p className="text-gray-400 italic">No station logs yet. Check the part in to begin tracking.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-3 text-sm font-medium text-gray-400">Step</th>
                <th className="text-left p-3 text-sm font-medium text-gray-400">Station</th>
                <th className="text-left p-3 text-sm font-medium text-gray-400">Operator</th>
                <th className="text-left p-3 text-sm font-medium text-gray-400">Checked In</th>
                <th className="text-left p-3 text-sm font-medium text-gray-400">Checked Out</th>
                <th className="text-left p-3 text-sm font-medium text-gray-400">Duration</th>
                <th className="text-left p-3 text-sm font-medium text-gray-400">Quality</th>
                <th className="text-left p-3 text-sm font-medium text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody>
              {part.stationLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50">
                  <td className="p-3 text-gray-400">{log.stepOrder || '-'}</td>
                  <td className="p-3 text-gray-900">{log.stationName || '-'}</td>
                  <td className="p-3 text-gray-600">{log.operatorName || '-'}</td>
                  <td className="p-3 text-gray-600 text-sm">{new Date(log.checkedInAt).toLocaleString()}</td>
                  <td className="p-3 text-gray-600 text-sm">
                    {log.checkedOutAt ? new Date(log.checkedOutAt).toLocaleString() : (
                      <span className="text-blue-500 italic">In progress</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">
                    {log.timeSpentMinutes != null ? `${log.timeSpentMinutes.toFixed(1)} min` : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs font-medium ${
                      log.qualityStatus === 'Pass' ? 'text-emerald-500' :
                      log.qualityStatus === 'Fail' ? 'text-red-500' :
                      'text-amber-500'
                    }`}>
                      {log.qualityStatus}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400 text-sm">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Check-in/out Modal */}
      <StationCheckInOut
        isOpen={checkMode !== null}
        onClose={() => setCheckMode(null)}
        part={part}
        mode={checkMode || 'check-in'}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        isPending={checkInMutation.isPending || checkOutMutation.isPending}
      />
    </div>
  );
}
