import { useQuery } from '@tanstack/react-query';
import { Clock, User, FileText, Package } from 'lucide-react';
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
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="block bg-rivian-soft-black border border-gray-800 rounded-lg p-5 hover:border-rivian-accent transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{job.jobNumber}</h3>
          <p className="text-sm text-gray-400 mt-1">{job.clientName}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{job.description}</p>

      {/* Engineering Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Engineering Status:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(engineeringStage?.status || 'Not Started')}`}>
            {engineeringStage?.status || 'Not Started'}
          </span>
        </div>

        {engineering?.assignee && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User className="w-3 h-3" />
            <span>{engineering.assignee}</span>
          </div>
        )}
      </div>

      {/* Engineering Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Work Orders</p>
            <p className="text-sm font-semibold text-white">{workOrders?.length || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">BOM Items</p>
            <p className="text-sm font-semibold text-white">{totalBomItems}</p>
          </div>
        </div>
      </div>

      {/* Target Date */}
      {job.targetEndDate && (
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Target: {new Date(job.targetEndDate).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
