import { useQuery } from '@tanstack/react-query';
import { Clock, User, FileText, Package } from '@phosphor-icons/react';
import * as jobsService from '../../services/jobs.service';
import type { Job } from '../../types';

interface EngineeringJobCardProps {
  job: Job;
}

export default function EngineeringJobCard({ job }: EngineeringJobCardProps) {
  // Fetch engineering-specific data
  const { data: workOrders } = useQuery({
    queryKey: ['workOrders', job.id],
    queryFn: () => jobsService.getWorkOrders(job.id),
  });

  const { data: engineering } = useQuery({
    queryKey: ['engineering', job.id],
    queryFn: () => jobsService.getEngineeringStatus(job.id),
  });

  const engineeringStage = job.workflowProgress?.find(
    (progress) => progress.stageName === 'Engineering'
  );

  const totalBomItems = workOrders?.reduce((sum, wo) => sum + (wo.bomItems?.length || 0), 0) || 0;

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
    <div className="block bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{job.jobNumber}</h3>
          <p className="text-sm text-gray-400 mt-1">{job.clientName}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

      {/* Engineering Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Engineering Status:</span>
          <span className={`text-xs font-medium ${getStatusColor(engineeringStage?.status || 'Not Started')}`}>
            {engineeringStage?.status || 'Not Started'}
          </span>
        </div>

        {engineering?.assignee && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User size={12} />
            <span>{engineering.assignee}</span>
          </div>
        )}
      </div>

      {/* Engineering Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Work Orders</p>
            <p className="text-sm font-semibold text-gray-900">{workOrders?.length || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Package size={16} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">BOM Items</p>
            <p className="text-sm font-semibold text-gray-900">{totalBomItems}</p>
          </div>
        </div>
      </div>

      {/* Target Date */}
      {job.targetEndDate && (
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <Clock size={12} />
          <span>Target: {new Date(job.targetEndDate).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
