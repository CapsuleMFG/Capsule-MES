# jobs

Central table for manufacturing jobs.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | Auto-increment |
| job_number | varchar | Unique, auto-generated (CAP-YYYY-XXX) |
| client_id | int FK | → [[clients]].id |
| priority | varchar | Critical, High, Medium, Low (nullable) |
| status | varchar | Active, On Hold, Completed, Cancelled |
| description | text | Job description |
| target_start_date | date | Planned start |
| target_end_date | date | Planned end |
| start_date | date | Actual start |
| completed_date | date | Actual completion |
| notes | text | |
| sc_priority | int | Supply chain drag-drop order (nullable) |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[clients]] (client_id)
- Has many: [[job_workflow_progress]], [[job_materials]], [[job_labor]], [[bom_items]], [[pbom_items]], [[work_orders]], [[design_milestones]], [[tracked_parts]]

## Used By
- [[Workflow Engine]] — progress tracking per stage
- [[Engineering]] — design milestones, BOM, PBOM
- [[Supply Chain]] — ordering, priority reordering
- [[Production]] — work orders, parts tracking
- [[Jobs API]] — CRUD endpoints

## Key Behaviors
- Job number auto-generated on create: `CAP-YYYY-XXX`
- `sc_priority` used for drag-drop reordering in Supply Chain view
- Deleting a job cascades to workflow progress, materials, labor
