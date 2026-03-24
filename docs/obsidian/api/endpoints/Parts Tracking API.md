# Parts Tracking API

## Tracked Parts

### `GET /api/jobs/:jobId/tracked-parts`
List tracked parts for a job.

### `POST /api/jobs/:jobId/tracked-parts`
Create single tracked part.

**Body:** `{ bomItemId?, workOrderId?, trackingId?, identificationType?, routeTemplateId?, partNumber?, description?, serialNumber?, notes? }`

### `POST /api/jobs/:jobId/tracked-parts/bulk`
Bulk create parts from a BOM item.

**Body:** `{ bomItemId?, workOrderId?, quantity, routeTemplateId?, identificationType?, trackingIdPrefix?, partNumber?, description?, recutFromIds? }`

### `GET /api/tracked-parts/:id`
Get part detail with station logs.

### `PUT /api/tracked-parts/:id`
Update part (status, tracking info, scrap).

### `DELETE /api/tracked-parts/:id`
Delete tracked part.

### `POST /api/tracked-parts/:id/station-log/checkin`
Check in part at current station.

**Body:** `{ operatorName, notes? }`

**Side effects:** Creates part_station_log entry, updates part status to In Progress.

### Check-out
Handled via station kiosk queue endpoints.

**Body:** `{ operatorName?, qualityStatus, notes?, timeSpentMinutes? }`

## Route Templates

### `GET /api/route-templates`
### `POST /api/route-templates`
**Body:** `{ name, description?, steps?[] }`
### `GET /api/route-templates/:id`
Returns template with all steps.
### `PUT /api/route-templates/:id`
### `DELETE /api/route-templates/:id`
### `POST /api/route-templates/:id/steps`
Add step to template.

---
See also: [[Parts Tracking]] · [[tracked_parts]] · [[route_templates]]
