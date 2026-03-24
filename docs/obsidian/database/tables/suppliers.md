# suppliers

Vendor master data.

## Columns
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar | |
| contact_name | varchar | |
| email | varchar | |
| phone | varchar | |
| address | text | |
| payment_terms | varchar | |
| lead_time_days | int | |
| created_at | timestamp | |
| updated_at | timestamp | |

## Used By
- [[Supply Chain]] — vendor management
- Supplier CRUD endpoints
