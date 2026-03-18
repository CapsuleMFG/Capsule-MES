import { useState } from 'react';
import Modal from '../ui/Modal';
import type { TrackedPart, QualityStatus } from '../../../../shared/types';

interface StationCheckInOutProps {
  isOpen: boolean;
  onClose: () => void;
  part: TrackedPart | null;
  mode: 'check-in' | 'check-out';
  onCheckIn: (data: { operatorName: string; notes?: string }) => void;
  onCheckOut: (data: { qualityStatus: QualityStatus; operatorName?: string; notes?: string; timeSpentMinutes?: number }) => void;
  isPending: boolean;
}

export default function StationCheckInOut({ isOpen, onClose, part, mode, onCheckIn, onCheckOut, isPending }: StationCheckInOutProps) {
  const [operatorName, setOperatorName] = useState('');
  const [qualityStatus, setQualityStatus] = useState<QualityStatus>('Pass');
  const [notes, setNotes] = useState('');
  const [timeOverride, setTimeOverride] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'check-in') {
      onCheckIn({ operatorName, notes: notes || undefined });
    } else {
      onCheckOut({
        qualityStatus,
        operatorName: operatorName || undefined,
        notes: notes || undefined,
        timeSpentMinutes: timeOverride ? Number(timeOverride) : undefined,
      });
    }
    setOperatorName('');
    setQualityStatus('Pass');
    setNotes('');
    setTimeOverride('');
  };

  if (!part) return null;

  // Find the open log for check-out
  const openLog = part.stationLogs?.find(l => !l.checkedOutAt);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'check-in' ? 'Check In Part' : 'Check Out Part'}
    >
      {/* Part Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Tracking ID:</span>
            <span className="ml-2 text-gray-900 font-mono">{part.trackingId || `#${part.id}`}</span>
          </div>
          <div>
            <span className="text-gray-400">Part Number:</span>
            <span className="ml-2 text-gray-900">{part.partNumber || '-'}</span>
          </div>
          <div>
            <span className="text-gray-400">Route:</span>
            <span className="ml-2 text-gray-900">{part.routeTemplateName || 'None'}</span>
          </div>
          <div>
            <span className="text-gray-400">Current Station:</span>
            <span className="ml-2 text-gray-900">{part.currentStationName || 'Not started'}</span>
          </div>
        </div>
      </div>

      {mode === 'check-out' && openLog && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm">
          <p className="text-blue-700">
            Checked in at <strong>{openLog.stationName}</strong> by <strong>{openLog.operatorName}</strong> at {new Date(openLog.checkedInAt).toLocaleString()}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Operator Name {mode === 'check-in' ? '*' : ''}
          </label>
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-3 text-lg text-gray-900 focus:outline-none focus:border-blue-500"
            placeholder="Enter operator name"
            required={mode === 'check-in'}
          />
        </div>

        {mode === 'check-out' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Quality Status *</label>
              <div className="flex gap-3">
                {(['Pass', 'Fail', 'Pending'] as QualityStatus[]).map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setQualityStatus(status)}
                    className={`flex-1 py-3 px-4 rounded-lg border text-base font-medium transition-colors ${
                      qualityStatus === status
                        ? status === 'Pass'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : status === 'Fail'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Time Override (minutes)</label>
              <input
                type="number"
                value={timeOverride}
                onChange={(e) => setTimeOverride(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-lg px-4 py-3 text-lg text-gray-900 focus:outline-none focus:border-blue-500"
                placeholder="Auto-calculated if left empty"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-lg px-4 py-3 text-lg text-gray-900 focus:outline-none focus:border-blue-500"
            rows={2}
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-6 py-3 text-base text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || (mode === 'check-in' && !operatorName.trim())}
            className={`px-6 py-3 rounded-lg text-base font-medium text-white disabled:opacity-50 transition-colors ${
              mode === 'check-in' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isPending ? 'Processing...' : mode === 'check-in' ? 'Check In' : 'Check Out'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
