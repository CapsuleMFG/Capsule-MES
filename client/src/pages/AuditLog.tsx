import React, { useState } from 'react';
import { useAuditLog } from '../hooks/useAuth';
import { useProfiles } from '../hooks/useAuth';
import { exportToCsv } from '../utils/exportCsv';
import { DownloadSimple } from '@phosphor-icons/react';
import type { AuditLogFilters } from '../../../shared/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-emerald-700 bg-emerald-50',
  UPDATE: 'text-blue-700 bg-blue-50',
  DELETE: 'text-red-700 bg-red-50',
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, limit: 50 });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isLoading, error } = useAuditLog(filters);
  const { data: profiles } = useProfiles();

  const setFilter = (key: keyof AuditLogFilters, value: string | number | undefined) => {
    setFilters(f => ({ ...f, [key]: value, page: 1 }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all data changes in the system</p>
        </div>
        <button
          onClick={() => {
            if (!data?.data) return;
            exportToCsv('audit_log',
              ['Timestamp', 'User', 'Action', 'Table', 'Record ID'],
              data.data.map(e => [e.createdAt, e.userName, e.action, e.tableName, e.recordId || ''])
            );
          }}
          disabled={!data?.data?.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 bg-white ring-1 ring-gray-200 rounded-[10px] hover:bg-gray-50 disabled:opacity-50"
        >
          <DownloadSimple size={16} weight="regular" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.userId || ''}
          onChange={e => setFilter('userId', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-900"
        >
          <option value="">All users</option>
          {profiles?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={filters.action || ''}
          onChange={e => setFilter('action', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-900"
        >
          <option value="">All actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>

        <input
          type="text"
          placeholder="Table name"
          value={filters.tableName || ''}
          onChange={e => setFilter('tableName', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-900"
        />

        <input
          type="date"
          value={filters.from || ''}
          onChange={e => setFilter('from', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-900"
        />

        <input
          type="date"
          value={filters.to || ''}
          onChange={e => setFilter('to', e.target.value || undefined)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:border-gray-900"
        />

        <button
          onClick={() => setFilters({ page: 1, limit: 50 })}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">Failed to load audit log</p>}

      {data && (
        <>
          <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Record</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map(entry => (
                  <React.Fragment key={entry.id}>
                    <tr className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-900">{entry.userName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[entry.action] || 'text-gray-700 bg-gray-100'}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{entry.tableName}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.recordId || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {(entry.oldValues || entry.newValues) && (
                          <button
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                            className="text-xs text-gray-400 hover:text-gray-700"
                          >
                            {expandedId === entry.id ? 'Hide' : 'Details'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-detail`} className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4">
                            {entry.oldValues && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Before</p>
                                <pre className="text-xs text-gray-700 bg-white border border-gray-100 rounded p-2 overflow-auto max-h-40">
                                  {JSON.stringify(entry.oldValues, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.newValues && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">After</p>
                                <pre className="text-xs text-gray-700 bg-white border border-gray-100 rounded p-2 overflow-auto max-h-40">
                                  {JSON.stringify(entry.newValues, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No entries found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Page {data.page} of {data.totalPages} · {data.total} total entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
                disabled={data.page <= 1}
                className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
                disabled={data.page >= data.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
