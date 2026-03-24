# tracked_parts

Individual part tracking through manufacturing route.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| bom_item_id | int FK | → [[bom_items]].id (optional) |
| work_order_id | int FK | → [[work_orders]].id (optional) |
| tracking_id | varchar | QR/barcode identifier |
| identification_type | varchar | QR, Engraved, Sticker, Other |
| route_template_id | int FK | → [[route_templates]].id (optional) |
| current_step_id | int FK | Current step in route |
| status | varchar | Pending, In Progress, Completed, Scrapped, On Hold |
| part_number | varchar | |
| description | text | |
| serial_number | int | |
| scrap_reason | text | |
| scrapped_at | timestamp | |
| recut_from_id | int FK | Self-reference for recuts |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[jobs]], [[bom_items]], [[work_orders]], [[route_templates]]
- Has many: part_station_logs
- Self-references: recut_from_id → tracked_parts.id

## Used By
- [[Parts Tracking]] — full lifecycle tracking
- [[Parts Tracking API]] — CRUD + check-in/out
- [[Production]] — auto-complete when all parts done

## Key Behaviors
- Bulk creation from BOM items via GeneratePartsModal
- Station check-in/out records operator time per step
- Scrap creates a record with reason; recut links to original part
- Auto-completes Production stage when all parts are Completed
