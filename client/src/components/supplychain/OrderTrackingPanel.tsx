import { useState } from 'react';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import LoadingSpinner from '../ui/LoadingSpinner';
import Card from '../ui/Card';
import Input from '../ui/Input';
import EditOrderModal from './EditOrderModal';
import ReceiveOrderModal from './ReceiveOrderModal';
import { Package, PencilSimple, ArrowLineDown, CaretDown, CaretRight } from '@phosphor-icons/react';
import type { PurchaseOrder } from '../../types';

export default function OrderTrackingPanel() {
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState<PurchaseOrder | null>(null);
    const [receiveItem, setReceiveItem] = useState<PurchaseOrder | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const { data: orders, isLoading } = usePurchaseOrders();

    const today = new Date().toISOString().split('T')[0];

    // Filter by search
    const filtered = orders?.filter((item) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            item.description?.toLowerCase().includes(s) ||
            item.vendor?.toLowerCase().includes(s) ||
            item.poNumber?.toLowerCase().includes(s) ||
            item.linkedJobs?.some(j =>
                j.jobNumber?.toLowerCase().includes(s) ||
                j.clientName?.toLowerCase().includes(s)
            )
        );
    }) || [];

    // Metrics
    const totalOrders = orders?.length || 0;
    const pendingReceipt = orders?.filter((i) => i.qtyReceived < i.qtyOrdered).length || 0;
    const overdue = orders?.filter(
        (i) => i.expectedReceiveDate && i.expectedReceiveDate < today && i.qtyReceived < i.qtyOrdered
    ).length || 0;
    const recentlyReceived = orders?.filter((i) => {
        if (i.qtyReceived <= 0) return false;
        const updated = new Date(i.updatedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return updated >= weekAgo && i.qtyReceived > 0;
    }).length || 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div>
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Orders</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">{totalOrders}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Pending Receipt</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">{pendingReceipt}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Overdue</p>
                    <p className={`text-xl font-semibold mt-1 ${overdue > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {overdue}
                    </p>
                </Card>

                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Received (7d)</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">{recentlyReceived}</p>
                </Card>
            </div>

            {/* Search */}
            <div className="mb-4">
                <Input
                    placeholder="Search by description, job number, vendor, PO#..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Orders Table */}
            {filtered.length > 0 ? (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-white">
                                    <th className="w-8 py-3 px-2"></th>
                                    <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                                    <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Jobs</th>
                                    <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Vendor</th>
                                    <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">PO#</th>
                                    <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Ordered</th>
                                    <th className="text-right py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Received</th>
                                    <th className="text-left py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Expected</th>
                                    <th className="text-center py-3 px-3 text-[11px] uppercase tracking-wider font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item) => {
                                    const isOverdue =
                                        item.expectedReceiveDate &&
                                        item.expectedReceiveDate < today &&
                                        item.qtyReceived < item.qtyOrdered;
                                    const isPartial = item.qtyReceived > 0 && item.qtyReceived < item.qtyOrdered;
                                    const isExpanded = expandedId === item.id;
                                    const hasMultipleJobs = (item.linkedJobs?.length || 0) > 1;

                                    return (
                                        <>
                                            <tr
                                                key={item.id}
                                                className={`border-b border-gray-50 hover:bg-gray-50 transition-colors text-sm text-gray-600 ${
                                                    isOverdue ? 'bg-red-50' : ''
                                                } ${hasMultipleJobs ? 'cursor-pointer' : ''}`}
                                                onClick={() => hasMultipleJobs && setExpandedId(isExpanded ? null : item.id)}
                                            >
                                                <td className="py-3 px-2 text-center">
                                                    {hasMultipleJobs && (
                                                        isExpanded
                                                            ? <CaretDown size={14} className="text-gray-400 inline" />
                                                            : <CaretRight size={14} className="text-gray-400 inline" />
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="text-gray-600 text-xs max-w-[200px] truncate" title={item.description}>
                                                        {item.description}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.linkedJobs && item.linkedJobs.length > 0 && (
                                                        <div>
                                                            {item.linkedJobs.length === 1 ? (
                                                                <div>
                                                                    <p className="text-gray-900 font-medium text-xs">{item.linkedJobs[0].jobNumber}</p>
                                                                    <p className="text-gray-400 text-xs">{item.linkedJobs[0].clientName}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-blue-400">
                                                                    {item.linkedJobs.length} jobs
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-gray-600 text-xs">
                                                    {item.vendor || '-'}
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.poNumber ? (
                                                        <span className="text-purple-500 text-xs">{item.poNumber}</span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-right text-gray-900 text-xs font-medium">
                                                    {item.qtyOrdered}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <span className={`text-xs font-medium ${
                                                        item.qtyReceived >= item.qtyOrdered
                                                            ? 'text-emerald-500'
                                                            : isPartial
                                                            ? 'text-amber-500'
                                                            : 'text-gray-400'
                                                    }`}>
                                                        {item.qtyReceived}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.expectedReceiveDate ? (
                                                        <span className={`text-xs ${
                                                            isOverdue ? 'text-red-500 font-medium' : 'text-gray-600'
                                                        }`}>
                                                            {new Date(item.expectedReceiveDate + 'T00:00:00').toLocaleDateString()}
                                                            {isOverdue && ' (overdue)'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Not set</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => setEditItem(item)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                            title="Edit order details"
                                                        >
                                                            <PencilSimple size={14} />
                                                        </button>
                                                        {item.qtyReceived < item.qtyOrdered && (
                                                            <button
                                                                onClick={() => setReceiveItem(item)}
                                                                className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-gray-100 rounded transition-colors"
                                                                title="Receive order"
                                                            >
                                                                <ArrowLineDown size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded job breakdown */}
                                            {isExpanded && hasMultipleJobs && item.linkedJobs?.map((job) => (
                                                <tr key={`${item.id}-${job.pbomItemId}`} className="border-b border-gray-50 bg-gray-50">
                                                    <td className="py-2 px-2"></td>
                                                    <td className="py-2 px-3" colSpan={2}>
                                                        <div className="pl-4 flex items-center gap-2">
                                                            <span className="text-xs text-gray-900 font-medium">{job.jobNumber}</span>
                                                            <span className="text-xs text-gray-400">{job.clientName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3" colSpan={2}></td>
                                                    <td className="py-2 px-3 text-right text-xs text-gray-400">{job.qtyOrdered}</td>
                                                    <td className="py-2 px-3 text-right text-xs text-gray-400">{job.qtyReceived}</td>
                                                    <td className="py-2 px-3" colSpan={2}></td>
                                                </tr>
                                            ))}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Package size={48} className="text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400 text-lg">No active orders</p>
                    <p className="text-gray-500 text-sm mt-1">
                        {search
                            ? 'No orders match your search'
                            : 'Mark PBOM items as "Ordered" to track them here'}
                    </p>
                </div>
            )}

            <EditOrderModal
                item={editItem}
                isOpen={!!editItem}
                onClose={() => setEditItem(null)}
            />
            <ReceiveOrderModal
                item={receiveItem}
                isOpen={!!receiveItem}
                onClose={() => setReceiveItem(null)}
            />
        </div>
    );
}
