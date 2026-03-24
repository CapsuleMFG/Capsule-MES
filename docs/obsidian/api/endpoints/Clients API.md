# Clients API

### `GET /api/clients`
List all clients.

### `POST /api/clients`
**Body:** `{ name, contactName?, email?, phone?, address? }`

### `GET /api/clients/:id`
Get client detail.

### `PUT /api/clients/:id`
Update client fields.

### `DELETE /api/clients/:id`
Delete client. **Returns 400 if client has associated jobs** (includes job count in error message).

---
See also: [[clients]] · [[Clients]]
