import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs, useDeleteJob, useJobAnalytics } from '../hooks/useJobs';
import { useToast } from '../contexts/ToastContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EditJobModal from '../components/jobs/EditJobModal';
import {
  Edit2, Trash2, ExternalLink, CheckCircle2, Clock, Circle,
  TrendingUp, AlertTriangle, AlertOctagon, DollarSign, Timer, BarChart3,
} from 'lucide-react';
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
      case 'Engineering': return 'text-blue-400';
      case 'WO Release': return 'text-purple-400';
      case 'Materials': return 'text-yellow-400';
      case 'Production': return 'text-green-400';
      case 'Completed': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-400';
      case 'On Hold': return 'bg-yellow-500/20 text-yellow-400';
      case 'Completed': return 'bg-blue-500/20 text-blue-400';
      case 'Cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getWorkflowStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'In Progress':
        return <Clock className="w-3.5 h-3.5 text-blue-400" />;
      case 'Blocked':
        return <Circle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-gray-600" />;
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
        <h1 className="text-3xl font-bold">Jobs</h1>
        <p className="text-gray-400 text-sm mt-1">{jobs?.length || 0} total jobs</p>
      </div>

      {/* Analytics Section */}
      {analytics && (
        <div className="space-y-4 mb-8">
          {/* Row 1: Pipeline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.pipeline.map((stage) => (
              <Card key={stage.stageName}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{stage.stageName}</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: stage.color }}>{stage.count}</p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${stage.color}20` }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Row 2: Schedule + Financial */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Schedule Health */}
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">On Track</p>
                  <p className="text-xl font-bold text-green-400">{analytics.schedule.onTrack}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">At Risk</p>
                  <p className="text-xl font-bold text-yellow-400">{analytics.schedule.atRisk}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Overdue</p>
                  <p className="text-xl font-bold text-red-400">{analytics.schedule.overdue}</p>
                </div>
              </div>
            </Card>

            {/* Financial */}
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Material Cost</p>
                  <p className="text-lg font-bold text-blue-400">{formatCurrency(analytics.financial.totalMaterialCost)}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Timer className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Labor Hours</p>
                  <p className="text-xl font-bold text-purple-400">{analytics.financial.totalLaborHours.toFixed(1)}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Avg Cost/Job</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(analytics.financial.avgCostPerJob)}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

      {/* Jobs Table */}
      <Card>
        {jobs && jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Job #</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Client</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Stage</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Progress</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Target End</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-800 hover:bg-rivian-hover transition-colors cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <td className="py-3 px-4">
                      <span className="text-rivian-accent font-semibold text-sm">{job.jobNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">{job.clientName || '-'}</td>
                    <td className="py-3 px-4 text-gray-300 text-sm max-w-[200px] truncate">{job.description}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium text-sm ${getStageColor(getCurrentStage(job))}`}>
                        {getCurrentStage(job)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {job.workflowProgress
                          ?.sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
                          .map((stage) => (
                            <span key={stage.id} title={`${stage.stageName}: ${stage.status}`}>
                              {getWorkflowStatusIcon(stage.status)}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {job.targetEndDate ? new Date(job.targetEndDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingJob(job)}
                          className="text-rivian-accent hover:text-blue-400 transition-colors"
                          title="Edit job"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(job)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                          title="Delete job"
                          disabled={deleteJobMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
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
            <p className="text-lg">No jobs found</p>
            <p className="text-sm mt-2">
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
