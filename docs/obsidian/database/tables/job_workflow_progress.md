# job_workflow_progress

Tracks each job's progress through the 4 workflow stages.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| stage_id | int FK | → [[workflow_stages]].id |
| status | varchar | Not Started, In Progress, Completed, Blocked |
| started_at | timestamp | |
| completed_at | timestamp | |
| assignee | varchar | |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[jobs]], [[workflow_stages]]

## Used By
- [[Workflow Engine]] — auto-advancement logic
- [[Jobs API]] — `GET/PUT /jobs/:id/workflow/:stageId`

## Key Behaviors
- One row per job per stage (4 rows per job)
- Auto-created when a job is created
- Auto-complete triggers check all related items
