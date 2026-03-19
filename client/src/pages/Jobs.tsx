import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs, useDeleteJob, useJobAnalytics } from '../hooks/useJobs';
import { useToast } from '../contexts/ToastContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EditJobModal from '../components/jobs/EditJobModal';
import { PencilSimple, Trash, ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react';
import { exportToCsv } from '../utils/exportCsv';
import type { Job, JobStatus } from '../types';

export default function Jobs() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useJobs({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { data: analytics } = useJobAnalytics();
  const deleteJobMutation = useDeleteJob();

  const handleDelete = async (job: Job) => {
    if (window.confirm(`Are you sure you want to delete "${job.jobNumber}"? This action cannot be undone.`)) {
      try {
        await deleteJobMutation.mutateAsync(job.id);
        toast.success(`Job ${job.jobNumber} deleted successfully!`);
      } catch {
        toast.error('Failed to delete job. Please try again.');
      }
    }
  };

  const getCurrentStage = (job: Job): string => {
    if (!job.workflowProgress || job.workflowProgress.length === 0) return '-';
    const inProgress = job.workflowProgress
      .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
      .find(s => s.status === 'In Progress');
    if (inProgress) return inProgress.stageName || '-';
    const allCompleted = job.workflowProgress.every(s => s.status === 'Completed');
    if (allCompleted) return 'Completed';
    return '-';
  };

  const getStageColor = (stage: string): string => {
    switch (stage) {
      case 'Completed': return 'text-emerald-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Active': return 'text-emerald-600';
      case 'On Hold': return 'text-amber-600';
      case 'Completed': return 'text-blue-600';
      case 'Cancelled': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getWorkflowDotColor = (status: string): string => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500';
      case 'In Progress': return 'bg-amber-500';
      case 'Blocked': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const formatCurrency = (val: number) =>
    val > 0 ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (jobsError) {
    return (
      <div className="text-center text-red-500 p-8">
        Error loading jobs. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
        <p className="text-gray-400 text-sm mt-1">{jobs?.length || 0} total jobs</p>
      </div>

      {/* Analytics Section */}
      {analytics && (
        <div className="space-y-4 mb-8">
          {/* Row 1: Pipeline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.pipeline.map((stage) => (
              <Card key={stage.stageName}>
                <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">{stage.stageName}</p>
                <p className="text-3xl font-bold tracking-tighter text-gray-900 mt-1">{stage.count}</p>
              </Card>
            ))}
          </div>

          {/* Row 2: Schedule + Financial */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">On Track</p>
              </div>
              <p className="text-3xl font-bold tracking-tighter text-gray-900">{analytics.schedule.onTrack}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">At Risk</p>
              </div>
              <p className="text-3xl font-bold tracking-tighter text-gray-900">{analytics.schedule.atRisk}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Overdue</p>
              </div>
              <p className="text-3xl font-bold tracking-tighter text-gray-900">{analytics.schedule.overdue}</p>
            </Card>

            <Card>
              <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Material Cost</p>
              <p className="text-3xl font-bold tracking-tighter text-gray-900 mt-1">{formatCurrency(analytics.financial.totalMaterialCost)}</p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Labor Hours</p>
              <p className="text-3xl font-bold tracking-tighter text-gray-900 mt-1">{analytics.financial.totalLaborHours.toFixed(1)}</p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Avg Cost/Job</p>
              <p className="text-3xl font-bold tracking-tighter text-gray-900 mt-1">{formatCurrency(analytics.financial.avgCostPerJob)}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <Input
          placeholder="Search by job number, description, or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'On Hold', label: 'On Hold' },
            { value: 'Completed', label: 'Completed' },
            { value: 'Cancelled', label: 'Cancelled' },
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | '')}
        />
        </div>
        <button
          onClick={() => exportToCsv('jobs', ['Job Number', 'Client', 'Description', 'Priority', 'Status', 'Target Start', 'Target End'], (jobs || []).map(j => [j.jobNumber, j.clientName || '', j.description, j.priority || '', j.status, j.targetStartDate || '', j.targetEndDate || '']))}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white ring-1 ring-gray-200 rounded-[10px] hover:bg-gray-50"
        >
          <DownloadSimple size={16} weight="regular" />
          Export
        </button>
      </div>

      {/* Jobs Table */}
      <Card>
        {jobs && jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Job #</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Client</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Status</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Stage</th>
                  <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Progress</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Target End</th>
                  <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <td className="py-2.5 px-3">
                      <span className="text-blue-600 font-medium text-sm">{job.jobNumber}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 text-sm">{job.clientName || '-'}</td>
                    <td className="py-2.5 px-3 text-gray-600 text-sm max-w-[200px] truncate">{job.description}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-sm font-medium ${getStatusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-sm ${getStageColor(getCurrentStage(job))}`}>
                        {getCurrentStage(job)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {job.workflowProgress
                          ?.sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
                          .map((stage) => (
                            <div
                              key={stage.id}
                              title={`${stage.stageName}: ${stage.status}`}
                              className={`w-2 h-2 rounded-full ${getWorkflowDotColor(stage.status)}`}
                            />
                          ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-400 text-sm">
                      {job.targetEndDate ? new Date(job.targetEndDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="View details"
                        >
                          <ArrowSquareOut size={16} />
                        </button>
                        <button
                          onClick={() => setEditingJob(job)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit job"
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(job)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete job"
                          disabled={deleteJobMutation.isPending}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No jobs found</p>
            <p className="text-sm text-gray-400 mt-2">
              {search || statusFilter
                ? 'Try adjusting your filters'
                : 'Click "New Job" in the header to get started'}
            </p>
          </div>
        )}
      </Card>

      {/* Edit Job Modal */}
      {editingJob && (
        <EditJobModal
          isOpen={!!editingJob}
          onClose={() => setEditingJob(null)}
          job={editingJob}
        />
      )}
    </div>
  );
}
