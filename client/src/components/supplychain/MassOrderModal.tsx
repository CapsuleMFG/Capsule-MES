import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as inventoryService from '../../services/inventory.service';
import LoadingSpinner from '../ui/LoadingSpinner';
import Button from '../ui/Button';
import { ShoppingCart, X, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import type { GlobalInventory } from '../../types';

interface MassOrderModalProps {
    inventoryItem: GlobalInventory;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (orderQuantity: number) => void;
    isConfirming: boolean;
}

export default function MassOrderModal({ inventoryItem, isOpen, onClose, onConfirm, isConfirming }: MassOrderModalProps) {
    const [orderQuantity, setOrderQuantity] = useState<string>('');

    const { data, isLoading } = useQuery({
        queryKey: ['demand-details', inventoryItem.id],
        queryFn: () => inventoryService.getDemandDetails(inventoryItem.id),
        enabled: isOpen,
    });

    // Set default order quantity to needToOrder when data loads
    useEffect(() => {
        if (data) {
            setOrderQuantity(data.needToOrder > 0 ? String(data.needToOrder) : String(data.totalDemand));
        }
    }, [data]);

    if (!isOpen) return null;

    // Group demand items by job
    const jobGroups = data?.demandItems.reduce((acc, item) => {
        const key = item.jobNumber;
        if (!acc[key]) {
            acc[key] = { jobNumber: item.jobNumber, jobDescription: item.jobDescription, items: [] };
        }
        acc[key].items.push(item);
        return acc;
    }, {} as Record<string, { jobNumber: string; jobDescription: string; items: typeof data.demandItems }>) || {};

    const jobCount = Object.keys(jobGroups).length;
    const availableQty = inventoryItem.availableQty ?? inventoryItem.quantityOnHand;
    const stockCoversAll = availableQty >= (data?.totalDemand || 0);
    const parsedQty = parseFloat(orderQuantity) || 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <div className="relative bg-gray-900 border border-gray-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-600 bg-gray-800/50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-500/20 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Mass Order</h2>
                            <p className="text-sm text-gray-300">
                                {inventoryItem.description || inventoryItem.partNumber}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : data && data.demandItems.length > 0 ? (
                        <>
                            {/* Inventory Stock Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                                    <p className="text-xs text-gray-400 uppercase mb-1">On Hand</p>
                                    <p className="text-xl font-bold text-white">{inventoryItem.quantityOnHand}</p>
                                    <p className="text-xs text-gray-500">{inventoryItem.unit}</p>
                                </div>
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                                    <p className="text-xs text-gray-400 uppercase mb-1">Available</p>
                                    <p className="text-xl font-bold text-green-400">{availableQty}</p>
                                    <p className="text-xs text-gray-500">{inventoryItem.unit}</p>
                                </div>
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
                                    <p className="text-xs text-gray-400 uppercase mb-1">Total Demand</p>
                                    <p className="text-xl font-bold text-orange-400">{data.totalDemand}</p>
                                    <p className="text-xs text-gray-500">{inventoryItem.unit}</p>
                                </div>
                            </div>

                            {/* Stock Status Message */}
                            {stockCoversAll ? (
                                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    <p className="text-green-300">
                                        Available stock ({availableQty} {inventoryItem.unit}) covers all demand ({data.totalDemand} {inventoryItem.unit}). No order needed unless you want to restock.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
                                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    <p className="text-red-300">
                                        Short by <strong>{data.needToOrder} {inventoryItem.unit}</strong>. Available stock ({availableQty}) does not cover total demand ({data.totalDemand}).
                                    </p>
                                </div>
                            )}

                            {/* Order Quantity Input */}
                            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                                <label className="block text-sm font-medium text-white mb-2">
                                    Quantity to Order
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="1"
                                        value={orderQuantity}
                                        onChange={(e) => setOrderQuantity(e.target.value)}
                                        className="w-40 px-3 py-2 bg-gray-900 border border-gray-500 rounded-lg text-white text-lg font-bold focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                        placeholder="0"
                                    />
                                    <span className="text-gray-400 text-sm">{inventoryItem.unit}</span>
                                </div>
                                {data.needToOrder > 0 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Suggested: {data.needToOrder} {inventoryItem.unit} (to cover shortage)
                                    </p>
                                )}
                            </div>

                            {/* Demand Breakdown by Job */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 uppercase mb-2">Demand Breakdown</h3>
                                <div className="space-y-2">
                                    {Object.values(jobGroups).map((group) => (
                                        <div key={group.jobNumber} className="border border-gray-700 rounded-lg overflow-hidden">
                                            <div className="bg-gray-800 px-4 py-2.5 text-sm border-b border-gray-700">
                                                <span className="font-semibold text-white">{group.jobNumber}</span>
                                                <span className="text-gray-400 ml-2">{group.jobDescription}</span>
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-700/50 bg-gray-800/30">
                                                        <th className="text-left py-2 px-4 text-xs text-gray-400 font-medium">PBOM Item</th>
                                                        <th className="text-right py-2 px-4 text-xs text-gray-400 font-medium">Required</th>
                                                        <th className="text-right py-2 px-4 text-xs text-gray-400 font-medium">Allocated</th>
                                                        <th className="text-right py-2 px-4 text-xs text-gray-400 font-medium">Outstanding</th>
                                                        <th className="text-left py-2 px-4 text-xs text-gray-400 font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.map((item) => (
                                                        <tr key={item.id} className="border-b border-gray-800/50">
                                                            <td className="py-2 px-4 text-gray-200">{item.description}</td>
                                                            <td className="py-2 px-4 text-right text-gray-200">{item.qtyRequired}</td>
                                                            <td className="py-2 px-4 text-right text-blue-300">{item.qtyAllocated}</td>
                                                            <td className="py-2 px-4 text-right text-orange-400 font-medium">{item.qtyToOrder}</td>
                                                            <td className="py-2 px-4">
                                                                <span className="text-xs px-2 py-1 rounded-md bg-gray-700 text-gray-200 font-medium">
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                            <p className="text-gray-400">No outstanding demand for this item.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-5 border-t border-gray-600 bg-gray-800/50 rounded-b-xl">
                    <div className="text-sm text-gray-400">
                        {data && data.demandItems.length > 0 && (
                            <span>{data.demandItems.length} item{data.demandItems.length !== 1 ? 's' : ''} across {jobCount} job{jobCount !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => onConfirm(parsedQty)}
                            disabled={isConfirming || isLoading || !data?.demandItems.length || parsedQty <= 0}
                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700"
                        >
                            {isConfirming ? 'Ordering...' : `Order ${parsedQty > 0 ? parsedQty : 0} ${inventoryItem.unit}`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
