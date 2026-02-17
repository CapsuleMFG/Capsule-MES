import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, User, Activity } from 'lucide-react';
import * as jobsService from '../../services/jobs.service';
import type { Job } from '../../types';

interface ProductionJobCardProps {
  job: Job;
}

export default function ProductionJobCard({ job }: ProductionJobCardProps) {
  // Fetch production-specific data
  const { data: labor } = useQuery({
    queryKey: ['labor', job.id],
    queryFn: () => jobsService.getJobLabor(job.id),
  });

  const productionStage = job.workflowProgress?.find(
    (progress) => progress.stageName === 'Production'
  );

  const totalLaborHours = labor?.reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0) || 0;

  // Get last labor entry date
  const lastActivity = labor && labor.length > 0
    ? new Date(Math.max(...labor.map((l: any) => new Date(l.date).getTime())))
    : null;

  // Get unique employees
  const uniqueEmployees = new Set(labor?.map((l: any) => l.employee_name) || []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-rivian-soft-black border border-gray-800 rounded-lg p-5 hover:border-rivian-accent transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{job.jobNumber}</h3>
          <p className="text-sm text-gray-400 mt-1">{job.clientName}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{job.description}</p>

      {/* Production Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Production Status:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(productionStage?.status || 'Not Started')}`}>
            {productionStage?.status || 'Not Started'}
          </span>
        </div>

        {productionStage?.assignee && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User className="w-3 h-3" />
            <span>{productionStage.assignee}</span>
          </div>
        )}
      </div>

      {/* Production Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Labor Hours</p>
            <p className="text-sm font-semibold text-white">{totalLaborHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Employees</p>
            <p className="text-sm font-semibold text-white">{uniqueEmployees.size}</p>
          </div>
        </div>
      </div>

      {/* Last Activity */}
      {lastActivity && (
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <Activity className="w-3 h-3" />
          <span>Last activity: {lastActivity.toLocaleDateString()}</span>
        </div>
      )}

      {/* Target Date */}
      {job.targetEndDate && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Target: {new Date(job.targetEndDate).toLocaleDateString()}</span>
        </div>
      )}
    </Link>
  );
}
