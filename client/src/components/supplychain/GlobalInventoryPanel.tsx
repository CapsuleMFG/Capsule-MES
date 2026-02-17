import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as inventoryService from '../../services/inventory.service';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import AddInventoryModal from './AddInventoryModal';
import EditInventoryModal from './EditInventoryModal';
import MassOrderModal from './MassOrderModal';
import { Plus, Edit, Trash2, Package, AlertTriangle, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import type { GlobalInventory } from '../../types';

export default function GlobalInventoryPanel() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<GlobalInventory | null>(null);
    const [massOrderItem, setMassOrderItem] = useState<GlobalInventory | null>(null);

    const { data: inventory, isLoading } = useQuery({
        queryKey: ['inventory'],
        queryFn: () => inventoryService.getInventoryItems(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => inventoryService.deleteInventoryItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Inventory item deleted successfully!');
        },
        onError: () => {
            toast.error('Failed to delete inventory item.');
        },
    });

    const massOrderMutation = useMutation({
        mutationFn: ({ id, orderQuantity }: { id: number; orderQuantity: number }) => inventoryService.massOrder(id, orderQuantity),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventoryAvailable'] });
            queryClient.invalidateQueries({ queryKey: ['pbomItems'] });
            queryClient.invalidateQueries({ queryKey: ['pbom-orders'] });
            toast.success(`Mass order complete: ${data.updatedCount} items ordered (${data.totalOrdered} units)`);
            setMassOrderItem(null);
        },
        onError: () => {
            toast.error('Failed to process mass order.');
        },
    });

    // Filter inventory by search
    const filtered = inventory?.filter((item) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (item.partNumber || '').toLowerCase().includes(q) ||
            (item.description || '').toLowerCase().includes(q) ||
            (item.supplierName || '').toLowerCase().includes(q)
        );
    });

    // Calculate metrics
    const totalItems = inventory?.length || 0;
    const lowStockItems = inventory?.filter(
        (item) => item.reorderLevel != null && item.quantityOnHand <= item.reorderLevel
    ) || [];
    const lowStockCount = lowStockItems.length;
    const totalValue = inventory?.reduce(
        (sum, item) => sum + (item.unitCost || 0) * item.quantityOnHand, 0
    ) || 0;
    const totalDemand = inventory?.reduce(
        (sum, item) => sum + (item.totalDemand || 0), 0
    ) || 0;

    const isLowStock = (item: GlobalInventory) =>
        item.reorderLevel != null && item.quantityOnHand <= item.reorderLevel;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Package className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total Items</p>
                            <p className="text-2xl font-bold text-white">{totalItems}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${lowStockCount > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
                            <AlertTriangle className={`w-6 h-6 ${lowStockCount > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Low Stock</p>
                            <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                                {lowStockCount}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total Value</p>
                            <p className="text-2xl font-bold text-white">${totalValue.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${totalDemand > 0 ? 'bg-orange-500/10' : 'bg-gray-500/10'}`}>
                            <TrendingUp className={`w-6 h-6 ${totalDemand > 0 ? 'text-orange-500' : 'text-gray-500'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total Demand</p>
                            <p className={`text-2xl font-bold ${totalDemand > 0 ? 'text-orange-400' : 'text-white'}`}>
                                {totalDemand}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search + Add Button */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by part number, description, or supplier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Inventory Item
                </Button>
            </div>

            {/* Inventory Table */}
            {filtered && filtered.length > 0 ? (
                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Part Number</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Description</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">On Hand</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase bg-blue-500/5">Allocated</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase bg-green-500/5">Available</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase bg-orange-500/5">Demand</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase bg-red-500/5">Need to Order</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Unit</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">Unit Cost</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-400 uppercase">Reorder Lvl</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase">Supplier</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`border-b border-gray-800 hover:bg-rivian-hover ${
                                            isLowStock(item) ? 'bg-amber-500/5' : ''
                                        }`}
                                    >
                                        <td className="py-3 px-4 font-medium text-white">
                                            <div className="flex items-center gap-2">
                                                {isLowStock(item) && (
                                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                                )}
                                                {item.partNumber}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-300">{item.description || '-'}</td>
                                        <td className={`py-3 px-4 text-right ${isLowStock(item) ? 'text-amber-400 font-semibold' : 'text-white'}`}>
                                            {item.quantityOnHand}
                                        </td>
                                        <td className="py-3 px-4 text-right text-blue-300 bg-blue-500/5">
                                            {item.totalAllocated || 0}
                                        </td>
                                        <td className="py-3 px-4 text-right text-green-300 font-medium bg-green-500/5">
                                            {item.availableQty ?? item.quantityOnHand}
                                        </td>
                                        <td className={`py-3 px-4 text-right font-medium bg-orange-500/5 ${
                                            (item.totalDemand || 0) > 0 ? 'text-orange-400' : 'text-gray-500'
                                        }`}>
                                            {item.totalDemand || 0}
                                        </td>
                                        {(() => {
                                            const needToOrder = Math.max(0, (item.totalDemand || 0) - (item.availableQty ?? item.quantityOnHand));
                                            return (
                                                <td className={`py-3 px-4 text-right font-medium bg-red-500/5 ${
                                                    needToOrder > 0 ? 'text-red-400' : 'text-gray-500'
                                                }`}>
                                                    {needToOrder}
                                                </td>
                                            );
                                        })()}
                                        <td className="py-3 px-4 text-gray-300">{item.unit}</td>
                                        <td className="py-3 px-4 text-right text-gray-300">
                                            {item.unitCost != null ? `$${item.unitCost.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-300">
                                            {item.reorderLevel != null ? item.reorderLevel : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-300">{item.supplierName || '-'}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-1 justify-center">
                                                {(item.totalDemand || 0) > 0 && (
                                                    <button
                                                        onClick={() => setMassOrderItem(item)}
                                                        className="p-1.5 text-orange-400 hover:text-orange-300 transition-colors"
                                                        title="Mass Order"
                                                    >
                                                        <ShoppingCart className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setEditingItem(item)}
                                                    className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Delete this inventory item?')) {
                                                            deleteMutation.mutate(item.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="text-center py-12 bg-rivian-soft-black rounded-lg">
                    <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-lg">No inventory items</p>
                    <p className="text-gray-500 text-sm mt-2">
                        {search
                            ? 'Try adjusting your search'
                            : 'Add your first inventory item to get started'}
                    </p>
                </div>
            )}

            <AddInventoryModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <EditInventoryModal
                item={editingItem}
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
            />

            {massOrderItem && (
                <MassOrderModal
                    inventoryItem={massOrderItem}
                    isOpen={!!massOrderItem}
                    onClose={() => setMassOrderItem(null)}
                    onConfirm={(orderQuantity: number) => massOrderMutation.mutate({ id: massOrderItem.id, orderQuantity })}
                    isConfirming={massOrderMutation.isPending}
                />
            )}
        </div>
    );
}
