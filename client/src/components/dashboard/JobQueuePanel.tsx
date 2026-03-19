import type { DashboardJob } from '../../types';

interface JobQueuePanelProps {
  jobs: DashboardJob[];
}

const priorityColors: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700',
  High: 'bg-amber-50 text-amber-700',
  Medium: 'bg-gray-100 text-gray-500',
  Low: 'bg-gray-100 text-gray-400',
};

const stageStatusDot: Record<string, string> = {
  'In Progress': 'bg-amber-500',
  'Not Started': 'bg-gray-300',
  'Completed': 'bg-emerald-500',
  'Blocked': 'bg-red-500',
};

export default function JobQueuePanel({ jobs }: JobQueuePanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Job Queue</h3>
        <span className="text-xs text-gray-400">{jobs.length} jobs</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {jobs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No active jobs</p>
        ) : (
          jobs.map((job) => {
            const isOverdue = job.targetEndDate && new Date(job.targetEndDate) < new Date();
            return (
              <div key={job.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{job.jobNumber}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${priorityColors[job.priority] || 'bg-gray-100 text-gray-500'}`}>
                    {job.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{job.clientName}{job.description ? ` \u2014 ${job.description}` : ''}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${stageStatusDot[job.stageStatus] || 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-400">{job.currentStage}</span>
                  {isOverdue && (
                    <span className="text-[10px] font-medium text-amber-600 ml-auto">Overdue</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
