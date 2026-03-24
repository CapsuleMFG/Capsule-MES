# global_inventory

Global parts/materials inventory shared across all jobs.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| part_number | varchar | Optional (migration 022) |
| description | text | |
| quantity_on_hand | int | Current stock |
| unit | varchar | |
| reorder_level | int | |
| reorder_quantity | int | |
| unit_cost | numeric | |
| supplier_name | varchar | |
| last_restock_date | date | Updated on PO receive |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Computed Fields (in queries)
- `total_allocated` — sum of qty_allocated from linked PBOM items
- `available_qty` — quantity_on_hand - total_allocated
- `total_demand` — sum of qty_required from linked PBOM items

## Relationships
- Has many: [[pbom_items]] (via global_inventory_id)
- Referenced by: [[purchase_orders]] (optional)

## Used By
- [[Supply Chain]] — inventory management
- [[Inventory API]] — CRUD + demand details
- PBOM auto-matching

## Key Behaviors
- Part number is optional (some items identified by description only)
- Receiving a PO increases quantity_on_hand and sets last_restock_date
- Demand details endpoint shows per-job breakdown
