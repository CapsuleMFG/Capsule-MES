# job_labor

Labor hour entries per job, optionally linked to a workflow stage.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| stage_id | int FK | → [[workflow_stages]].id (optional) |
| employee_name | varchar | |
| hours | numeric | |
| date | date | |
| notes | text | |
| created_at | timestamp | |

## Relationships
- Belongs to: [[jobs]], [[workflow_stages]] (optional)

## Used By
- [[Jobs API]] — labor sub-endpoints
- ProductionTab component
- Dashboard metrics (total labor hours)

## Key Behaviors
- Stage selection is optional ("Not specified" default)
- Helps track time spent per workflow stage
