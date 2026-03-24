# bom_items

Bill of Materials at the job level. Defines what parts/materials a job needs.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| part_number | varchar | |
| description | text | |
| quantity | numeric | |
| unit | varchar | |
| material | varchar | Material type |
| thickness | varchar | |
| surface_area | numeric | |
| powdercoat | varchar | |
| route_template_id | int FK | → [[route_templates]].id (optional) |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[jobs]]
- References: [[route_templates]] (optional)
- Has many: [[tracked_parts]]

## Used By
- [[BOM Management]] — upload + manual entry
- [[Engineering]] — BOM review before production
- [[Parts Tracking]] — parts generated from BOM items

## Key Behaviors
- Job-level (not work-order-level — changed in migration 005)
- Can be imported from Excel/CSV or added manually
- No cost fields (removed in migration 008)
- Manufacturing fields added in migration 007
