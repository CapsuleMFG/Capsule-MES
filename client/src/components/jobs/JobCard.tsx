import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import type { Job } from '../../types';
import { CheckCircle2, Clock, Circle } from 'lucide-react';

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate();

  const getWorkflowStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'In Progress':
        return <Clock className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getWorkflowBadgeClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'badge-completed';
      case 'In Progress':
        return 'badge-in-progress';
      case 'Blocked':
        return 'badge-blocked';
      default:
        return 'badge-not-started';
    }
  };

  return (
    <Card hover onClick={() => navigate(`/jobs/${job.id}`)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{job.jobNumber}</h3>
            <p className="text-sm text-gray-400">{job.clientName}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm line-clamp-2">{job.description}</p>

        {/* Workflow Progress Badges */}
        {job.workflowProgress && job.workflowProgress.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {job.workflowProgress
              .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
              .map((stage) => (
                <span
                  key={stage.id}
                  className={`
                    badge badge-stage flex items-center gap-1
                    ${getWorkflowBadgeClass(stage.status)}
                  `}
                  title={`${stage.stageName}: ${stage.status}`}
                >
                  {getWorkflowStatusIcon(stage.status)}
                  <span className="text-xs">{stage.stageName}</span>
                </span>
              ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
          <div className="text-gray-400">
            Start: {job.targetStartDate ? new Date(job.targetStartDate).toLocaleDateString() : 'Not set'}
          </div>
          <div className="text-gray-400">
            End: {job.targetEndDate ? new Date(job.targetEndDate).toLocaleDateString() : 'Not set'}
          </div>
        </div>
      </div>
    </Card>
  );
}
