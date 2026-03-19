import { Link } from 'react-router-dom';
import { useJobs } from '../hooks/useJobs';
import { useTrackedParts } from '../hooks/usePartsTracking';
import { useSchedule, useBlockedCount } from '../hooks/useScheduling';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { ArrowSquareOut, CalendarBlank, ChartBar, Scan, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import type { Job } from '../types';

export default function Production() {
  const [search, setSearch] = useState('');
  const { data: allJobs, isLoading } = useJobs();
  const { data: allParts } = useTrackedParts({});
  const { data: scheduleQueues } = useSchedule(30000);
  const { data: blockedCount } = useBlockedCount();

  // Jobs in Production stage
  const productionJobs = allJobs?.filter((job) => {
    const stage = job.workflowProgress?.find((p) => p.stageName === 'Production');
    return stage && (stage.status === 'In Progress' || stage.status === 'Not Started');
  }) || [];

  // Apply search
  const filteredJobs = productionJobs.filter((job) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      job.jobNumber.toLowerCase().includes(s) ||
      job.description?.toLowerCase().includes(s) ||
      job.clientName?.toLowerCase().includes(s)
    );
  });

  // Metrics
  const activeParts = allParts?.filter(p => p.status === 'In Progress').length || 0;
  const completedParts = allParts?.filter(p => p.status === 'Completed').length || 0;
  const totalScheduled = scheduleQueues?.reduce((sum, q) => sum + q.entries.length, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link
          to="/scheduling"
          className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-2">
            <CalendarBlank size={20} weight="light" className="text-gray-400" />
            <ArrowSquareOut size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{totalScheduled}</p>
          <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mt-1">Scheduled Steps</p>
          {(blockedCount || 0) > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Warning size={12} className="text-red-500" />
              <span className="text-xs text-red-600 font-medium">{blockedCount} blocked</span>
            </div>
          )}
        </Link>

        <Link
          to="/dashboard/production"
          className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-2">
            <ChartBar size={20} weight="light" className="text-gray-400" />
            <ArrowSquareOut size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{activeParts}</p>
          <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mt-1">Active Parts</p>
          <p className="text-xs text-gray-400 mt-1">{completedParts} completed</p>
        </Link>

        <Link
          to="/parts"
          className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-2">
            <Scan size={20} weight="light" className="text-gray-400" />
            <ArrowSquareOut size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>
          <p className="text-2xl font-semibold text-gray-900">{productionJobs.length}</p>
          <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mt-1">Jobs in Production</p>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search jobs by number, description, or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Job List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No jobs in production</p>
          <p className="text-sm mt-1">Jobs appear here when their Production stage is active</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <ProductionJobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductionJobRow({ job }: { job: Job }) {
  const productionStage = job.workflowProgress?.find(p => p.stageName === 'Production');

  const daysLeft = job.targetEndDate
    ? Math.ceil((new Date(job.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">{job.jobNumber}</span>
          <Badge variant="priority" priority={job.priority || undefined}>{job.priority}</Badge>
          {productionStage && (
            <Badge variant="status" status={productionStage.status}>{productionStage.status}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {daysLeft !== null && (
            <span className={`text-xs ${daysLeft <= 2 ? 'text-red-600 font-medium' : daysLeft <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>
              {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
            </span>
          )}
          <ArrowSquareOut size={14} className="text-gray-300" />
        </div>
      </div>

      <p className="text-sm text-gray-600">{job.description}</p>
      <p className="text-xs text-gray-400 mt-1">{job.clientName}</p>

      {/* Workflow progress bar */}
      {job.workflowProgress && job.workflowProgress.length > 0 && (
        <div className="flex gap-1 mt-3">
          {job.workflowProgress
            .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
            .map((stage) => {
              const color = stage.status === 'Completed' ? 'bg-emerald-500'
                : stage.status === 'In Progress' ? 'bg-amber-500'
                : stage.status === 'Blocked' ? 'bg-red-500'
                : 'bg-gray-200';
              return (
                <div key={stage.stageId} className="flex-1" title={`${stage.stageName}: ${stage.status}`}>
                  <div className={`h-1.5 rounded-full ${color}`} />
                  <p className="text-[9px] text-gray-400 mt-0.5 truncate">{stage.stageName}</p>
                </div>
              );
            })}
        </div>
      )}
    </Link>
  );
}
