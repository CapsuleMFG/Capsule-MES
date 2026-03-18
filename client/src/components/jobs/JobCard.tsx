import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import type { Job } from '../../types';

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate();

  const getWorkflowDotColor = (status: string): string => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500';
      case 'In Progress': return 'bg-amber-500';
      case 'Blocked': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getWorkflowTextColor = (status: string): string => {
    switch (status) {
      case 'Completed': return 'text-gray-600';
      case 'In Progress': return 'text-gray-600';
      case 'Blocked': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card hover onClick={() => navigate(`/jobs/${job.id}`)}>
      <div className="space-y-3">
        {/* Header */}
        <div>
          <h3 className="text-sm font-medium text-gray-900">{job.jobNumber}</h3>
          <p className="text-xs text-gray-400">{job.clientName}</p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>

        {/* Workflow Progress Dots */}
        {job.workflowProgress && job.workflowProgress.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {job.workflowProgress
              .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
              .map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-1.5"
                  title={`${stage.stageName}: ${stage.status}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${getWorkflowDotColor(stage.status)}`} />
                  <span className={`text-xs ${getWorkflowTextColor(stage.status)}`}>{stage.stageName}</span>
                </div>
              ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
          <span className="text-gray-400">
            Start: {job.targetStartDate ? new Date(job.targetStartDate).toLocaleDateString() : 'Not set'}
          </span>
          <span className="text-gray-400">
            End: {job.targetEndDate ? new Date(job.targetEndDate).toLocaleDateString() : 'Not set'}
          </span>
        </div>
      </div>
    </Card>
  );
}
