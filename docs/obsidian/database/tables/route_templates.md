# route_templates

Reusable manufacturing route definitions (sequence of stations a part visits).

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar | Template name |
| description | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Related: route_template_steps
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| route_template_id | int FK | → route_templates.id |
| step_order | int | Sequence position |
| station_name | varchar | |
| machine_id | int FK | → [[machines]].id (optional) |
| estimated_minutes | int | |
| notes | text | |

## Relationships
- Has many: route_template_steps
- Referenced by: [[bom_items]], [[tracked_parts]]

## Used By
- [[Parts Tracking]] — defines the path parts follow
- Route Templates page — CRUD management
