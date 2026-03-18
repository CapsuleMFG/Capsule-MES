import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Package, CurrencyDollar, Truck } from '@phosphor-icons/react';
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

      {/* Current Stage Status */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Current Stage:</span>
          <span className="text-xs font-medium text-gray-900">{activeStage?.stageName}</span>
          <span className={`text-xs font-medium ${getStatusColor(activeStage?.status || 'Not Started')}`}>
            {activeStage?.status || 'Not Started'}
          </span>
        </div>
      </div>

      {/* Supply Chain Metrics */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Procurement</p>
            <p className="text-sm font-semibold text-gray-900">
              {receivedItems}/{totalItems}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Package size={16} className="text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Materials</p>
            <p className="text-sm font-semibold text-gray-900">{materials?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Cost */}
      {totalProcurementCost > 0 && (
        <div className="flex items-center gap-2 mt-3 text-xs">
          <CurrencyDollar size={12} className="text-gray-400" />
          <span className="text-gray-400">
            Procurement Cost: <span className="text-gray-900 font-semibold">${totalProcurementCost.toFixed(2)}</span>
          </span>
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
