# work_orders

Manufacturing work orders for production floor.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| wo_number | varchar | Auto-generated |
| status | varchar | Draft, Released, Archived |
| description | text | |
| created_by | varchar | |
| released_date | date | |
| notes | text | |
| machine_type | varchar | |
| is_recut | boolean | Recut work order flag |
| production_status | varchar | Not Sent, In Pool, Assigned, In Progress, Completed, Discarded |
| production_priority | varchar | Independent priority for production |
| assigned_machine_id | int FK | → [[machines]].id |
| sent_to_production_at | timestamp | |
| assigned_at | timestamp | |
| production_started_at | timestamp | |
| production_completed_at | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[jobs]], [[machines]] (optional)
- Has many: [[tracked_parts]]

## Used By
- [[Production]] — work order management
- [[Production API]] — start/complete workflow
- [[Parts Tracking]] — parts linked to work orders
