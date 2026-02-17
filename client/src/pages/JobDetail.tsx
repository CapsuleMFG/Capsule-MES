import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJob, useDeleteJob, useUpdateWorkflowStage } from '../hooks/useJobs';
import { useToast } from '../contexts/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { getBomItems } from '../services/engineering.service';
import { getJobMaterials, getJobLabor } from '../services/jobs.service';
import { useTrackedPartsSummary } from '../hooks/usePartsTracking';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EditJobModal from '../components/jobs/EditJobModal';
import {
  ArrowLeft, Trash2, Edit2, CheckCircle2, Clock, Circle,
  FileText, DollarSign, Timer, Cpu, Package, AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { WorkflowStageStatus } from '../types';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = parseInt(id || '0');

  const { data: job, isLoading, error } = useJob(jobId);
  const { data: bomItems = [] } = useQuery({
    queryKey: ['bomItems', jobId],
    queryFn: () => getBomItems(jobId),
    enabled: !!jobId,
  });
  const { data: materials = [] } = useQuery({
    queryKey: ['materials', jobId],
    queryFn: () => getJobMaterials(jobId),
    enabled: !!jobId,
  });
  const { data: labor = [] } = useQuery({
    queryKey: ['labor', jobId],
    queryFn: () => getJobLabor(jobId),
    enabled: !!jobId,
  });
  const { data: partsSummary } = useTrackedPartsSummary(jobId);
  const deleteJobMutation = useDeleteJob();
  const updateStageMutation = useUpdateWorkflowStage(jobId);
  const toast = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openDropdownStageId, setOpenDropdownStageId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownStageId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStageStatusChange = async (stageId: number, newStatus: WorkflowStageStatus) => {
    setOpenDropdownStageId(null);
    try {
      await updateStageMutation.mutateAsync({ stageId, data: { status: newStatus } });
      toast.success(`Stage updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update stage status');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        await deleteJobMutation.mutateAsync(jobId);
        toast.success(`Job ${job?.jobNumber} deleted successfully!`);
        navigate('/jobs');
      } catch {
        toast.error('Failed to delete job. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center text-red-500 p-8">
        <p>Error loading job details. Please try again.</p>
        <Link to="/jobs" className="text-rivian-accent hover:underline mt-4 inline-block">
          Back to Jobs
        </Link>
      </div>
    );
  }

  // Computed metrics
  const totalMaterialCost = materials.reduce((sum: number, m: any) => {
    const cost = m.cost ?? m.unit_cost ?? 0;
    const qty = m.quantity ?? 0;
    return sum + cost * qty;
  }, 0);

  const totalLaborHours = labor.reduce((sum: number, l: any) => sum + (l.hours ?? 0), 0);
  const uniqueEmployees = new Set(labor.map((l: any) => l.employee_name || l.employeeName)).size;
  const totalParts = partsSummary?.total || 0;
  const completedParts = partsSummary?.completed || 0;

  const formatCurrency = (val: number) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'In Progress': return <Clock className="w-5 h-5 text-blue-400" />;
      case 'Blocked': return <AlertCircle className="w-5 h-5 text-red-400" />;
      default: return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStageBarColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500';
      case 'In Progress': return 'bg-blue-500';
      case 'Blocked': return 'bg-red-500';
      default: return 'bg-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-400';
      case 'On Hold': return 'text-yellow-400';
      case 'Completed': return 'text-blue-400';
      case 'Cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const sortedStages = [...(job.workflowProgress || [])].sort(
    (a, b) => (a.stageOrder || 0) - (b.stageOrder || 0)
  );

  return (
    <div>
      {/* Back Button */}
      <Link
        to="/jobs"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="bg-rivian-soft-black rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{job.jobNumber}</h1>
              <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>{job.status}</span>
            </div>
            <p className="text-gray-300">{job.clientName}</p>
            <p className="text-gray-400 text-sm mt-1">{job.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteJobMutation.isPending} className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <Card className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Workflow Progress</h3>
        <div className="flex items-center gap-2" ref={dropdownRef}>
          {sortedStages.map((stage, i) => {
            const isOpen = openDropdownStageId === stage.stageId;
            const isMutating = updateStageMutation.isPending;
            const statusOptions: WorkflowStageStatus[] = ['Not Started', 'In Progress', 'Completed', 'Blocked'];
            return (
              <div key={stage.id} className="flex items-center flex-1">
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdownStageId(isOpen ? null : stage.stageId)}
                    className="flex items-center gap-2 mb-2 w-full text-left hover:bg-white/5 rounded px-1 py-0.5 transition-colors cursor-pointer"
                    disabled={isMutating}
                  >
                    {getStageIcon(stage.status)}
                    <span className="text-sm font-medium text-white">{stage.stageName}</span>
                    <span className="text-xs text-gray-500">{stage.status}</span>
                    <ChevronDown className={`w-3 h-3 text-gray-500 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="absolute z-50 top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                      {statusOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleStageStatusChange(stage.stageId, opt)}
                          className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-700 transition-colors ${
                            stage.status === opt ? 'text-white font-medium' : 'text-gray-300'
                          }`}
                        >
                          {getStageIcon(opt)}
                          {opt}
                          {stage.status === opt && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={`h-2 rounded-full ${getStageBarColor(stage.status)}`} />
                  {stage.assignee && (
                    <p className="text-xs text-gray-500 mt-1">{stage.assignee}</p>
                  )}
                </div>
                {i < sortedStages.length - 1 && (
                  <div className="w-4 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">BOM Items</p>
              <p className="text-xl font-bold text-white">{bomItems.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Materials</p>
              <p className="text-xl font-bold text-white">{materials.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Material Cost</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(totalMaterialCost)}</p>
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
              <p className="text-xl font-bold text-purple-400">{totalLaborHours.toFixed(1)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Parts</p>
              <p className="text-xl font-bold text-white">{completedParts}/{totalParts}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Employees</p>
              <p className="text-xl font-bold text-white">{uniqueEmployees}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dates */}
        <Card>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Target Start</p>
              <p className="text-sm text-white font-medium">
                {job.targetStartDate ? new Date(job.targetStartDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Target End</p>
              <p className="text-sm text-white font-medium">
                {job.targetEndDate ? new Date(job.targetEndDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Actual Start</p>
              <p className="text-sm text-white font-medium">
                {job.startDate ? new Date(job.startDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-sm text-white font-medium">
                {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Labor */}
        <Card>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Recent Labor</h3>
          {labor.length > 0 ? (
            <div className="space-y-2">
              {labor.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{entry.employee_name || entry.employeeName}</span>
                    <span className="text-gray-500">{entry.stage_name || entry.stageName || ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                    <span className="text-purple-400 font-medium">{entry.hours}h</span>
                  </div>
                </div>
              ))}
              {labor.length > 5 && (
                <p className="text-xs text-gray-500 pt-1">+{labor.length - 5} more entries</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No labor recorded yet</p>
          )}
        </Card>

        {/* Materials Summary */}
        <Card>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Materials</h3>
          {materials.length > 0 ? (
            <div className="space-y-2">
              {materials.slice(0, 5).map((m: any) => {
                const statusColor =
                  (m.status === 'Received' || m.status === 'Issued') ? 'text-emerald-400' :
                  m.status === 'Ordered' ? 'text-blue-400' :
                  'text-yellow-400';
                return (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-white truncate max-w-[200px]">{m.material_name || m.materialName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{m.quantity} {m.unit}</span>
                      <span className={`text-xs font-medium ${statusColor}`}>{m.status}</span>
                    </div>
                  </div>
                );
              })}
              {materials.length > 5 && (
                <p className="text-xs text-gray-500 pt-1">+{materials.length - 5} more items</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No materials added yet</p>
          )}
        </Card>

        {/* Notes */}
        <Card>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Notes</h3>
          {job.notes ? (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{job.notes}</p>
          ) : (
            <p className="text-sm text-gray-500">No notes</p>
          )}
        </Card>
      </div>

      {/* Edit Job Modal */}
      <EditJobModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        job={job}
      />
    </div>
  );
}
