import type { TrackedPart } from '../../../../shared/types';
import { X, ArrowDown, CheckCircle, XCircle, Prohibit, PauseCircle, MapPin } from '@phosphor-icons/react';

interface KioskPartModalProps {
  part: TrackedPart & { queueStatus?: string; checkedInAt?: string; operatorName?: string };
  stationName: string;
  operatorName: string;
  onCheckIn: () => void;
  onCheckOutPass: () => void;
  onCheckOutFail: () => void;
  onScrap: () => void;
  onHold: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function KioskPartModal({
  part,
  stationName,
  operatorName,
  onCheckIn,
  onCheckOutPass,
  onCheckOutFail,
  onScrap,
  onHold,
  onClose,
  isLoading,
}: KioskPartModalProps) {
  const isCheckedIn = part.queueStatus === 'checked_in';
  const isWaiting = part.queueStatus === 'waiting';

  // Build route progress from station logs
  const logs = part.stationLogs || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white border border-gray-100 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 font-mono">
              {part.trackingId || `Part #${part.id}`}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {part.partNumber && <span className="mr-3">{part.partNumber}</span>}
              {part.description && <span>{part.description}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Part Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-xs uppercase">Job</p>
              <p className="text-gray-900 font-medium text-lg">{part.jobNumber || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Serial Number</p>
              <p className="text-gray-900 font-medium text-lg">{part.serialNumber || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Status</p>
              <p className={`font-medium text-lg ${
                part.status === 'In Progress' ? 'text-blue-500' :
                part.status === 'Completed' ? 'text-emerald-600' :
                part.status === 'Scrapped' ? 'text-red-500' :
                part.status === 'On Hold' ? 'text-amber-500' :
                'text-gray-400'
              }`}>{part.status}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Current Station</p>
              <p className="text-gray-900 font-medium text-lg">{part.currentStationName || 'Not started'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">Route</p>
              <p className="text-gray-900 font-medium text-lg">{part.routeTemplateName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase">ID Type</p>
              <p className="text-gray-900 font-medium text-lg">{part.identificationType}</p>
            </div>
          </div>

          {/* Route Progress */}
          {logs.length > 0 && (
            <div>
              <h3 className="text-gray-400 text-sm font-semibold uppercase mb-3 flex items-center gap-2">
                <MapPin size={16} />
                Route Progress
              </h3>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      log.stationName === stationName ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      log.checkedOutAt && log.qualityStatus === 'Pass' ? 'bg-emerald-500' :
                      log.checkedOutAt && log.qualityStatus === 'Fail' ? 'bg-red-500' :
                      !log.checkedOutAt ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 text-sm font-medium">{log.stationName}</span>
                      {log.operatorName && (
                        <span className="text-gray-400 text-xs ml-2">({log.operatorName})</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {log.checkedOutAt ? (
                        <span className={`text-xs font-medium ${
                          log.qualityStatus === 'Pass' ? 'text-emerald-600' : 'text-red-500'
                        }`}>
                          {log.qualityStatus} {log.timeSpentMinutes ? `(${Math.round(log.timeSpentMinutes)} min)` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-blue-500">In Progress</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {part.notes && (
            <div>
              <p className="text-gray-400 text-xs uppercase mb-1">Notes</p>
              <p className="text-gray-600 text-sm">{part.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {isWaiting && (
              <button
                onClick={onCheckIn}
                disabled={isLoading || !operatorName.trim()}
                className="flex-1 min-w-[180px] py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-lg transition-colors touch-manipulation"
              >
                <ArrowDown size={20} />
                CHECK IN
              </button>
            )}

            {isCheckedIn && (
              <>
                <button
                  onClick={onCheckOutPass}
                  disabled={isLoading}
                  className="flex-1 min-w-[140px] py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-100 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-lg transition-colors touch-manipulation"
                >
                  <CheckCircle size={20} />
                  PASS
                </button>
                <button
                  onClick={onCheckOutFail}
                  disabled={isLoading}
                  className="flex-1 min-w-[140px] py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-100 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-lg transition-colors touch-manipulation"
                >
                  <XCircle size={20} />
                  FAIL
                </button>
              </>
            )}

            {/* Always show status change buttons if part is actionable */}
            {(isWaiting || isCheckedIn || (!isWaiting && !isCheckedIn)) && (
              <>
                <button
                  onClick={onScrap}
                  disabled={isLoading}
                  className="py-4 px-5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors touch-manipulation border border-red-200"
                >
                  <Prohibit size={20} />
                  Scrap
                </button>
                <button
                  onClick={onHold}
                  disabled={isLoading}
                  className="py-4 px-5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors touch-manipulation border border-amber-200"
                >
                  <PauseCircle size={20} />
                  Hold
                </button>
              </>
            )}
          </div>
          {isWaiting && !operatorName.trim() && (
            <p className="text-amber-600 text-sm mt-2 text-center">Enter operator name to check in</p>
          )}
        </div>
      </div>
    </div>
  );
}
