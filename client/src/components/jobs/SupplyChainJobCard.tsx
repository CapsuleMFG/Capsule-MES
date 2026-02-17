import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Package, DollarSign, TruckIcon } from 'lucide-react';
import * as jobsService from '../../services/jobs.service';
import type { Job } from '../../types';

interface SupplyChainJobCardProps {
  job: Job;
}

export default function SupplyChainJobCard({ job }: SupplyChainJobCardProps) {
  // Fetch supply chain-specific data
  const { data: procurement } = useQuery({
    queryKey: ['procurement', job.id],
    queryFn: () => jobsService.getProcurementItems(job.id),
  });

  const { data: materials } = useQuery({
    queryKey: ['materials', job.id],
    queryFn: () => jobsService.getJobMaterials(job.id),
  });

  const woReleaseStage = job.workflowProgress?.find(
    (progress) => progress.stageName === 'WO Release'
  );
  const materialsStage = job.workflowProgress?.find(
    (progress) => progress.stageName === 'Materials'
  );

  // Determine which stage is active
  const activeStage = woReleaseStage?.status === 'In Progress' || woReleaseStage?.status === 'Not Started'
    ? woReleaseStage
    : materialsStage;

  const totalProcurementCost = procurement?.reduce(
    (sum, item) => sum + (item.cost || 0) * item.quantityNeeded,
    0
  ) || 0;

  const receivedItems = procurement?.filter((item) => item.status === 'Received').length || 0;
  const totalItems = procurement?.length || 0;

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

      {/* Current Stage Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Current Stage:</span>
          <span className="text-xs font-medium text-white">{activeStage?.stageName}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activeStage?.status || 'Not Started')}`}>
            {activeStage?.status || 'Not Started'}
          </span>
        </div>
      </div>

      {/* Supply Chain Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <TruckIcon className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Procurement</p>
            <p className="text-sm font-semibold text-white">
              {receivedItems}/{totalItems}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Materials</p>
            <p className="text-sm font-semibold text-white">{materials?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Cost */}
      {totalProcurementCost > 0 && (
        <div className="flex items-center gap-2 mt-3 text-xs">
          <DollarSign className="w-3 h-3 text-gray-400" />
          <span className="text-gray-400">
            Procurement Cost: <span className="text-white font-semibold">${totalProcurementCost.toFixed(2)}</span>
          </span>
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
