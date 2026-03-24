# Workflow Engine

Jobs progress through 4 stages in order:

1. **Engineering** — Design and engineering sign-off
2. **WO Release** — Work order released to floor
3. **Materials** — BOM materials ordered, received, and issued
4. **Production** — Active manufacturing

## Stage Statuses
Each stage independently tracks: `Not Started` → `In Progress` → `Completed` (or `Blocked`)

## Auto-Advancement Rules

| Stage | Auto-completes when... |
|-------|----------------------|
| Engineering | All [[design_milestones]] for the job are Completed |
| WO Release | Manual only (no auto-trigger) |
| Materials | All sent-to-SC [[pbom_items]] are Received |
| Production | All [[tracked_parts]] for the job are Completed |

## Implementation

### Backend
- `autoCompleteStage(jobId, stageName)` — exported from `jobs.controller.ts`
- Called after milestone updates, PBOM receives, and part completions
- Updates [[job_workflow_progress]] status and sets `completed_at`

### Frontend
- Clickable stage dropdowns on JobDetail workflow progress bar
- `useUpdateWorkflowStage(jobId)` hook in `useJobs.ts`
- Visual: dots + connector lines (emerald=done, amber=in progress, gray=not started)

### UI Components
- JobDetail page shows horizontal progress bar with all 4 stages
- Each stage is a dropdown allowing manual status override
- Stage pages filter jobs by their workflow position:
  - Engineering page: jobs where Engineering stage is active
  - Supply Chain page: jobs in WO Release OR Materials
  - Production page: jobs in Production stage

## Related
- [[Jobs API]] — `PUT /jobs/:id/workflow/:stageId`
- [[job_workflow_progress]] — database table
- [[workflow_stages]] — stage definitions

---
*Tags:* #done
