import { useParams, Link, useNavigate } from 'react-router-dom';
import { useJob, useDeleteJob, useUpdateWorkflowStage } from '../hooks/useJobs';
import { useToast } from '../contexts/ToastContext';
import { useQuery } from '@tanstack/react-query';
import { getBomItems } from '../services/engineering.service';
import { getJobMaterials, getJobLabor } from '../services/jobs.service';
import { useTrackedPartsSummary } from '../hooks/usePartsTracking';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EditJobModal from '../components/jobs/EditJobModal';
import {
  ArrowLeft, Trash, PencilSimple, CheckCircle,
  FileText, CurrencyDollar, Timer, Cpu, Package, Users,
  CaretDown,
} from '@phosphor-icons/react';
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
        <Link to="/jobs" className="text-blue-600 hover:underline mt-4 inline-block">
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
  const completedParts = (partsSummary as any)?.byStatus?.Completed || 0;

  const formatCurrency = (val: number) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStageDotColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500';
      case 'In Progress': return 'bg-amber-500';
      case 'Blocked': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-emerald-600';
      case 'On Hold': return 'text-amber-600';
      case 'Completed': return 'text-emerald-600';
      case 'Cancelled': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getMaterialDotColor = (status: string) => {
    if (status === 'Received' || status === 'Issued') return 'bg-emerald-500';
    if (status === 'Ordered') return 'bg-amber-500';
    return 'bg-gray-300';
  };

  const sortedStages = [...(job.workflowProgress || [])].sort(
    (a, b) => (a.stageOrder || 0) - (b.stageOrder || 0)
  );

  return (
    <div>
      {/* Back Button */}
      <Link
        to="/jobs"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{job.jobNumber}</h1>
              <span className={`text-xs font-medium ${getStatusColor(job.status)}`}>{job.status}</span>
            </div>
            <p className="text-sm text-gray-400">{job.clientName}</p>
            {job.description && (
              <p className="text-sm text-gray-400 mt-1">{job.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 text-sm font-medium px-3 py-1.5 rounded-[10px] flex items-center gap-2 transition-colors"
            >
              <PencilSimple size={14} /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteJobMutation.isPending}
              className="bg-red-50 text-red-500 hover:bg-red-100 text-sm font-medium px-3 py-1.5 rounded-[10px] flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Progress Bar */}
      <Card className="mb-6">
        <h3 className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mb-4">Workflow Progress</h3>
        <div className="flex items-start" ref={dropdownRef}>
          {sortedStages.map((stage, i) => {
            const isOpen = openDropdownStageId === stage.stageId;
            const isMutating = updateStageMutation.isPending;
            const statusOptions: WorkflowStageStatus[] = ['Not Started', 'In Progress', 'Completed', 'Blocked'];
            return (
              <div key={stage.id} className="flex items-start flex-1">
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdownStageId(isOpen ? null : stage.stageId)}
                    className="flex items-center gap-2 w-full text-left hover:bg-gray-50 rounded px-1.5 py-1 transition-colors cursor-pointer"
                    disabled={isMutating}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStageDotColor(stage.status)}`} />
                    <span className={`text-sm ${stage.status === 'Completed' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{stage.stageName}</span>
                    <CaretDown size={12} className={`text-gray-400 ml-auto flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5 pl-1.5">{stage.status}</p>
                  {isOpen && (
                    <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[160px]">
                      {statusOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleStageStatusChange(stage.stageId, opt)}
                          className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                            stage.status === opt ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStageDotColor(opt)}`} />
                          {opt}
                          {stage.status === opt && <CheckCircle size={12} className="text-emerald-500 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                    {stage.status === 'Completed' && <div className="h-full w-full bg-emerald-500" />}
                    {stage.status === 'In Progress' && <div className="h-full w-1/2 bg-amber-500" />}
                    {stage.status === 'Blocked' && <div className="h-full w-full bg-red-500" />}
                  </div>
                  {stage.assignee && (
                    <p className="text-xs text-gray-400 mt-1">{stage.assignee}</p>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <FileText size={14} className="text-gray-400" />
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">BOM Items</p>
          </div>
          <p className="text-3xl font-bold tracking-tighter text-gray-900">{bomItems.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <Package size={14} className="text-gray-400" />
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Materials</p>
          </div>
          <p className="text-3xl font-bold tracking-tighter text-gray-900">{materials.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <CurrencyDollar size={14} className="text-gray-400" />
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Material Cost</p>
          </div>
          <p className="text-3xl font-bold tracking-tighter text-gray-900">{formatCurrency(totalMaterialCost)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <Timer size={14} className="text-gray-400" />
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Labor Hours</p>
          </div>
          <p className="text-3xl font-bold tracking-tighter text-gray-900">{totalLaborHours.toFixed(1)}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <Cpu size={14} className="text-gray-400" />
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Parts</p>
          </div>
          <p className="text-3xl font-bold tracking-tighter text-gray-900">{completedParts}/{totalParts}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={14} className="text-gray-400" />
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Employees</p>
          </div>
          <p className="text-3xl font-bold tracking-tighter text-gray-900">{uniqueEmployees}</p>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dates */}
        <Card>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mb-4">Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">Target Start</p>
              <p className="text-sm text-gray-900 font-medium">
                {job.targetStartDate ? new Date(job.targetStartDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Target End</p>
              <p className="text-sm text-gray-900 font-medium">
                {job.targetEndDate ? new Date(job.targetEndDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Actual Start</p>
              <p className="text-sm text-gray-900 font-medium">
                {job.startDate ? new Date(job.startDate).toLocaleDateString() : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Completed</p>
              <p className="text-sm text-gray-900 font-medium">
                {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Labor */}
        <Card>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mb-4">Recent Labor</h3>
          {labor.length > 0 ? (
            <div className="space-y-2">
              {labor.slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{entry.employee_name || entry.employeeName}</span>
                    <span className="text-gray-400">{entry.stage_name || entry.stageName || ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                    <span className="text-gray-900 font-medium">{entry.hours}h</span>
                  </div>
                </div>
              ))}
              {labor.length > 5 && (
                <p className="text-xs text-gray-400 pt-1">+{labor.length - 5} more entries</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No labor recorded yet</p>
          )}
        </Card>

        {/* Materials Summary */}
        <Card>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mb-4">Materials</h3>
          {materials.length > 0 ? (
            <div className="space-y-2">
              {materials.slice(0, 5).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate max-w-[200px]">{m.material_name || m.materialName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{m.quantity} {m.unit}</span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${getMaterialDotColor(m.status)}`} />
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
              {materials.length > 5 && (
                <p className="text-xs text-gray-400 pt-1">+{materials.length - 5} more items</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No materials added yet</p>
          )}
        </Card>

        {/* Notes */}
        <Card>
          <h3 className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mb-4">Notes</h3>
          {job.notes ? (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.notes}</p>
          ) : (
            <p className="text-sm text-gray-400">No notes</p>
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
