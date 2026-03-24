# Purchase Orders API

### `GET /api/purchase-orders`
List all purchase orders with linked job breakdown.

**Response:** Array of PurchaseOrder objects, each with `linkedJobs[]` showing per-job PBOM allocations.

### `PUT /api/purchase-orders/:id`
Update PO fields.

**Body:** `{ poNumber?, expectedReceiveDate?, vendor?, notes? }`

### `POST /api/purchase-orders/:id/receive`
Receive quantity against a PO.

**Body:** `{ qtyReceived }`

**Side effects:**
1. Updates PO qty_received and status (Ordered → Partial → Received)
2. Auto-distributes received units to linked [[pbom_items]] in SC priority order
3. Updates [[global_inventory]] quantity_on_hand and last_restock_date

---
See also: [[purchase_orders]] · [[Supply Chain]] · [[pbom_items]]
