# job_materials

Simple material tracking per job.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| material_name | varchar | |
| quantity | numeric | |
| unit | varchar | |
| status | varchar | Needed, Ordered, Received, Issued |
| cost | numeric | Optional unit cost |
| supplier | varchar | |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[jobs]]

## Used By
- [[Jobs API]] — materials sub-endpoints
- MaterialsTab component
