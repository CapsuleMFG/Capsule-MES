# Jobs API

## Jobs CRUD

### `GET /api/jobs`
List all jobs with optional filters.

**Query params:** `status`, `priority`, `search`

**Response:** Array of Job objects with `clientName` joined.

### `POST /api/jobs`
Create a new job. Auto-generates job number (CAP-YYYY-XXX).

**Body:** `{ jobNumber, clientId, description, targetStartDate?, targetEndDate?, notes?, engineerId? }`

**Side effects:** Creates 4 [[job_workflow_progress]] rows (one per stage).

### `GET /api/jobs/:id`
Get full job detail with workflow progress.

### `PUT /api/jobs/:id`
Update job fields. All fields optional except id.

**Body:** `{ clientId?, priority?, status?, description?, targetStartDate?, targetEndDate?, startDate?, completedDate?, notes? }`

### `DELETE /api/jobs/:id`
Delete job and cascade to workflow, materials, labor.

### `GET /api/jobs/analytics`
High-level job analytics for dashboard.

**Response:** `{ activeJobs, criticalJobs, materialIssues, totalLaborHours, recentJobs, inProgressJobs, notStartedJobs }`

## Workflow

### `GET /api/jobs/:id/workflow`
Get all 4 stage progress records for a job.

### `PUT /api/jobs/:id/workflow/:stageId`
Update a stage's status.

**Body:** `{ status, assignee?, notes? }`

**Status values:** Not Started, In Progress, Completed, Blocked

### `GET /api/workflow/stages`
Get all 4 workflow stage definitions.

## Materials

### `GET /api/jobs/:id/materials`
### `POST /api/jobs/:id/materials`
### `PUT /api/jobs/:id/materials/:materialId`
### `DELETE /api/jobs/:id/materials/:materialId`

Standard CRUD for simple [[job_materials]].

## Labor

### `GET /api/jobs/:id/labor`
### `POST /api/jobs/:id/labor`
**Body:** `{ stageId?, employeeName, hours, date, notes? }`
### `DELETE /api/jobs/:id/labor/:laborId`

## Dashboard

### `GET /api/dashboard/metrics`
Returns KPI metrics for the dashboard page.

---
See also: [[jobs]] · [[Workflow Engine]] · [[Hooks]]
