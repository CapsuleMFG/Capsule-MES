# workflow_stages

Defines the 4-stage manufacturing workflow.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar | Engineering, WO Release, Materials, Production |
| display_order | int | 1–4 |
| color | varchar | Stage color code |
| created_at | timestamp | |

## Seed Data
| id | name | display_order |
|----|------|---------------|
| 1 | Engineering | 1 |
| 2 | WO Release | 2 |
| 3 | Materials | 3 |
| 4 | Production | 4 |

## Relationships
- Has many: [[job_workflow_progress]], [[job_labor]]

## Used By
- [[Workflow Engine]] — stage definitions
- Labor tracking — associate hours with stages
