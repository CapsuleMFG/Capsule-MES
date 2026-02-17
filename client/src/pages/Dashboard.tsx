import { useDashboardMetrics } from '../hooks/useDashboard';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Briefcase, Package, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: metrics, isLoading, error } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        Error loading dashboard metrics. Please try again.
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Active Jobs */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Active Jobs</p>
              <p className="text-4xl font-bold text-white">{metrics.activeJobs}</p>
            </div>
            <div className="p-3 bg-rivian-accent/20 rounded-lg">
              <Briefcase className="w-6 h-6 text-rivian-accent" />
            </div>
          </div>
        </Card>

        {/* Material Issues */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Material Issues</p>
              <p className="text-4xl font-bold text-priority-high">{metrics.materialIssues}</p>
            </div>
            <div className="p-3 bg-priority-high/20 rounded-lg">
              <Package className="w-6 h-6 text-priority-high" />
            </div>
          </div>
        </Card>

        {/* Total Labor Hours */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Labor Hours</p>
              <p className="text-4xl font-bold text-status-completed">{metrics.totalLaborHours.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-status-completed/20 rounded-lg">
              <Clock className="w-6 h-6 text-status-completed" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Jobs Table */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Job Number</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Client</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Target End</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentJobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-gray-800 hover:bg-rivian-hover transition-colors"
                >
                  <td className="py-3 px-4">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-rivian-accent hover:underline font-medium"
                    >
                      {job.jobNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{job.clientName}</td>
                  <td className="py-3 px-4 text-gray-300">
                    {job.description.length > 50
                      ? `${job.description.substring(0, 50)}...`
                      : job.description}
                  </td>
                  <td className="py-3 px-4 text-gray-300">{job.status}</td>
                  <td className="py-3 px-4 text-gray-400">
                    {job.targetEndDate
                      ? new Date(job.targetEndDate).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {metrics.recentJobs.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No jobs found. Create your first job to get started.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
