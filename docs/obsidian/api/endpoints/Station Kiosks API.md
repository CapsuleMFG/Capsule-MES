# Station Kiosks API

### `GET /api/station-kiosks`
List all station kiosks.

### `POST /api/station-kiosks/auth`
Authenticate with PIN code.

**Body:** `{ pinCode }`

**Response:** `{ stationName, kioskId }`

### `GET /api/station-kiosks/queue/:kioskId`
Get parts currently in queue at a station.

**Response:** Array of StationQueuePart (extends TrackedPart with queueStatus, checkedInAt, operatorName, timeElapsedMinutes).

### `POST /api/station-kiosks/:kioskId/queue`
Add a part to the station queue.

### `DELETE /api/station-kiosks/:kioskId/queue/:id`
Remove part from queue.

---
See also: [[station_kiosks]] · [[Parts Tracking]] · [[tracked_parts]]
