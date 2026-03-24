# Production API

## Work Orders (Production View)

### `GET /api/production/work-orders`
List all work orders with production status info.

### `GET /api/production/work-orders/:id`
Get work order detail with assigned machine.

### `POST /api/production/work-orders/:id/start`
Start production on a work order. Sets production_started_at.

### `POST /api/production/work-orders/:id/complete`
Complete production. Sets production_completed_at.

## Machines

### `GET /api/machines`
### `POST /api/machines`
**Body:** `{ name, type?, active?, displayOrder?, notes? }`
### `GET /api/machines/:id`
### `PUT /api/machines/:id`
### `DELETE /api/machines/:id`

Standard CRUD for [[machines]] table.

---
See also: [[Production]] · [[work_orders]] · [[machines]]
