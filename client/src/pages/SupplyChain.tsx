import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useJobs } from '../hooks/useJobs';
import { useScPriorities, useUpdateScPriorities } from '../hooks/useSupplyChainPriorities';
import { useToast } from '../contexts/ToastContext';
import * as jobsService from '../services/jobs.service';
import PbomTableSupplyChain from '../components/supplychain/PbomTableSupplyChain';
import SortableJobCard from '../components/supplychain/SortableJobCard';
import GlobalInventoryPanel from '../components/supplychain/GlobalInventoryPanel';
import OrderTrackingPanel from '../components/supplychain/OrderTrackingPanel';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { LayoutGrid, List, TruckIcon, Package, Warehouse, ClipboardList, PackageCheck } from 'lucide-react';

function ProcurementSummary({ jobId }: { jobId: number }) {
  const { data: procurement, isLoading } = useQuery({
    queryKey: ['procurement', jobId],
    queryFn: () => jobsService.getProcurementItems(jobId),
  });

  const getProcurementStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Received': return 'bg-green-500/20 text-green-400';
      case 'Ordered': return 'bg-blue-500/20 text-blue-400';
      case 'Partial': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!procurement || procurement.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No procurement items for this job
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Status</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Qty (Recv/Need)</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Supplier</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">PO #</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-400 uppercase">Expected</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 uppercase">Cost</th>
          </tr>
        </thead>
        <tbody>
          {procurement.map((item) => (
            <tr key={item.id} className="border-b border-gray-800 hover:bg-rivian-hover">
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getProcurementStatusBadgeColor(item.status)}`}>
                  {item.status}
                </span>
              </td>
              <td className="py-2 px-3 text-white">
                {item.quantityReceived}/{item.quantityNeeded}
              </td>
              <td className="py-2 px-3 text-gray-300">{item.supplierName || '-'}</td>
              <td className="py-2 px-3 text-gray-300">{item.poNumber || '-'}</td>
              <td className="py-2 px-3 text-gray-300">
                {item.expectedDeliveryDate
                  ? new Date(item.expectedDeliveryDate).toLocaleDateString()
                  : '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-300">
                {item.cost ? `$${(item.cost * item.quantityNeeded).toFixed(2)}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupplyChain() {
  const [activeTab, setActiveTab] = useState<'procurement' | 'inventory' | 'orders'>('procurement');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  const toast = useToast();

  const { data: allJobs, isLoading, error } = useJobs({
    search: search || undefined,
  });

  const { data: scPriorities } = useScPriorities();
  const updatePriorities = useUpdateScPriorities();

  // Drag-and-drop sensors with distance threshold to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Filter jobs to only show those in WO Release or Materials stages (In Progress or Not Started)
  const scJobs = useMemo(() => {
    if (!allJobs) return [];
    return allJobs.filter((job) => {
      const woReleaseStage = job.workflowProgress?.find(
        (progress) => progress.stageName === 'WO Release'
      );
      const materialsStage = job.workflowProgress?.find(
        (progress) => progress.stageName === 'Materials'
      );

      const woReleaseActive =
        woReleaseStage &&
        (woReleaseStage.status === 'In Progress' || woReleaseStage.status === 'Not Started');

      const materialsActive =
        materialsStage &&
        (materialsStage.status === 'In Progress' || materialsStage.status === 'Not Started');

      return woReleaseActive || materialsActive;
    });
  }, [allJobs]);

  // Sort jobs by SC priority
  const jobs = useMemo(() => {
    if (!scJobs.length) return scJobs;
    if (!scPriorities?.length) return scJobs;

    const priorityMap = new Map(scPriorities.map((p) => [p.jobId, p.priority]));
    return [...scJobs].sort((a, b) => {
      const aPri = priorityMap.get(a.id) ?? 999999;
      const bPri = priorityMap.get(b.id) ?? 999999;
      return aPri - bPri;
    });
  }, [scJobs, scPriorities]);

  // Build a map from job ID to display priority number (1-based index in sorted order)
  const priorityDisplayMap = useMemo(() => {
    const map = new Map<number, number>();
    jobs.forEach((job, index) => {
      map.set(job.id, index + 1);
    });
    return map;
  }, [jobs]);

  // Whether filters are active (disables drag)
  const isFiltered = !!search;

  // Job IDs for SortableContext
  const jobIds = useMemo(() => jobs.map((j) => j.id), [jobs]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = jobs.findIndex((j) => j.id === active.id);
    const newIndex = jobs.findIndex((j) => j.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(jobs, oldIndex, newIndex);
    const newPriorities = reordered.map((job, index) => ({
      jobId: job.id,
      priority: index + 1,
    }));

    updatePriorities.mutate(newPriorities, {
      onSuccess: (data) => {
        const { pbomItemsReallocated } = data.reallocationSummary;
        if (pbomItemsReallocated > 0) {
          toast.success(`Priority updated. ${pbomItemsReallocated} allocation(s) adjusted.`);
        } else {
          toast.success('Priority order updated');
        }
      },
      onError: () => {
        toast.error('Failed to update priority order');
      },
    });
  }

  // Calculate metrics
  const totalJobs = jobs?.length || 0;

  const woReleaseJobs = jobs?.filter((job) => {
    const stage = job.workflowProgress?.find((p) => p.stageName === 'WO Release');
    return stage && (stage.status === 'In Progress' || stage.status === 'Not Started');
  }) || [];
  const inWoRelease = woReleaseJobs.length;
  const woReleaseActive = woReleaseJobs.filter((job) => {
    const stage = job.workflowProgress?.find((p) => p.stageName === 'WO Release');
    return stage?.status === 'In Progress';
  }).length;

  const materialsJobs = jobs?.filter((job) => {
    const stage = job.workflowProgress?.find((p) => p.stageName === 'Materials');
    return stage && (stage.status === 'In Progress' || stage.status === 'Not Started');
  }) || [];
  const inMaterials = materialsJobs.length;
  const materialsActive = materialsJobs.filter((job) => {
    const stage = job.workflowProgress?.find((p) => p.stageName === 'Materials');
    return stage?.status === 'In Progress';
  }).length;

  if (isLoading && activeTab === 'procurement') {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && activeTab === 'procurement') {
    return (
      <div className="text-center text-red-500 p-8">
        Error loading jobs. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Supply Chain</h1>
        <p className="text-gray-400 mt-2">
          Project procurement tracking and global inventory management
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-rivian-soft-black rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('procurement')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'procurement'
              ? 'bg-rivian-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-rivian-hover'
          }`}
        >
          <TruckIcon className="w-4 h-4" />
          Project Procurement
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'inventory'
              ? 'bg-rivian-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-rivian-hover'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Global Inventory
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'orders'
              ? 'bg-rivian-accent text-white'
              : 'text-gray-400 hover:text-white hover:bg-rivian-hover'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Order Tracking
        </button>
      </div>

      {/* Procurement Tab */}
      {activeTab === 'procurement' && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Package className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">In Pipeline</p>
                  <p className="text-2xl font-bold text-white">{totalJobs}</p>
                  <p className="text-xs text-gray-500">{totalJobs === 1 ? '1 job' : `${totalJobs} jobs`} awaiting SC</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">WO Release</p>
                  <p className="text-2xl font-bold text-white">{inWoRelease}</p>
                  <p className="text-xs text-gray-500">{woReleaseActive} active, {inWoRelease - woReleaseActive} queued</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/10 rounded-lg">
                  <TruckIcon className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Materials</p>
                  <p className="text-2xl font-bold text-white">{inMaterials}</p>
                  <p className="text-xs text-gray-500">{materialsActive} active, {inMaterials - materialsActive} queued</p>
                </div>
              </div>
            </Card>

          </div>

          {/* Filters and View Toggle */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by job number, description, or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-rivian-accent text-white'
                    : 'bg-rivian-soft-black text-gray-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-rivian-accent text-white'
                    : 'bg-rivian-soft-black text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drag reorder hint */}
          {!isFiltered && jobs.length > 1 && (
            <p className="text-xs text-gray-500 mb-3">
              Drag jobs to reorder priority. Higher priority jobs get inventory allocated first.
            </p>
          )}
          {isFiltered && jobs.length > 0 && (
            <p className="text-xs text-yellow-500/70 mb-3">
              Drag reordering disabled while filters are active.
            </p>
          )}

          {/* Jobs Display with PBOM + Procurement */}
          {jobs && jobs.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={jobIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <SortableJobCard
                      key={job.id}
                      job={job}
                      priority={priorityDisplayMap.get(job.id) || 0}
                      isExpanded={expandedJobId === job.id}
                      onToggleExpand={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                      isDragDisabled={isFiltered}
                    >
                      <PbomTableSupplyChain jobId={job.id} />
                      <div>
                        <h4 className="text-md font-semibold text-white mb-3">Procurement Items</h4>
                        <ProcurementSummary jobId={job.id} />
                      </div>
                    </SortableJobCard>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 bg-rivian-soft-black rounded-lg">
              <p className="text-gray-400 text-lg">No jobs in Supply Chain stages</p>
              <p className="text-gray-500 text-sm mt-2">
                {search
                  ? 'Try adjusting your search'
                  : 'No jobs currently in WO Release or Materials stages'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <GlobalInventoryPanel />
      )}

      {/* Order Tracking Tab */}
      {activeTab === 'orders' && (
        <OrderTrackingPanel />
      )}
    </div>
  );
}
