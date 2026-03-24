# pbom_items

Production BOM — the purchasing/procurement side of the BOM. Managed by engineering, fulfilled by supply chain.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| description | varchar | |
| qty_required | int | |
| mfr_vendor | varchar | Manufacturer/vendor name |
| mfr_vendor_part | varchar | Vendor part number |
| category | varchar | |
| req_number | varchar | Requisition number |
| po_number | varchar | |
| notes | text | |
| status | varchar | Ready, In Progress, Ordered, Received |
| sent_to_sc | boolean | Sent to Supply Chain |
| global_inventory_id | int FK | → [[global_inventory]].id (auto-matched) |
| qty_allocated | int | Allocated from inventory |
| qty_ordered | int | Ordered externally |
| qty_received | int | Received from vendor |
| expected_receive_date | date | |
| purchase_order_id | int FK | → [[purchase_orders]].id |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[jobs]], [[global_inventory]] (optional), [[purchase_orders]] (optional)

## Used By
- [[Engineering]] — create PBOM, send to SC
- [[Supply Chain]] — order tracking, receive
- [[Purchase Orders API]] — auto-distribution

## Key Behaviors
- Auto-matches to [[global_inventory]] on create/import (by description, then part number)
- `sent_to_sc` flag controls visibility in Supply Chain view
- Qty fields track the full lifecycle: required → allocated → ordered → received
- When a PO is received, qty_received is auto-distributed in SC priority order
