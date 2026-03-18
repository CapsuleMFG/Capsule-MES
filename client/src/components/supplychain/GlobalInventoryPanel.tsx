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
import { Plus, PencilSimple, Trash, Package, Warning, ShoppingCart } from '@phosphor-icons/react';
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
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Items</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">{totalItems}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Low Stock</p>
                    <p className={`text-xl font-semibold mt-1 ${lowStockCount > 0 ? 'text-amber-500' : 'text-gray-900'}`}>
                        {lowStockCount}
                    </p>
                </Card>

                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Value</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">${totalValue.toFixed(2)}</p>
                </Card>

                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Demand</p>
                    <p className={`text-xl font-semibold mt-1 ${totalDemand > 0 ? 'text-amber-500' : 'text-gray-900'}`}>
                        {totalDemand}
                    </p>
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
                    <Plus size={16} className="mr-2" />
                    Add Inventory Item
                </Button>
            </div>

            {/* Inventory Table */}
            {filtered && filtered.length > 0 ? (
                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Part Number</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Description</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">On Hand</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400 bg-gray-50">Allocated</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400 bg-gray-50">Available</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400 bg-gray-50">Demand</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400 bg-gray-50">Need to Order</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Unit</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Unit Cost</th>
                                    <th className="text-right py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Reorder Lvl</th>
                                    <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Supplier</th>
                                    <th className="text-center py-3 px-4 text-[11px] uppercase tracking-wider font-medium text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={`border-b border-gray-50 hover:bg-gray-50 text-sm text-gray-600 ${
                                            isLowStock(item) ? 'bg-amber-50' : ''
                                        }`}
                                    >
                                        <td className="py-3 px-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                {isLowStock(item) && (
                                                    <Warning size={16} className="text-amber-500 flex-shrink-0" />
                                                )}
                                                {item.partNumber}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{item.description || '-'}</td>
                                        <td className={`py-3 px-4 text-right ${isLowStock(item) ? 'text-amber-500 font-semibold' : 'text-gray-900'}`}>
                                            {item.quantityOnHand}
                                        </td>
                                        <td className="py-3 px-4 text-right text-blue-500 bg-gray-50">
                                            {item.totalAllocated || 0}
                                        </td>
                                        <td className="py-3 px-4 text-right text-emerald-600 font-medium bg-gray-50">
                                            {item.availableQty ?? item.quantityOnHand}
                                        </td>
                                        <td className={`py-3 px-4 text-right font-medium bg-gray-50 ${
                                            (item.totalDemand || 0) > 0 ? 'text-orange-500' : 'text-gray-400'
                                        }`}>
                                            {item.totalDemand || 0}
                                        </td>
                                        {(() => {
                                            const needToOrder = Math.max(0, (item.totalDemand || 0) - (item.availableQty ?? item.quantityOnHand));
                                            return (
                                                <td className={`py-3 px-4 text-right font-medium bg-gray-50 ${
                                                    needToOrder > 0 ? 'text-red-500' : 'text-gray-400'
                                                }`}>
                                                    {needToOrder}
                                                </td>
                                            );
                                        })()}
                                        <td className="py-3 px-4 text-gray-600">{item.unit}</td>
                                        <td className="py-3 px-4 text-right text-gray-600">
                                            {item.unitCost != null ? `$${item.unitCost.toFixed(2)}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600">
                                            {item.reorderLevel != null ? item.reorderLevel : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{item.supplierName || '-'}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-1 justify-center">
                                                {(item.totalDemand || 0) > 0 && (
                                                    <button
                                                        onClick={() => setMassOrderItem(item)}
                                                        className="p-1.5 text-orange-500 hover:text-orange-600 transition-colors"
                                                        title="Mass Order"
                                                    >
                                                        <ShoppingCart size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setEditingItem(item)}
                                                    className="p-1.5 text-blue-500 hover:text-blue-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilSimple size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Delete this inventory item?')) {
                                                            deleteMutation.mutate(item.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-red-500 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash size={16} />
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
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Package size={48} className="text-gray-400 mx-auto mb-3" />
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
