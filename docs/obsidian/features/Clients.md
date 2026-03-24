# Clients

Client (customer) management with CRUD operations and job association tracking.

## Features
- Create, read, update, delete clients
- Search/filter clients in real-time (client-side filtering)
- **Delete protection**: Cannot delete a client that has associated [[jobs]] (backend returns 400 with job count)
- Toast notifications for all CRUD operations

## Client Fields
| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | Company/customer name |
| Contact Name | No | Primary contact person |
| Email | No | |
| Phone | No | |
| Address | No | |

## Components
| Component | Purpose |
|-----------|---------|
| Clients.tsx (page) | Client list with search + CRUD |
| AddClientModal.tsx | Create new client |
| EditClientModal.tsx | Edit existing client |

## API
- [[Clients API]] — `GET/POST/PUT/DELETE /api/clients`

## Database
- [[clients]] table

---
*Tags:* #done
