import Card from '../../ui/Card';
import type { Job } from '../../../types';

interface OverviewTabProps {
  job: Job;
}

export default function OverviewTab({ job }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Job Information */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Job Number</label>
            <p className="text-gray-900 font-medium">{job.jobNumber}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Client</label>
            <p className="text-gray-900 font-medium">{job.clientName}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Description</label>
            <p className="text-gray-900">{job.description}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Status</label>
            <p className="text-gray-900">{job.status}</p>
          </div>
        </div>
      </Card>

      {/* Dates */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dates</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Target Start Date</label>
            <p className="text-gray-900">
              {job.targetStartDate ? new Date(job.targetStartDate).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Target End Date</label>
            <p className="text-gray-900">
              {job.targetEndDate ? new Date(job.targetEndDate).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Actual Start Date</label>
            <p className="text-gray-900">
              {job.startDate ? new Date(job.startDate).toLocaleDateString() : 'Not started'}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Actual Completed Date</label>
            <p className="text-gray-900">
              {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : 'Not completed'}
            </p>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {job.notes && (
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{job.notes}</p>
        </Card>
      )}
    </div>
  );
}
