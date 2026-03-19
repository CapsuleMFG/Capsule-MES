import { useState, useMemo } from 'react';
import { subDays, startOfWeek, startOfMonth, format } from 'date-fns';
import { useKpiReport } from '../hooks/useReports';
import { exportToCsv } from '../utils/exportCsv';
import { DownloadSimple } from '@phosphor-icons/react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const DATE_RANGES = [
  { label: 'This Week', getValue: () => ({ from: format(startOfWeek(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'This Month', getValue: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 30 Days', getValue: () => ({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 90 Days', getValue: () => ({ from: format(subDays(new Date(), 90), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'All Time', getValue: () => ({ from: undefined, to: undefined }) },
];

export default function Reports() {
  const [rangeIndex, setRangeIndex] = useState(2); // Default: Last 30 Days
  const range = useMemo(() => DATE_RANGES[rangeIndex].getValue(), [rangeIndex]);
  const { data, isLoading, error } = useKpiReport(range.from, range.to);

  const handleExport = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ['Jobs Completed', data.jobsCompleted],
      ['Avg Cycle Time (days)', data.avgCycleTimeDays],
      ['On-Time Rate (%)', data.onTimeRate],
      ['Scrap Rate (%)', data.scrapRate],
      ['Total Labor Hours', data.totalLaborHours],
      ...Object.entries(data.laborByStage).map(([stage, hours]) => [`Labor: ${stage}`, hours]),
    ];
    exportToCsv('kpi_report', ['Metric', 'Value'], rows);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {DATE_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIndex(i)}
              className={`px-3 py-1.5 text-sm rounded-[10px] transition-colors ${
                rangeIndex === i
                  ? 'bg-gray-900 text-white font-medium'
                  : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={!data}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white ring-1 ring-gray-200 rounded-[10px] hover:bg-gray-50 disabled:opacity-50"
        >
          <DownloadSimple size={16} weight="regular" />
          Export
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-red-600">Failed to load report data</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Jobs Completed', value: data.jobsCompleted },
              { label: 'Avg Cycle Time', value: `${data.avgCycleTimeDays}d` },
              { label: 'On-Time Rate', value: `${data.onTimeRate}%` },
              { label: 'Scrap Rate', value: `${data.scrapRate}%`, alert: data.scrapRate > 5 },
              { label: 'Total Labor Hours', value: data.totalLaborHours.toFixed(1) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5">
                <p className="text-[11px] uppercase tracking-wider font-medium text-gray-400">{kpi.label}</p>
                <p className={`text-2xl font-semibold mt-1 ${kpi.alert ? 'text-red-600' : 'text-gray-900'}`}>
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Labor by Stage */}
          {Object.keys(data.laborByStage).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Labor Hours by Stage</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3">Stage</th>
                    <th className="text-right text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3">Hours</th>
                    <th className="text-right text-[11px] uppercase tracking-wider font-medium text-gray-400 px-5 py-3">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.laborByStage).map(([stage, hours]) => (
                    <tr key={stage} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-900">{stage}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 text-right">{hours.toFixed(1)}</td>
                      <td className="px-5 py-3 text-sm text-gray-400 text-right">
                        {data.totalLaborHours > 0 ? ((hours / data.totalLaborHours) * 100).toFixed(1) : '0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
