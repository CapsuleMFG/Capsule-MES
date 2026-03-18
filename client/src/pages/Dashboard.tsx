import { useDashboardMetrics } from '../hooks/useDashboard';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
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
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">Dashboard</h1>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Active Jobs</p>
          <p className="text-3xl font-bold tracking-tighter text-gray-900 mt-1">{metrics.activeJobs}</p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Material Issues</p>
          <p className="text-3xl font-bold tracking-tighter text-gray-900 mt-1">{metrics.materialIssues}</p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">Total Labor Hours</p>
          <p className="text-3xl font-bold tracking-tighter text-gray-900 mt-1">{metrics.totalLaborHours.toFixed(1)}</p>
        </Card>
      </div>

      {/* Recent Jobs Table */}
      <Card>
        <h2 className="text-[11px] uppercase tracking-wider font-medium text-gray-400 mb-4">Recent Jobs</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Job Number</th>
                <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Client</th>
                <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Status</th>
                <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Target End</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentJobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      {job.jobNumber}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-gray-600">{job.clientName}</td>
                  <td className="py-2.5 px-3 text-sm text-gray-600">
                    {job.description.length > 50
                      ? `${job.description.substring(0, 50)}...`
                      : job.description}
                  </td>
                  <td className="py-2.5 px-3 text-sm text-gray-600">{job.status}</td>
                  <td className="py-2.5 px-3 text-sm text-gray-400">
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
