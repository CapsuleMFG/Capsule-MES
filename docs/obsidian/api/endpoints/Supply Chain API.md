# Supply Chain API

## Mass Ordering

### `POST /api/pbom/orders/mass-order`
Create a single [[purchase_orders|purchase order]] from demand across multiple jobs.

**Side effects:**
- Creates one PO row in purchase_orders table
- Distributes qty to [[pbom_items]] by SC priority order
- Links pbom_items to the PO via purchase_order_id

## Priority Reordering

### `POST /api/supply-chain/priorities/update`
Update supply chain priority order for jobs (drag-drop reordering).

**Body:** `{ priorities: [{ jobId, priority }] }`

**Side effects:**
- Updates `sc_priority` on each job
- Triggers inventory reallocation based on new priority order

**Response:** `{ message, reallocationSummary: { inventoryItemsProcessed, pbomItemsReallocated } }`

## Suppliers

### `GET /api/suppliers`
### `POST /api/suppliers`
### `GET /api/suppliers/:id`
### `PUT /api/suppliers/:id`
### `DELETE /api/suppliers/:id`

Standard CRUD for [[suppliers]] table.

---
See also: [[Supply Chain]] · [[Purchase Orders API]] · [[Inventory API]]
