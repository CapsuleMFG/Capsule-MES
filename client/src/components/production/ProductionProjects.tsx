import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobs } from '../../hooks/useJobs';
import { useTrackedParts } from '../../hooks/usePartsTracking';
import { useQuery } from '@tanstack/react-query';
import * as productionService from '../../services/production.service';
import LoadingSpinner from '../ui/LoadingSpinner';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Card from '../ui/Card';
import { CaretDown, CaretUp, Briefcase, Package, Scan } from '@phosphor-icons/react';
import type { Job, JobPriority } from '../../../../shared/types';

export default function ProductionProjects() {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | ''>('');
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  const { data: allJobs, isLoading: jobsLoading } = useJobs();

  // Filter jobs to only those in Production stage
  const productionJobs = allJobs?.filter((job) => {
    const productionStage = job.workflowProgress?.find(
      (p) => p.stageName === 'Production'
    );
    return (
      productionStage &&
      (productionStage.status === 'In Progress' || productionStage.status === 'Not Started')
    );
  });

  // Apply search/priority filters
  const filteredJobs = productionJobs?.filter((job) => {
    if (search) {
      const s = search.toLowerCase();
      const matches =
        job.jobNumber.toLowerCase().includes(s) ||
        job.description?.toLowerCase().includes(s) ||
        job.clientName?.toLowerCase().includes(s);
      if (!matches) return false;
    }
    if (priorityFilter && job.priority !== priorityFilter) return false;
    return true;
  });

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search by job number, description, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as JobPriority | '')}
          options={[
            { value: '', label: 'All Priorities' },
            { value: 'Critical', label: 'Critical' },
            { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low', label: 'Low' },
          ]}
          className="min-w-[160px]"
        />
      </div>

      {/* Job Cards */}
      {!filteredJobs || filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase size={48} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No jobs in Production stage</p>
          <p className="text-gray-400 text-sm mt-2">
            Jobs will appear here when they reach the Production workflow stage
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <ProductionJobCard
              key={job.id}
              job={job}
              isExpanded={expandedJobId === job.id}
              onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductionJobCard({
  job,
  isExpanded,
  onToggle,
}: {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Fetch WOs for this job from the production pool
  const { data: allPoolWOs } = useQuery({
    queryKey: ['productionPool'],
    queryFn: productionService.getProductionPool,
  });

  // Fetch parts for this job
  const { data: jobParts } = useTrackedParts({ jobId: job.id });

  const jobWOs = allPoolWOs?.filter((wo: any) => wo.jobId === job.id) || [];
  const inProgressWOs = jobWOs.filter((wo: any) => wo.productionStatus === 'In Progress').length;
  const completedWOs = jobWOs.filter((wo: any) => wo.productionStatus === 'Completed').length;
  const queuedWOs = jobWOs.filter((wo: any) =>
    wo.productionStatus === 'In Pool' || wo.productionStatus === 'Assigned'
  ).length;

  const totalParts = jobParts?.length || 0;
  const completedParts = jobParts?.filter((p) => p.status === 'Completed').length || 0;
  const inProgressParts = jobParts?.filter((p) => p.status === 'In Progress').length || 0;
  const pendingParts = jobParts?.filter((p) => p.status === 'Pending').length || 0;
  const scrappedParts = jobParts?.filter((p) => p.status === 'Scrapped').length || 0;

  const productionStage = job.workflowProgress?.find((p) => p.stageName === 'Production');

  const priorityColors: Record<string, string> = {
    Critical: 'text-red-500',
    High: 'text-orange-500',
    Medium: 'text-blue-500',
    Low: 'text-gray-400',
  };

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header - Clickable */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <Link
                  to={`/jobs/${job.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-blue-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {job.jobNumber}
                </Link>
                <span className={`text-xs font-medium ${priorityColors[job.priority as keyof typeof priorityColors] || 'text-gray-400'}`}>
                  {job.priority}
                </span>
                {productionStage?.status && (
                  <span className="text-xs font-medium text-emerald-600">
                    {productionStage.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {job.clientName}
                {job.description && ` — ${job.description}`}
              </p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-6 mr-4">
            <div className="text-center">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Package size={14} />
                <span className="font-semibold">{jobWOs.length}</span>
              </div>
              <div className="text-xs text-gray-400">WOs</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Scan size={14} />
                <span className="font-semibold">{totalParts}</span>
              </div>
              <div className="text-xs text-gray-400">Parts</div>
            </div>
            {totalParts > 0 && (
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-400">Complete</div>
              </div>
            )}
          </div>

          {/* Expand icon */}
          {isExpanded ? (
            <CaretUp size={20} className="text-gray-400" />
          ) : (
            <CaretDown size={20} className="text-gray-400" />
          )}
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mt-2 flex-wrap">
          {jobWOs.length > 0 && (
            <span className="text-xs text-gray-400">
              WOs: {inProgressWOs > 0 && <span className="text-blue-500">{inProgressWOs} active</span>}
              {inProgressWOs > 0 && queuedWOs > 0 && ', '}
              {queuedWOs > 0 && <span className="text-amber-500">{queuedWOs} queued</span>}
              {(inProgressWOs > 0 || queuedWOs > 0) && completedWOs > 0 && ', '}
              {completedWOs > 0 && <span className="text-emerald-500">{completedWOs} done</span>}
            </span>
          )}
          {totalParts > 0 && (
            <span className="text-xs text-gray-400">
              Parts: {inProgressParts > 0 && <span className="text-blue-500">{inProgressParts} in progress</span>}
              {inProgressParts > 0 && pendingParts > 0 && ', '}
              {pendingParts > 0 && <span className="text-amber-500">{pendingParts} pending</span>}
              {(inProgressParts > 0 || pendingParts > 0) && completedParts > 0 && ', '}
              {completedParts > 0 && <span className="text-emerald-500">{completedParts} done</span>}
              {(inProgressParts > 0 || pendingParts > 0 || completedParts > 0) && scrappedParts > 0 && ', '}
              {scrappedParts > 0 && <span className="text-red-500">{scrappedParts} scrapped</span>}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-5">
          {/* Work Orders Table */}
          {jobWOs.length > 0 ? (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-600 mb-3">Work Orders</h4>
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-3 text-xs font-medium text-gray-400">WO Number</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Description</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Machine</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Status</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobWOs.map((wo: any) => (
                      <tr key={wo.id} className="border-b border-gray-100">
                        <td className="p-3 text-gray-900 font-medium text-sm">{wo.woNumber}</td>
                        <td className="p-3 text-gray-600 text-sm">{wo.description || '-'}</td>
                        <td className="p-3 text-gray-600 text-sm">{wo.machineName || 'Unassigned'}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium ${
                            wo.productionStatus === 'Completed'
                              ? 'text-emerald-600'
                              : wo.productionStatus === 'In Progress'
                              ? 'text-blue-500'
                              : wo.productionStatus === 'In Pool'
                              ? 'text-amber-500'
                              : 'text-gray-400'
                          }`}>
                            {wo.productionStatus === 'Assigned' ? 'Queued' : wo.productionStatus}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 text-sm">
                          {wo.productionPriority || wo.priority || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm mb-4">No work orders in production pool for this job.</p>
          )}

          {/* Parts Summary */}
          {totalParts > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">
                Parts ({totalParts} total)
              </h4>
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Tracking ID</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Part Number</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Route</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Current Station</th>
                      <th className="text-left p-3 text-xs font-medium text-gray-400">Status</th>
                      {scrappedParts > 0 && (
                        <th className="text-left p-3 text-xs font-medium text-gray-400">Scrap Reason</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {jobParts?.slice(0, 20).map((part) => (
                      <tr key={part.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <Link
                            to={`/parts/${part.id}`}
                            className="text-blue-500 hover:underline font-mono text-sm"
                          >
                            {part.trackingId || `#${part.id}`}
                          </Link>
                        </td>
                        <td className="p-3 text-gray-900 text-sm">{part.partNumber || '-'}</td>
                        <td className="p-3 text-gray-600 text-sm">{part.routeTemplateName || '-'}</td>
                        <td className="p-3 text-gray-600 text-sm">{part.currentStationName || '-'}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium ${
                            part.status === 'Completed'
                              ? 'text-emerald-600'
                              : part.status === 'In Progress'
                              ? 'text-blue-500'
                              : part.status === 'Scrapped'
                              ? 'text-red-500'
                              : part.status === 'On Hold'
                              ? 'text-amber-500'
                              : 'text-gray-400'
                          }`}>
                            {part.status}
                          </span>
                        </td>
                        {scrappedParts > 0 && (
                          <td className="p-3 text-sm text-red-500">
                            {part.status === 'Scrapped' ? (part.scrapReason || '-') : ''}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {jobParts && jobParts.length > 20 && (
                  <div className="p-3 text-center text-sm text-gray-400 border-t border-gray-100">
                    Showing 20 of {jobParts.length} parts.{' '}
                    <Link to={`/jobs/${job.id}`} className="text-blue-500 hover:underline">
                      View all on job detail page
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {totalParts === 0 && jobWOs.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              No work orders or parts tracked yet for this job.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
