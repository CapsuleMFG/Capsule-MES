# station_kiosks

Shop floor station definitions for operator check-in/out.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| station_name | varchar | |
| pin_code | varchar | 4-digit PIN for auth |
| machine_id | int FK | → [[machines]].id (optional) |
| is_active | boolean | |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- References: [[machines]] (optional)

## Used By
- [[Parts Tracking]] — operator check-in/out at stations
- [[Station Kiosks API]] — auth + queue management
- Kiosk pages (StationLogin, StationDashboard, MachineSelect)

## Key Behaviors
- PIN authentication for shop floor operators
- Shows queue of parts waiting at the station
- Operators check in/out parts, recording time and quality
