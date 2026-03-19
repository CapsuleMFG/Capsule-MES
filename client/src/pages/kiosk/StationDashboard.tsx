import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKiosk } from '../../contexts/KioskContext';
import { useToast } from '../../contexts/ToastContext';
import { useStationQueue, useCheckInPart, useCheckOutPart, useUpdateTrackedPart, useLookupByTrackingId } from '../../hooks/usePartsTracking';
import KioskPartModal from '../../components/kiosk/KioskPartModal';
import KioskQueue from '../../components/kiosk/KioskQueue';
import * as productionService from '../../services/production.service';
import * as engineeringService from '../../services/engineering.service';
import type { TrackedPart, StationQueuePart, WorkOrder } from '../../../../shared/types';
import {
  SignOut, MagnifyingGlass, Clock, ArrowFatLinesDown, ArrowFatLinesUp,
  CheckCircle, XCircle, Prohibit, PauseCircle, ArrowLeft, DownloadSimple,
  CaretRight,
} from '@phosphor-icons/react';

export default function StationDashboard() {
  const { station, clearMachine, logout } = useKiosk();
  const toast = useToast();
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [searchId, setSearchId] = useState('');
  const [operatorName, setOperatorName] = useState(() => {
    return sessionStorage.getItem('capsule_kiosk_operator') || '';
  });
  const [selectedPart, setSelectedPart] = useState<(TrackedPart & { queueStatus?: string }) | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedWaitingIds, setSelectedWaitingIds] = useState<Set<number>>(new Set());
  const [selectedCheckedInIds, setSelectedCheckedInIds] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [kioskView, setKioskView] = useState<'schedule' | 'parts'>('schedule');

  // Fetch WOs for the machine
  const { data: allWorkOrders, refetch: refetchWOs } = useQuery({
    queryKey: ['productionPool'],
    queryFn: productionService.getProductionPool,
    refetchInterval: 30000,
  });

  // Station queue filtered by selected WO (precise per-WO filtering)
  const { data: queue, refetch: refetchQueue } = useStationQueue(
    station?.stationName || '',
    selectedWO?.jobId,
    selectedWO?.id,
  );

  const checkIn = useCheckInPart();
  const checkOut = useCheckOutPart();
  const updatePart = useUpdateTrackedPart();
  const lookupMutation = useLookupByTrackingId();

  // Filter WOs to those assigned to this machine
  const machineWOs = useMemo(() => {
    if (!allWorkOrders || !station?.machineId) return [];
    const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return allWorkOrders
      .filter(wo => wo.assignedMachineId === station.machineId && wo.productionStatus !== 'Discarded')
      .sort((a, b) => {
        const ap = priorityOrder[(a.productionPriority || (a as any).priority) as string] ?? 4;
        const bp = priorityOrder[(b.productionPriority || (b as any).priority) as string] ?? 4;
        return ap - bp;
      });
  }, [allWorkOrders, station?.machineId]);

  // Persist operator name
  useEffect(() => {
    if (operatorName) {
      sessionStorage.setItem('capsule_kiosk_operator', operatorName);
    }
  }, [operatorName]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh queue every 15 seconds when viewing parts
  useEffect(() => {
    if (!selectedWO) return;
    const timer = setInterval(() => refetchQueue(), 15000);
    return () => clearInterval(timer);
  }, [selectedWO, refetchQueue]);

  if (!station) return null;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const getTimeElapsed = (checkedInAt?: string) => {
    if (!checkedInAt) return '';
    const diff = (Date.now() - new Date(checkedInAt + 'Z').getTime()) / 60000;
    if (diff < 1) return '<1 min';
    if (diff < 60) return `${Math.floor(diff)} min`;
    return `${Math.floor(diff / 60)}h ${Math.floor(diff % 60)}m`;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-50 text-red-500 border-red-200';
      case 'High': return 'bg-orange-50 text-orange-500 border-orange-200';
      case 'Medium': return 'bg-blue-50 text-blue-500 border-blue-200';
      default: return 'bg-gray-50 text-gray-400 border-gray-200';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-50 text-green-500 border-green-200';
      case 'In Progress': return 'bg-blue-50 text-blue-500 border-blue-200';
      case 'Discarded': return 'bg-red-50 text-red-500 border-red-200';
      default: return 'bg-gray-50 text-gray-400 border-gray-200';
    }
  };

  const checkedIn: StationQueuePart[] = queue?.checkedIn || [];
  const waiting: StationQueuePart[] = queue?.waiting || [];

  // ---- Part actions ----
  const handleLookup = async () => {
    if (!searchId.trim()) return;
    try {
      const parts = await lookupMutation.mutateAsync(searchId.trim());
      if (parts.length > 0) {
        setSelectedPart(parts[0]);
        setShowModal(true);
      } else {
        toast.warning('No part found with that tracking ID');
      }
    } catch {
      toast.error('Part not found');
    }
    setSearchId('');
  };

  const handleCheckIn = async (part: TrackedPart & { queueStatus?: string }) => {
    if (!operatorName.trim()) {
      toast.warning('Enter operator name first');
      return;
    }
    try {
      await checkIn.mutateAsync({ id: part.id, data: { operatorName: operatorName.trim() } });
      toast.success(`Checked in: ${part.trackingId || part.partNumber || `Part #${part.id}`}`);
      setSelectedPart(null);
      setShowModal(false);
      refetchQueue();
      refetchWOs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Check-in failed');
    }
  };

  const handleCheckOut = async (part: TrackedPart & { queueStatus?: string }, qualityStatus: 'Pass' | 'Fail') => {
    try {
      await checkOut.mutateAsync({ id: part.id, data: { qualityStatus, operatorName: operatorName.trim() || undefined } });
      toast.success(`Checked out (${qualityStatus}): ${part.trackingId || part.partNumber || `Part #${part.id}`}`);
      setSelectedPart(null);
      setShowModal(false);
      refetchQueue();
      refetchWOs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Check-out failed');
    }
  };

  const handleStatusChange = async (part: TrackedPart, status: 'Scrapped' | 'On Hold') => {
    try {
      await updatePart.mutateAsync({ id: part.id, data: { status } });
      toast.success(`Part marked as ${status}`);
      setSelectedPart(null);
      setShowModal(false);
      refetchQueue();
    } catch {
      toast.error(`Failed to mark as ${status}`);
    }
  };

  // ---- Bulk actions ----
  const toggleWaiting = (id: number) => {
    setSelectedWaitingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCheckedIn = (id: number) => {
    setSelectedCheckedInIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllWaiting = () => {
    if (selectedWaitingIds.size === waiting.length) {
      setSelectedWaitingIds(new Set());
    } else {
      setSelectedWaitingIds(new Set(waiting.map((p) => p.id)));
    }
  };

  const toggleAllCheckedIn = () => {
    if (selectedCheckedInIds.size === checkedIn.length) {
      setSelectedCheckedInIds(new Set());
    } else {
      setSelectedCheckedInIds(new Set(checkedIn.map((p) => p.id)));
    }
  };

  const handleBulkCheckIn = async () => {
    if (!operatorName.trim()) {
      toast.warning('Enter operator name first');
      return;
    }
    const ids = Array.from(selectedWaitingIds);
    if (ids.length === 0) return;
    setIsBulkProcessing(true);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await checkIn.mutateAsync({ id, data: { operatorName: operatorName.trim() } });
        success++;
      } catch {
        failed++;
      }
    }
    setSelectedWaitingIds(new Set());
    refetchQueue();
    refetchWOs();
    setIsBulkProcessing(false);
    if (failed === 0) {
      toast.success(`Checked in ${success} part${success !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Checked in ${success}, failed ${failed}`);
    }
  };

  const handleBulkCheckOut = async (qualityStatus: 'Pass' | 'Fail') => {
    const ids = Array.from(selectedCheckedInIds);
    if (ids.length === 0) return;
    setIsBulkProcessing(true);
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await checkOut.mutateAsync({ id, data: { qualityStatus, operatorName: operatorName.trim() || undefined } });
        success++;
      } catch {
        failed++;
      }
    }
    setSelectedCheckedInIds(new Set());
    refetchQueue();
    refetchWOs();
    setIsBulkProcessing(false);
    if (failed === 0) {
      toast.success(`${qualityStatus === 'Pass' ? 'Passed' : 'Failed'} ${success} part${success !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`${qualityStatus}: ${success} ok, ${failed} failed`);
    }
  };

  const handleDownloadPdf = async (jobId: number, woId: number) => {
    try {
      const files = await engineeringService.getWorkOrderFiles(jobId, woId);
      if (files && files.length > 0) {
        const pdfFile = files[0];
        const blob = await engineeringService.downloadWorkOrderFile(jobId, woId, pdfFile.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFile.originalFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded!');
      } else {
        toast.warning('No PDF file found for this work order');
      }
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  // ---- RENDER ----
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">CAPSULE</h1>
          <div className="h-8 w-px bg-gray-100" />
          <h2 className="text-xl font-semibold text-gray-900">{station.stationName}</h2>
          {station.machineName && (
            <>
              <div className="h-8 w-px bg-gray-100" />
              <span className="text-gray-400">{station.machineName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 mr-4">
            <button
              onClick={() => setKioskView('schedule')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${kioskView === 'schedule' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Schedule
            </button>
            <button
              onClick={() => setKioskView('parts')}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${kioskView === 'parts' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Parts Tracking
            </button>
          </div>
          <span className="text-gray-400 font-mono text-lg">{formatTime(currentTime)}</span>
          <button
            onClick={clearMachine}
            className="flex items-center gap-2 py-3 px-6 text-base bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors touch-manipulation"
          >
            Switch Machine
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 py-3 px-6 text-base bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors touch-manipulation"
          >
            <SignOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </header>

      {/* ========== SCHEDULE VIEW ========== */}
      {kioskView === 'schedule' && station?.machineId && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <KioskQueue machineId={station.machineId} machineName={station.machineName || ''} />
          </div>
        </div>
      )}

      {/* ========== WO LIST VIEW ========== */}
      {kioskView === 'parts' && !selectedWO && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Work Orders ({machineWOs.length})
            </h3>

            {machineWOs.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg text-gray-400">All caught up!</p>
                <p className="text-gray-400 text-sm mt-2">No work orders assigned to this machine</p>
              </div>
            ) : (
              <div className="space-y-3">
                {machineWOs.map((wo) => (
                  <button
                    key={wo.id}
                    onClick={() => setSelectedWO(wo)}
                    className="w-full text-left bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 rounded-xl p-5 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-semibold text-lg">{wo.woNumber}</span>
                        {(wo.productionPriority || (wo as any).priority) && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(wo.productionPriority || (wo as any).priority)}`}>
                            {wo.productionPriority || (wo as any).priority}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(wo.productionStatus)}`}>
                          {wo.productionStatus}
                        </span>
                      </div>
                      <CaretRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="mt-2 text-sm text-gray-400">
                      <span className="text-gray-400">Job:</span>{' '}
                      <span className="text-gray-900 font-medium">{(wo as any).jobNumber}</span>
                      {(wo as any).clientName && (
                        <>
                          {' \u2022 '}
                          <span className="text-gray-400">Client:</span>{' '}
                          <span className="text-gray-900">{(wo as any).clientName}</span>
                        </>
                      )}
                    </div>
                    {wo.description && (
                      <div className="mt-1 text-sm text-gray-400 truncate">{wo.description}</div>
                    )}
                    <div className="mt-2 flex items-center gap-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(wo.jobId, wo.id); }}
                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <DownloadSimple className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== PARTS VIEW (WO selected) ========== */}
      {kioskView === 'parts' && selectedWO && (
        <>
          {/* Sub-header: WO info + back + search/operator */}
          <div className="bg-white border-b border-gray-100 px-6 py-3 shrink-0 space-y-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setSelectedWO(null); setSelectedPart(null); setShowModal(false); setSelectedWaitingIds(new Set()); setSelectedCheckedInIds(new Set()); }}
                className="flex items-center gap-2 py-3 px-6 text-base bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <span className="text-gray-900 font-semibold text-lg">{selectedWO.woNumber}</span>
                <span className="text-gray-400 ml-3 text-sm">
                  Job: {(selectedWO as any).jobNumber}
                  {(selectedWO as any).clientName && ` \u2022 ${(selectedWO as any).clientName}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Tracking ID Search */}
              <div className="flex items-center gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    placeholder="Scan or type Tracking ID..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-lg text-gray-900 text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500 touch-manipulation"
                  />
                </div>
                <button
                  onClick={handleLookup}
                  disabled={!searchId.trim() || lookupMutation.isPending}
                  className="py-3 px-6 text-base bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg transition-colors touch-manipulation"
                >
                  Lookup
                </button>
              </div>

              {/* Operator Name */}
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-sm">Operator:</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Name..."
                  className="px-3 py-3 bg-white border border-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 w-48 touch-manipulation"
                />
              </div>
            </div>
          </div>

          {/* Two-column parts layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Waiting Queue */}
            <div className="flex-1 border-r border-gray-100 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-blue-500 flex items-center gap-2">
                    <ArrowFatLinesDown className="w-5 h-5" />
                    Queue: Waiting ({waiting.length})
                  </h3>
                  {waiting.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer touch-manipulation">
                        <input
                          type="checkbox"
                          checked={selectedWaitingIds.size === waiting.length && waiting.length > 0}
                          onChange={toggleAllWaiting}
                          className="w-5 h-5 rounded border-gray-200 accent-blue-500"
                        />
                        Select All
                      </label>
                      {selectedWaitingIds.size > 0 && (
                        <button
                          onClick={handleBulkCheckIn}
                          disabled={isBulkProcessing}
                          className="py-3 px-6 text-base bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                        >
                          <ArrowFatLinesDown className="w-4 h-4" />
                          {isBulkProcessing ? 'Processing...' : `Check In (${selectedWaitingIds.size})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {waiting.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">No parts waiting</div>
                ) : (
                  waiting.map((part) => (
                    <div
                      key={part.id}
                      className={`flex items-center gap-3 bg-white hover:bg-gray-50 border rounded-lg p-4 transition-colors touch-manipulation ${
                        selectedWaitingIds.has(part.id) ? 'border-blue-500/50 bg-blue-50' : 'border-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWaitingIds.has(part.id)}
                        onChange={() => toggleWaiting(part.id)}
                        className="w-5 h-5 rounded border-gray-200 accent-blue-500 shrink-0"
                      />
                      <button
                        onClick={() => { setSelectedPart(part); setShowModal(true); }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-amber-500 font-mono font-semibold text-lg">
                            {part.trackingId || `#${part.id}`}
                          </span>
                          <span className="text-xs bg-blue-50 text-blue-500 px-2 py-1 rounded">WAITING</span>
                        </div>
                        <div className="mt-1 text-gray-400 text-sm">
                          {part.partNumber && <span className="mr-3">{part.partNumber}</span>}
                          {part.jobNumber && <span className="text-gray-400">{part.jobNumber}</span>}
                        </div>
                        {part.serialNumber && (
                          <div className="text-gray-400 text-xs mt-1">S/N: {part.serialNumber}</div>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Checked In */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-500 flex items-center gap-2">
                    <ArrowFatLinesUp className="w-5 h-5" />
                    Active: Checked In ({checkedIn.length})
                  </h3>
                  {checkedIn.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer touch-manipulation">
                        <input
                          type="checkbox"
                          checked={selectedCheckedInIds.size === checkedIn.length && checkedIn.length > 0}
                          onChange={toggleAllCheckedIn}
                          className="w-5 h-5 rounded border-gray-200 accent-green-500"
                        />
                        Select All
                      </label>
                      {selectedCheckedInIds.size > 0 && (
                        <>
                          <button
                            onClick={() => handleBulkCheckOut('Pass')}
                            disabled={isBulkProcessing}
                            className="py-3 px-6 text-base bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {isBulkProcessing ? 'Processing...' : `Pass (${selectedCheckedInIds.size})`}
                          </button>
                          <button
                            onClick={() => handleBulkCheckOut('Fail')}
                            disabled={isBulkProcessing}
                            className="py-3 px-6 text-base bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                          >
                            <XCircle className="w-4 h-4" />
                            {isBulkProcessing ? '...' : `Fail (${selectedCheckedInIds.size})`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {checkedIn.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">No parts checked in</div>
                ) : (
                  checkedIn.map((part) => (
                    <div
                      key={part.id}
                      className={`flex items-center gap-3 bg-white hover:bg-gray-50 border rounded-lg p-4 transition-colors touch-manipulation ${
                        selectedCheckedInIds.has(part.id) ? 'border-green-500/50 bg-green-50' : 'border-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCheckedInIds.has(part.id)}
                        onChange={() => toggleCheckedIn(part.id)}
                        className="w-5 h-5 rounded border-gray-200 accent-green-500 shrink-0"
                      />
                      <button
                        onClick={() => { setSelectedPart(part); setShowModal(true); }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-amber-500 font-mono font-semibold text-lg">
                            {part.trackingId || `#${part.id}`}
                          </span>
                          <span className="text-xs bg-green-50 text-green-500 px-2 py-1 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeElapsed(part.checkedInAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-gray-400 text-sm">
                          {part.partNumber && <span className="mr-3">{part.partNumber}</span>}
                          {part.jobNumber && <span className="text-gray-400">{part.jobNumber}</span>}
                        </div>
                        {part.operatorName && (
                          <div className="text-gray-400 text-xs mt-1">Operator: {part.operatorName}</div>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          {selectedPart && !showModal && (
            <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-gray-900">
                  <span className="font-mono text-amber-500">{selectedPart.trackingId || `Part #${selectedPart.id}`}</span>
                  {selectedPart.partNumber && <span className="ml-3 text-gray-400">{selectedPart.partNumber}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {(selectedPart as StationQueuePart).queueStatus === 'waiting' && (
                    <button
                      onClick={() => handleCheckIn(selectedPart)}
                      disabled={checkIn.isPending}
                      className="py-3 px-8 text-base bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                    >
                      <ArrowFatLinesDown className="w-5 h-5" />
                      CHECK IN
                    </button>
                  )}
                  {(selectedPart as StationQueuePart).queueStatus === 'checked_in' && (
                    <>
                      <button
                        onClick={() => handleCheckOut(selectedPart, 'Pass')}
                        disabled={checkOut.isPending}
                        className="py-3 px-8 text-base bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                      >
                        <CheckCircle className="w-5 h-5" />
                        PASS
                      </button>
                      <button
                        onClick={() => handleCheckOut(selectedPart, 'Fail')}
                        disabled={checkOut.isPending}
                        className="py-3 px-8 text-base bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                      >
                        <XCircle className="w-5 h-5" />
                        FAIL
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleStatusChange(selectedPart, 'Scrapped')}
                    className="py-3 px-6 text-base bg-red-50 hover:bg-red-100 text-red-500 font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                  >
                    <Prohibit className="w-5 h-5" />
                    Scrap
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedPart, 'On Hold')}
                    className="py-3 px-6 text-base bg-amber-50 hover:bg-amber-100 text-amber-500 font-semibold rounded-lg flex items-center gap-2 touch-manipulation"
                  >
                    <PauseCircle className="w-5 h-5" />
                    Hold
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Part Detail Modal */}
          {showModal && selectedPart && (
            <KioskPartModal
              part={selectedPart}
              stationName={station.stationName}
              operatorName={operatorName}
              onCheckIn={() => handleCheckIn(selectedPart)}
              onCheckOutPass={() => handleCheckOut(selectedPart, 'Pass')}
              onCheckOutFail={() => handleCheckOut(selectedPart, 'Fail')}
              onScrap={() => handleStatusChange(selectedPart, 'Scrapped')}
              onHold={() => handleStatusChange(selectedPart, 'On Hold')}
              onClose={() => { setShowModal(false); setSelectedPart(null); }}
              isLoading={checkIn.isPending || checkOut.isPending || updatePart.isPending}
            />
          )}
        </>
      )}
    </div>
  );
}
