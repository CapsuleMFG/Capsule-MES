# clients

Customer master data.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar | Required |
| contact_name | varchar | |
| email | varchar | |
| phone | varchar | |
| address | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Has many: [[jobs]]

## Used By
- [[Clients]] feature — CRUD management
- [[Clients API]] — endpoints
- Job creation (client selection)

## Key Behaviors
- Cannot delete a client that has associated jobs (returns 400 with job count)
