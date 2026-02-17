import { useState } from 'react';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import LoadingSpinner from '../ui/LoadingSpinner';
import Card from '../ui/Card';
import Input from '../ui/Input';
import EditOrderModal from './EditOrderModal';
import ReceiveOrderModal from './ReceiveOrderModal';
import { Package, Clock, AlertTriangle, CheckCircle2, Pencil, PackageCheck, ChevronDown, ChevronRight } from 'lucide-react';
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
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Package className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total Orders</p>
                            <p className="text-2xl font-bold text-white">{totalOrders}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                            <Clock className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Pending Receipt</p>
                            <p className="text-2xl font-bold text-white">{pendingReceipt}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Overdue</p>
                            <p className={`text-2xl font-bold ${overdue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {overdue}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Received (7d)</p>
                            <p className="text-2xl font-bold text-white">{recentlyReceived}</p>
                        </div>
                    </div>
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
                                <tr className="border-b border-gray-700 bg-rivian-black">
                                    <th className="w-8 py-3 px-2"></th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase">Description</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase">Jobs</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase">Vendor</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase">PO#</th>
                                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-400 uppercase">Ordered</th>
                                    <th className="text-right py-3 px-3 text-xs font-medium text-gray-400 uppercase">Received</th>
                                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-400 uppercase">Expected</th>
                                    <th className="text-center py-3 px-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
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
                                                className={`border-b border-gray-800 hover:bg-rivian-hover transition-colors ${
                                                    isOverdue ? 'bg-red-500/5' : ''
                                                } ${hasMultipleJobs ? 'cursor-pointer' : ''}`}
                                                onClick={() => hasMultipleJobs && setExpandedId(isExpanded ? null : item.id)}
                                            >
                                                <td className="py-3 px-2 text-center">
                                                    {hasMultipleJobs && (
                                                        isExpanded
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 inline" />
                                                            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 inline" />
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="text-gray-300 text-xs max-w-[200px] truncate" title={item.description}>
                                                        {item.description}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.linkedJobs && item.linkedJobs.length > 0 && (
                                                        <div>
                                                            {item.linkedJobs.length === 1 ? (
                                                                <div>
                                                                    <p className="text-white font-medium text-xs">{item.linkedJobs[0].jobNumber}</p>
                                                                    <p className="text-gray-500 text-xs">{item.linkedJobs[0].clientName}</p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-blue-400">
                                                                    {item.linkedJobs.length} jobs
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-gray-300 text-xs">
                                                    {item.vendor || '-'}
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.poNumber ? (
                                                        <span className="text-purple-400 text-xs">{item.poNumber}</span>
                                                    ) : (
                                                        <span className="text-gray-600 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-right text-white text-xs font-medium">
                                                    {item.qtyOrdered}
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <span className={`text-xs font-medium ${
                                                        item.qtyReceived >= item.qtyOrdered
                                                            ? 'text-green-400'
                                                            : isPartial
                                                            ? 'text-yellow-400'
                                                            : 'text-gray-500'
                                                    }`}>
                                                        {item.qtyReceived}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {item.expectedReceiveDate ? (
                                                        <span className={`text-xs ${
                                                            isOverdue ? 'text-red-400 font-medium' : 'text-gray-300'
                                                        }`}>
                                                            {new Date(item.expectedReceiveDate + 'T00:00:00').toLocaleDateString()}
                                                            {isOverdue && ' (overdue)'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-600 text-xs">Not set</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => setEditItem(item)}
                                                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                                            title="Edit order details"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        {item.qtyReceived < item.qtyOrdered && (
                                                            <button
                                                                onClick={() => setReceiveItem(item)}
                                                                className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                                                title="Receive order"
                                                            >
                                                                <PackageCheck className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded job breakdown */}
                                            {isExpanded && hasMultipleJobs && item.linkedJobs?.map((job) => (
                                                <tr key={`${item.id}-${job.pbomItemId}`} className="border-b border-gray-800/50 bg-rivian-black/50">
                                                    <td className="py-2 px-2"></td>
                                                    <td className="py-2 px-3" colSpan={2}>
                                                        <div className="pl-4 flex items-center gap-2">
                                                            <span className="text-xs text-white font-medium">{job.jobNumber}</span>
                                                            <span className="text-xs text-gray-500">{job.clientName}</span>
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
                <div className="text-center py-12 bg-rivian-soft-black rounded-lg">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
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
