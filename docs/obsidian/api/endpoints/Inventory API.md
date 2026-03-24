# Inventory API

### `GET /api/inventory`
List all inventory items with computed fields (totalAllocated, availableQty, totalDemand).

### `POST /api/inventory`
**Body:** `{ partNumber?, description?, quantityOnHand?, unit?, reorderLevel?, reorderQuantity?, unitCost?, supplierName?, notes? }`

### `GET /api/inventory/:id`
Get inventory item detail.

### `PUT /api/inventory/:id`
Update inventory item.

### `DELETE /api/inventory/:id`
Delete inventory item.

### `GET /api/inventory/:id/demand-details`
Get per-job demand breakdown for an inventory item.

**Response:** `{ inventoryItem, demandItems[], totalDemand, needToOrder }`

Each demand item shows: jobId, jobNumber, description, qtyRequired, qtyAllocated, qtyToOrder, status.

---
See also: [[global_inventory]] · [[Supply Chain]] · [[pbom_items]]
