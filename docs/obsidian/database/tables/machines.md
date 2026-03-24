# machines

Manufacturing equipment definitions.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar | |
| type | varchar | Machine type/category |
| active | boolean | |
| display_order | int | |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Relationships
- Referenced by: [[work_orders]], [[station_kiosks]], route_template_steps

## Used By
- [[Production]] — machine assignment for work orders
- [[Parts Tracking]] — station/machine association
- Machine CRUD endpoints
