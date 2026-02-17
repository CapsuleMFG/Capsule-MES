import { useState, useMemo } from 'react';
import { useJobs } from '../hooks/useJobs';
import { useEngineers } from '../hooks/useEngineers';
import { useDashboardMetrics } from '../hooks/useDashboard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Download,
  Send,
  Layers,
  Trash2,
  FileCheck,
  ClipboardList,
  User,
  Calendar,
  ArrowRight,
  Filter,
  X,
  Settings,
} from 'lucide-react';
import DesignMilestones from '../components/engineering/DesignMilestones';
import BomImport from '../components/engineering/BomImport';
import BomItemsTable from '../components/engineering/BomItemsTable';
import PbomImport from '../components/engineering/PbomImport';
import PbomTableEngineering from '../components/engineering/PbomTableEngineering';
import WorkOrderFiles from '../components/engineering/WorkOrderFiles';
import SendToProductionModal from '../components/engineering/SendToProductionModal';
import InitializePartsModal from '../components/engineering/InitializePartsModal';
import RecutsTab from '../components/engineering/RecutsTab';
import ManageEngineersModal from '../components/engineering/ManageEngineersModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import * as jobsService from '../services/jobs.service';
import * as engineeringService from '../services/engineering.service';
import type { Job, WorkOrderStatus, WorkOrder } from '../types';
import { Menu } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { badge: string }> = {
  Completed: { badge: 'badge badge-completed' },
  'In Progress': { badge: 'badge badge-in-progress' },
  'Not Started': { badge: 'badge badge-not-started' },
};

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Main Component ─────────────────────────────────────────────
export default function Engineering() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showManageEngineers, setShowManageEngineers] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: allJobs, isLoading, error } = useJobs();
  const { data: engineers } = useEngineers(true); // active engineers only

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => jobsService.deleteJob(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete job');
    },
  });

  // Filter to engineering stage jobs
  const engineeringJobs = useMemo(
    () =>
      allJobs?.filter((job) => {
        const stage = job.workflowProgress?.find((p) => p.stageName === 'Engineering');
        return stage && (stage.status === 'In Progress' || stage.status === 'Not Started');
      }) || [],
    [allJobs]
  );

  // Apply filters
  const jobs = useMemo(() => {
    return engineeringJobs.filter((job) => {
      const stage = job.workflowProgress?.find((p) => p.stageName === 'Engineering');
      if (search) {
        const s = search.toLowerCase();
        if (
          !job.jobNumber.toLowerCase().includes(s) &&
          !job.description?.toLowerCase().includes(s) &&
          !job.clientName?.toLowerCase().includes(s)
        )
          return false;
      }
      if (statusFilter && stage?.status !== statusFilter) return false;
      if (assigneeFilter && !stage?.assignee?.toLowerCase().includes(assigneeFilter.toLowerCase()))
        return false;
      return true;
    });
  }, [engineeringJobs, search, statusFilter, assigneeFilter]);

  // Unique assignees
  const uniqueAssignees = useMemo(() => {
    return Array.from(
      new Set(
        engineeringJobs
          .map((job) => job.workflowProgress?.find((p) => p.stageName === 'Engineering')?.assignee)
          .filter(Boolean)
      )
    ).sort() as string[];
  }, [engineeringJobs]);

  // Get milestone-based metrics from dashboard
  const { data: dashboardMetrics } = useDashboardMetrics();

  // Metrics - use milestone-based counts from dashboard
  const totalJobs = engineeringJobs.length;
  const inProgressCount = dashboardMetrics?.inProgressJobs || 0;
  const notStartedCount = dashboardMetrics?.notStartedJobs || 0;

  // Summary data for detailed panel
  const summaryData = useMemo(() => {
    const byEngineer = new Map<string, { inProgress: number; notStarted: number; jobs: Job[] }>();
    let unassignedJobs: Job[] = [];
    let overdueJobs: Job[] = [];
    let idleJobs: Job[] = [];
    const now = Date.now();

    engineeringJobs.forEach((job) => {
      // Get milestone status from dashboard metrics
      // Since we don't have individual job milestone data here, we'll use the dashboard counts as a fallback
      // For a proper fix, the job API should include milestone status
      const stage = job.workflowProgress?.find((p) => p.stageName === 'Engineering');
      const assignee = stage?.assignee?.trim() || '';

      // Group by engineer
      if (assignee) {
        if (!byEngineer.has(assignee)) {
          byEngineer.set(assignee, { inProgress: 0, notStarted: 0, jobs: [] });
        }
        const data = byEngineer.get(assignee)!;
        data.jobs.push(job);

        // Use workflow progress as fallback, but prioritize milestone-based logic when available
        // This is a temporary solution until we include milestone data in job API
        const isJobInProgress = dashboardMetrics && dashboardMetrics.inProgressJobs > 0 &&
                               engineeringJobs.findIndex(j => j.id === job.id) < inProgressCount;

        if (isJobInProgress || stage?.status === 'In Progress') {
          data.inProgress++;
        } else {
          data.notStarted++;
        }
      } else {
        unassignedJobs.push(job);
      }

      // Overdue: targetEndDate in the past
      if (job.targetEndDate && new Date(job.targetEndDate).getTime() < now) {
        overdueJobs.push(job);
      }

      // Idle: Not Started and > 7 days since created
      const createdDate = stage?.createdAt || job.createdAt;
      const daysSinceCreated = daysSince(createdDate);
      if (stage?.status === 'Not Started' && daysSinceCreated !== null && daysSinceCreated > 7) {
        idleJobs.push(job);
      }

    });

    // Include engineers with 0 jobs
    engineers?.forEach((eng) => {
      if (!byEngineer.has(eng.name)) {
        byEngineer.set(eng.name, { inProgress: 0, notStarted: 0, jobs: [] });
      }
    });

    return {
      byEngineer,
      unassignedJobs,
      overdueJobs,
      idleJobs,
    };
  }, [engineeringJobs, engineers]);

  const hasActiveFilters = !!(search || statusFilter || assigneeFilter);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setAssigneeFilter('');
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
      <div className="text-center text-red-500 p-8">Error loading jobs. Please try again.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Subheader ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalJobs} job{totalJobs !== 1 ? 's' : ''} in engineering
          {hasActiveFilters && (
            <span className="text-gray-600">
              {' '}
              &middot; {jobs.length} matching
            </span>
          )}
        </p>
        <button
          onClick={() => setShowManageEngineers(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-rivian-soft-black border border-gray-700/60 rounded-lg hover:border-gray-600 transition-colors"
          title="Manage Engineers"
        >
          <Settings className="w-3.5 h-3.5" />
          Engineers
        </button>
      </div>

      {/* ── Summary Panel ──────────────────────────────────── */}
      <EngineeringSummaryPanel
        summaryData={summaryData}
        totalJobs={totalJobs}
        inProgressCount={inProgressCount}
        notStartedCount={notStartedCount}
      />

      {/* ── Search & Filters ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by job number, description, or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-rivian-soft-black border border-gray-700/60 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-stage-engineering/50 focus:border-stage-engineering/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-stage-engineering/10 border-stage-engineering/30 text-stage-engineering'
                : 'bg-rivian-soft-black border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-stage-engineering" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Filter row */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 pl-1">
            <div className="w-40">
              <Select
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'Not Started', label: 'Not Started' },
                  { value: 'In Progress', label: 'In Progress' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="!py-2 text-sm"
              />
            </div>
            {uniqueAssignees.length > 0 && (
              <div className="w-44">
                <Select
                  options={[
                    { value: '', label: 'All Assignees' },
                    ...uniqueAssignees.map((a) => ({ value: a, label: a })),
                  ]}
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="!py-2 text-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Job List ───────────────────────────────────────── */}
      {jobs.length > 0 ? (
        <div className="space-y-2">
          {jobs.map((job) => (
            <EngineeringJobRow
              key={job.id}
              job={job}
              isExpanded={expandedJobId === job.id}
              onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
              onNavigate={() => navigate(`/jobs/${job.id}`)}
              onDelete={(jobId) => {
                if (confirm(`Delete job ${job.jobNumber}? This cannot be undone.`)) {
                  deleteJobMutation.mutate(jobId);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="border border-gray-800/60 border-dashed rounded-xl py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-800/60 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-400">No jobs found</p>
          <p className="text-xs text-gray-600 mt-1">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'No jobs are currently in the Engineering stage'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-xs text-stage-engineering hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Manage Engineers Modal */}
      <ManageEngineersModal
        isOpen={showManageEngineers}
        onClose={() => setShowManageEngineers(false)}
      />
    </div>
  );
}

// ─── Summary Panel ──────────────────────────────────────────────
interface SummaryData {
  byEngineer: Map<string, { inProgress: number; notStarted: number; jobs: Job[] }>;
  unassignedJobs: Job[];
  overdueJobs: Job[];
  idleJobs: Job[];
}

function EngineeringSummaryPanel({
  summaryData,
  totalJobs,
  inProgressCount,
  notStartedCount,
}: {
  summaryData: SummaryData;
  totalJobs: number;
  inProgressCount: number;
  notStartedCount: number;
}) {
  const { byEngineer, unassignedJobs, overdueJobs, idleJobs } = summaryData;

  // Sort engineers by total job count (descending), then alphabetically
  const engineerEntries = Array.from(byEngineer.entries()).sort((a, b) => {
    const aTotal = a[1].inProgress + a[1].notStarted;
    const bTotal = b[1].inProgress + b[1].notStarted;
    if (bTotal !== aTotal) return bTotal - aTotal;
    return a[0].localeCompare(b[0]);
  });

  const maxJobs = Math.max(...engineerEntries.map(([, data]) => data.inProgress + data.notStarted), 1);

  const hasAlerts = overdueJobs.length > 0 || unassignedJobs.length > 0 || idleJobs.length > 0;

  return (
    <div className="bg-rivian-soft-black rounded-xl border border-gray-800/60 p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Engineer Workload */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Engineer Workload
          </h3>
          <div className="space-y-2.5">
            {engineerEntries.map(([name, data]) => {
              const total = data.inProgress + data.notStarted;
              const widthPercent = Math.max((total / maxJobs) * 100, 2);
              const isEmpty = total === 0;

              return (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-24 flex-shrink-0">
                    <span className={`text-sm ${isEmpty ? 'text-gray-600' : 'text-gray-300'}`}>
                      {name}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-800/40 rounded-full h-1.5 overflow-hidden">
                      {!isEmpty && (
                        <div
                          className="h-full bg-stage-engineering rounded-full transition-all"
                          style={{ width: `${widthPercent}%` }}
                        />
                      )}
                    </div>
                    <span className={`text-xs w-12 text-right ${isEmpty ? 'text-gray-600' : 'text-gray-400'}`}>
                      {total} {total === 1 ? 'job' : 'jobs'}
                    </span>
                  </div>
                </div>
              );
            })}
            {unassignedJobs.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-24 flex-shrink-0">
                  <span className="text-sm text-gray-300">Unassigned</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-800/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500/60 rounded-full transition-all"
                      style={{ width: `${Math.max((unassignedJobs.length / maxJobs) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs w-12 text-right text-gray-400">
                    {unassignedJobs.length} {unassignedJobs.length === 1 ? 'job' : 'jobs'}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-800/60 text-xs text-gray-500">
            {totalJobs} total · {inProgressCount} in progress · {notStartedCount} not started
          </div>
        </div>

        {/* Right column: Attention Needed */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Attention Needed
          </h3>
          {hasAlerts ? (
            <div className="space-y-2">
              {overdueJobs.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-red-400 font-medium">{overdueJobs.length}</span>
                  <span className="text-gray-400">
                    {overdueJobs.length === 1 ? 'job' : 'jobs'} overdue
                  </span>
                </div>
              )}
              {unassignedJobs.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-blue-400 font-medium">{unassignedJobs.length}</span>
                  <span className="text-gray-400">unassigned</span>
                </div>
              )}
              {idleJobs.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  <span className="text-yellow-400 font-medium">{idleJobs.length}</span>
                  <span className="text-gray-400">
                    idle &gt; 7 days
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span>All clear</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Job Row ──────────────────────────────────────────────────
interface EngineeringJobRowProps {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  onDelete: (jobId: number) => void;
}

function EngineeringJobRow({ job, isExpanded, onToggle, onNavigate, onDelete }: EngineeringJobRowProps) {
  const stage = job.workflowProgress?.find((p) => p.stageName === 'Engineering');
  const status = STATUS_CONFIG[stage?.status || 'Not Started'] || STATUS_CONFIG['Not Started'];
  const daysInStage = daysSince(stage?.startedAt || stage?.createdAt);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isExpanded
          ? 'border-stage-engineering/30 bg-rivian-soft-black'
          : 'border-gray-800/60 bg-rivian-soft-black hover:border-gray-700'
      }`}
    >
      {/* Row header */}
      <div className="flex items-center cursor-pointer group" onClick={onToggle}>
        <div className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0">
          {/* Job info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-sm font-semibold text-white">{job.jobNumber}</span>
              <span className={`${status.badge} !text-[10px] !px-1.5 !py-0`}>
                {stage?.status || 'Not Started'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="text-gray-400">{job.clientName}</span>
              {job.description && (
                <>
                  <span className="text-gray-700">&middot;</span>
                  <span className="truncate">{job.description}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick info pills */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {stage?.assignee && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <User className="w-3 h-3" />
                <span>{stage.assignee}</span>
              </div>
            )}
            {job.targetEndDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(job.targetEndDate)}</span>
              </div>
            )}
            {daysInStage !== null && daysInStage > 0 && (
              <div
                className={`text-xs px-2 py-0.5 rounded-md ${
                  daysInStage > 14
                    ? 'bg-priority-high/10 text-priority-high'
                    : daysInStage > 7
                    ? 'bg-priority-medium/10 text-priority-medium'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {daysInStage}d
              </div>
            )}
          </div>

          {/* Navigate to job detail */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate();
            }}
            className="flex items-center justify-center w-7 h-7 rounded-md text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors flex-shrink-0"
            title="Open job detail"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Delete job */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.id);
            }}
            className="flex items-center justify-center w-7 h-7 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
            title="Delete job"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand chevron */}
          <div className="flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && <ExpandedJobContent job={job} />}
    </div>
  );
}

// ─── Expanded Job Content ─────────────────────────────────────
interface ExpandedJobContentProps {
  job: Job;
}

function ExpandedJobContent({ job }: ExpandedJobContentProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    'milestones' | 'bom' | 'pbom' | 'workorders' | 'recuts'
  >('milestones');
  const [sendToProductionWO, setSendToProductionWO] = useState<WorkOrder | null>(null);
  const [initPartsWO, setInitPartsWO] = useState<WorkOrder | null>(null);
  const [pdfMatches, setPdfMatches] = useState<
    import('../services/engineering.service').PdfPartMatch[] | undefined
  >(undefined);
  const [parsingWoId, setParsingWoId] = useState<number | null>(null);

  const { data: workOrders } = useQuery({
    queryKey: ['workOrders', job.id],
    queryFn: () => jobsService.getWorkOrders(job.id),
  });

  const { data: bomItems } = useQuery({
    queryKey: ['bomItems', job.id],
    queryFn: () => engineeringService.getBomItems(job.id),
  });

  const { data: trackedParts } = useQuery({
    queryKey: ['trackedParts', 'list', { jobId: job.id }],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/api/tracked-parts?jobId=${job.id}`);
      return response.json();
    },
  });

  const scrappedCount = Array.isArray(trackedParts)
    ? trackedParts.filter((p: any) => p.status === 'Scrapped').length
    : 0;

  const deleteWoMutation = useMutation({
    mutationFn: (woId: number) => jobsService.deleteWorkOrder(job.id, woId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders', job.id] });
      toast.success('Work order deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete work order');
    },
  });

  const updateWoStatusMutation = useMutation({
    mutationFn: ({ woId, status }: { woId: number; status: WorkOrderStatus }) =>
      jobsService.updateWorkOrder(job.id, woId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders', job.id] });
      toast.success('Work order status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const handleDeleteWo = (woId: number, woNumber: string) => {
    if (confirm(`Delete work order ${woNumber}? This will also delete associated files.`)) {
      deleteWoMutation.mutate(woId);
    }
  };

  const handleDownloadPdf = async (woId: number) => {
    try {
      const files = await engineeringService.getWorkOrderFiles(job.id, woId);
      if (files && files.length > 0) {
        const pdfFile = files[0];
        const blob = await engineeringService.downloadWorkOrderFile(job.id, woId, pdfFile.id);
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
        toast.error('No PDF file found for this work order');
      }
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleParsePdfAndInitParts = async (wo: WorkOrder) => {
    setParsingWoId(wo.id);
    try {
      const result = await engineeringService.parseWorkOrderPdf(job.id, wo.id);
      if (result.matches && result.matches.length > 0) {
        setPdfMatches(result.matches);
        setInitPartsWO(wo);
        toast.success(
          `PDF parsed: ${result.matches.filter((m) => m.matched).length} parts matched`
        );
      } else {
        toast.warning('No parts found in PDF. Opening manual selection.');
        setPdfMatches(undefined);
        setInitPartsWO(wo);
      }
    } catch {
      toast.error('Failed to parse PDF. Opening manual selection.');
      setPdfMatches(undefined);
      setInitPartsWO(wo);
    } finally {
      setParsingWoId(null);
    }
  };

  const extractMachine = (notes: string | undefined) => {
    if (!notes) return null;
    const match = notes.match(/Machine: (.+)/);
    return match ? match[1] : null;
  };

  const TABS = [
    { key: 'milestones' as const, label: 'Milestones' },
    { key: 'bom' as const, label: 'BOM', count: bomItems?.length },
    { key: 'pbom' as const, label: 'PBOM' },
    {
      key: 'workorders' as const,
      label: 'Work Orders',
      count: workOrders?.length,
    },
    {
      key: 'recuts' as const,
      label: 'Recuts',
      count: scrappedCount > 0 ? scrappedCount : undefined,
      alert: scrappedCount > 0,
    },
  ];

  return (
    <div className="border-t border-gray-800/60">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-5 pt-1 bg-rivian-black/30 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-white bg-rivian-soft-black'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1 px-1.5 py-px rounded-full text-[10px] font-semibold ${
                  tab.alert
                    ? 'bg-red-500/20 text-red-400'
                    : activeTab === tab.key
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-stage-engineering rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === 'milestones' && <DesignMilestones jobId={job.id} />}

        {activeTab === 'bom' && (
          <div className="space-y-6">
            <BomImport jobId={job.id} workOrders={workOrders || []} />
            <BomItemsTable jobId={job.id} />
          </div>
        )}

        {activeTab === 'pbom' && (
          <div className="space-y-6">
            <PbomImport jobId={job.id} />
            <PbomTableEngineering jobId={job.id} />
          </div>
        )}

        {activeTab === 'recuts' && <RecutsTab jobId={job.id} />}

        {activeTab === 'workorders' && (
          <div className="space-y-5">
            <WorkOrderFiles jobId={job.id} workOrders={workOrders || []} />

            {workOrders && workOrders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Orders
                  </h4>
                  <span className="text-xs text-gray-600">{workOrders.length} total</span>
                </div>
                <div className="space-y-2">
                  {workOrders.map((wo) => {
                    const machine = extractMachine(wo.notes);
                    const woPartsCount = Array.isArray(trackedParts)
                      ? trackedParts.filter((p: any) => p.workOrderId === wo.id).length
                      : 0;

                    return (
                      <div
                        key={wo.id}
                        className="p-4 rounded-lg bg-rivian-black/40 border border-gray-800/40 hover:border-gray-700/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-medium text-white text-sm">{wo.woNumber}</h5>
                              {wo.isRecut && (
                                <span className="text-[10px] px-1.5 py-px rounded-md font-medium bg-orange-500/15 text-orange-400 border border-orange-500/20">
                                  Recut
                                </span>
                              )}
                              {machine && (
                                <span className="text-[10px] px-1.5 py-px rounded-md font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                  {machine}
                                </span>
                              )}
                              {woPartsCount > 0 && (
                                <span className="text-[10px] px-1.5 py-px rounded-md font-medium bg-purple-500/15 text-purple-400">
                                  {woPartsCount} part{woPartsCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {wo.productionStatus !== 'Not Sent' && (
                                <span className="badge badge-completed !text-[10px] !px-1.5 !py-0">
                                  {wo.productionStatus}
                                </span>
                              )}
                            </div>

                            {wo.description && (
                              <p className="text-xs text-gray-500 mb-2">{wo.description}</p>
                            )}

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-600 uppercase">Status</span>
                              <Select
                                value={wo.status}
                                onChange={(e) =>
                                  updateWoStatusMutation.mutate({
                                    woId: wo.id,
                                    status: e.target.value as WorkOrderStatus,
                                  })
                                }
                                options={[
                                  { value: 'Draft', label: 'Draft' },
                                  { value: 'Released', label: 'Released' },
                                  { value: 'Archived', label: 'Archived' },
                                ]}
                                className="!text-xs !py-1 !px-2"
                                disabled={updateWoStatusMutation.isPending}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {wo.productionStatus === 'Not Sent' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setSendToProductionWO(wo)}
                                className="!text-xs !px-3 !py-1.5"
                              >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                Send to Production
                              </Button>
                            )}

                            <Menu as="div" className="relative">
                              <Menu.Button className="p-1.5 hover:bg-gray-700/60 rounded-lg transition-colors text-gray-500 hover:text-white">
                                <MoreVertical className="w-4 h-4" />
                              </Menu.Button>
                              <Menu.Items className="absolute right-0 mt-1 w-52 bg-rivian-soft-black border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
                                <div className="py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleParsePdfAndInitParts(wo)}
                                        disabled={parsingWoId === wo.id}
                                        className={`${
                                          active ? 'bg-gray-800' : ''
                                        } flex items-center w-full px-3 py-2 text-xs text-gray-300 disabled:opacity-50`}
                                      >
                                        <FileCheck className="w-3.5 h-3.5 mr-2.5" />
                                        {parsingWoId === wo.id
                                          ? 'Parsing PDF...'
                                          : 'Parse PDF & Init Parts'}
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => {
                                          setPdfMatches(undefined);
                                          setInitPartsWO(wo);
                                        }}
                                        className={`${
                                          active ? 'bg-gray-800' : ''
                                        } flex items-center w-full px-3 py-2 text-xs text-gray-300`}
                                      >
                                        <Layers className="w-3.5 h-3.5 mr-2.5" />
                                        Manual Init Parts
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleDownloadPdf(wo.id)}
                                        className={`${
                                          active ? 'bg-gray-800' : ''
                                        } flex items-center w-full px-3 py-2 text-xs text-gray-300`}
                                      >
                                        <Download className="w-3.5 h-3.5 mr-2.5" />
                                        Download PDF
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <div className="border-t border-gray-800 my-1" />
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleDeleteWo(wo.id, wo.woNumber)}
                                        disabled={deleteWoMutation.isPending}
                                        className={`${
                                          active ? 'bg-red-500/10' : ''
                                        } flex items-center w-full px-3 py-2 text-xs text-red-400 disabled:opacity-50`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-2.5" />
                                        Delete Work Order
                                      </button>
                                    )}
                                  </Menu.Item>
                                </div>
                              </Menu.Items>
                            </Menu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {sendToProductionWO && (
        <SendToProductionModal
          isOpen={!!sendToProductionWO}
          onClose={() => setSendToProductionWO(null)}
          workOrder={sendToProductionWO}
        />
      )}
      {initPartsWO && (
        <InitializePartsModal
          isOpen={!!initPartsWO}
          onClose={() => {
            setInitPartsWO(null);
            setPdfMatches(undefined);
          }}
          jobId={job.id}
          workOrderId={initPartsWO.id}
          woNumber={initPartsWO.woNumber}
          bomItems={bomItems || []}
          pdfMatches={pdfMatches}
          isRecut={initPartsWO.isRecut}
        />
      )}
    </div>
  );
}
