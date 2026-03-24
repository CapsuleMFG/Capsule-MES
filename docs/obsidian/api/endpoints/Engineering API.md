# Engineering API

## BOM (Bill of Materials)

All scoped to a job: `/api/jobs/:jobId/bom`

### `GET /api/jobs/:jobId/bom`
Get all BOM items for a job.

### `POST /api/jobs/:jobId/bom`
Add single BOM item.

**Body:** `{ partNumber, description?, quantity, unit?, material?, thickness?, surfaceArea?, powdercoat?, routeTemplateId?, notes? }`

### `PUT /api/jobs/:jobId/bom/:bomId`
Update BOM item.

### `DELETE /api/jobs/:jobId/bom/:bomId`
Delete BOM item.

### `POST /api/jobs/:jobId/bom/import`
Import BOM from Excel/CSV file upload (multipart form data).

**Returns:** `{ message, itemsImported, items[] }`

## PBOM (Production BOM)

All scoped to a job: `/api/jobs/:jobId/pbom`

### `GET /api/jobs/:jobId/pbom`
Get all PBOM items for a job.

### `POST /api/jobs/:jobId/pbom`
Add single PBOM item. **Auto-matches to [[global_inventory]].**

**Body:** `{ description, qtyRequired, mfrVendor?, mfrVendorPart?, category?, reqNumber?, poNumber?, notes?, status? }`

### `PUT /api/jobs/:jobId/pbom/:pbomId`
Update PBOM item.

### `POST /api/jobs/:jobId/pbom/send-to-sc`
Send selected PBOM items to Supply Chain. Sets `sent_to_sc = true`.

### `POST /api/jobs/:jobId/pbom/auto-match`
Re-run auto-matching for all unlinked PBOM items against [[global_inventory]].

**Matching priority:** 1) Description match (case-insensitive) 2) Part number match

### `POST /api/jobs/:jobId/pbom/import`
Import PBOM from Excel/CSV. Auto-matches imported items.

## Design Milestones

Scoped to a job: `/api/jobs/:jobId/engineering`

### `GET /api/jobs/:jobId/engineering/milestones`
### `POST /api/jobs/:jobId/engineering/milestones`
**Body:** `{ milestoneName, targetDate? }`
### `PUT /api/jobs/:jobId/engineering/milestones/:id`
**Body:** `{ milestoneName?, status?, targetDate?, completedDate?, notes? }`

**Auto-advancement:** When all milestones are Completed, Engineering stage auto-completes.

### `DELETE /api/jobs/:jobId/engineering/milestones/:id`

## Engineers

### `GET /api/engineers`
### `POST /api/engineers`
**Body:** `{ name, email? }`
### `PUT /api/engineers/:id`

## Work Orders

### `GET /api/jobs/:jobId/work-orders`
### `POST /api/jobs/:jobId/work-orders`
**Body:** `{ description?, createdBy?, notes?, isRecut? }`
### `PUT /api/jobs/:jobId/work-orders/:id`

---
See also: [[Engineering]] · [[bom_items]] · [[pbom_items]] · [[design_milestones]]
