# purchase_orders

Consolidated purchase orders for multi-job ordering.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| po_number | varchar | |
| inventory_id | int FK | → [[global_inventory]].id (optional) |
| description | varchar | |
| qty_ordered | int | |
| qty_received | int | |
| status | varchar | Ordered, Partial, Received |
| expected_receive_date | date | |
| vendor | varchar | |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- References: [[global_inventory]] (optional)
- Has many: [[pbom_items]] (via purchase_order_id)

## Used By
- [[Supply Chain]] — PO tracking and receiving
- [[Purchase Orders API]] — CRUD + receive

## Key Behaviors
- One PO per mass order (consolidates across jobs)
- Receiving distributes qty to linked [[pbom_items]] in SC priority order
- Status auto-updates: Ordered → Partial → Received
- Created in migration 026
