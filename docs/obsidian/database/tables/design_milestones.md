# design_milestones

Engineering design checkpoints for a job.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| job_id | int FK | → [[jobs]].id |
| milestone_name | varchar | |
| status | varchar | Not Started, In Progress, Completed |
| target_date | date | Added in migration 021 |
| completed_date | date | |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Belongs to: [[jobs]]

## Used By
- [[Engineering]] — design milestone tracking
- [[Workflow Engine]] — auto-completes Engineering stage when all milestones are Completed

## Key Behaviors
- When ALL milestones for a job are Completed, Engineering stage auto-completes
