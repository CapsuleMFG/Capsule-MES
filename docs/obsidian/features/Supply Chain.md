# Supply Chain

Manages procurement, ordering, inventory, and receiving. Combines the WO Release and Materials stages into a single view.

## Core Workflows

### 1. PBOM Fulfillment
1. Engineering sends PBOM items to SC (sets `sent_to_sc = true`)
2. SC views items grouped by job, sorted by SC priority
3. Items auto-match to [[global_inventory]] (or can be manually linked)
4. SC creates purchase orders for items that need ordering

### 2. Mass Ordering
1. Select an inventory item with demand across multiple jobs
2. "Mass Order" creates a single [[purchase_orders|PO]] consolidating all demand
3. PO links back to individual [[pbom_items]] via `purchase_order_id`
4. Qty distributed to PBOM items in SC priority order

### 3. Receiving
1. Select a PO → enter qty received
2. System auto-distributes to linked PBOM items (SC priority order)
3. [[global_inventory]] quantity_on_hand updated
4. PO status transitions: Ordered → Partial → Received
5. When all sent-to-SC PBOM items are Received → Materials stage auto-completes

### 4. Priority Reordering
- Drag-and-drop job cards to reorder SC priority
- Triggers inventory reallocation based on new priority
- Higher priority jobs get inventory allocated first

## Inventory Management
- Global inventory with part number, description, qty on hand, reorder levels
- Demand details: per-job breakdown of who needs what
- Computed fields: total_allocated, available_qty, total_demand

## Key Components
| Component | Purpose |
|-----------|---------|
| PbomTableSupplyChain.tsx | PBOM display for SC view |
| EditPbomItemModalSupplyChain.tsx | SC-specific PBOM editing |
| GlobalInventoryPanel.tsx | View all inventory items |
| OrderTrackingPanel.tsx | Track POs, expandable multi-job rows |
| MassOrderModal.tsx | Create bulk PO from demand |
| EditOrderModal.tsx | Update PO fields |
| ReceiveOrderModal.tsx | Receive PO with distribution breakdown |
| SortableJobCard.tsx | Draggable job card (React DnD) |
| AddInventoryModal.tsx | Add inventory item |
| EditInventoryModal.tsx | Edit inventory item |

## API Endpoints
- [[Supply Chain API]] — mass order, priority reordering, suppliers
- [[Purchase Orders API]] — PO tracking and receiving
- [[Inventory API]] — inventory CRUD + demand details

## Database Tables
- [[pbom_items]] · [[global_inventory]] · [[purchase_orders]] · [[suppliers]]

---
*Tags:* #done
