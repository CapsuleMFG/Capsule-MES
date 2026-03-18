import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, User, Pulse } from '@phosphor-icons/react';
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
        return 'text-emerald-500';
      case 'In Progress':
        return 'text-amber-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5 hover:shadow-md transition-shadow duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{job.jobNumber}</h3>
          <p className="text-sm text-gray-400 mt-1">{job.clientName}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

      {/* Production Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Production Status:</span>
          <span className={`text-xs font-medium ${getStatusColor(productionStage?.status || 'Not Started')}`}>
            {productionStage?.status || 'Not Started'}
          </span>
        </div>

        {productionStage?.assignee && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User size={12} />
            <span>{productionStage.assignee}</span>
          </div>
        )}
      </div>

      {/* Production Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Labor Hours</p>
            <p className="text-sm font-semibold text-gray-900">{totalLaborHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Employees</p>
            <p className="text-sm font-semibold text-gray-900">{uniqueEmployees.size}</p>
          </div>
        </div>
      </div>

      {/* Last Activity */}
      {lastActivity && (
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <Pulse size={12} />
          <span>Last activity: {lastActivity.toLocaleDateString()}</span>
        </div>
      )}

      {/* Target Date */}
      {job.targetEndDate && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          <Clock size={12} />
          <span>Target: {new Date(job.targetEndDate).toLocaleDateString()}</span>
        </div>
      )}
    </Link>
  );
}
