# API Overview

Base URL: `http://localhost:3001/api`

All endpoints return JSON. Error responses include `{ error: string }`.

## Endpoints by Domain

### Core
| Resource | Endpoints | Details |
|----------|-----------|---------|
| Jobs | GET, POST, GET/:id, PUT/:id, DELETE/:id | [[Jobs API]] |
| Clients | GET, POST, GET/:id, PUT/:id, DELETE/:id | [[Clients API]] |
| Dashboard | GET /metrics | [[Jobs API]] |
| Workflow | GET /stages | [[Jobs API]] |

### Engineering
| Resource | Endpoints | Details |
|----------|-----------|---------|
| BOM | GET, POST, PUT/:id, DELETE/:id, POST/import | [[Engineering API]] |
| PBOM | GET, POST, PUT/:id, POST/send-to-sc, POST/auto-match, POST/import | [[Engineering API]] |
| Design Milestones | GET, POST, PUT/:id, DELETE/:id | [[Engineering API]] |
| Engineers | GET, POST, PUT/:id | [[Engineering API]] |
| Work Orders | GET, POST, PUT/:id | [[Engineering API]] |

### Supply Chain
| Resource | Endpoints | Details |
|----------|-----------|---------|
| Inventory | GET, POST, GET/:id, PUT/:id, DELETE/:id, GET/:id/demand-details | [[Inventory API]] |
| Purchase Orders | GET, PUT/:id, POST/:id/receive | [[Purchase Orders API]] |
| Mass Order | POST /mass-order | [[Supply Chain API]] |
| SC Priorities | POST /priorities/update | [[Supply Chain API]] |

### Production & Parts
| Resource | Endpoints | Details |
|----------|-----------|---------|
| Production Work Orders | GET, GET/:id, POST/:id/start, POST/:id/complete | [[Production API]] |
| Tracked Parts | GET, POST, GET/:id, PUT/:id, DELETE/:id, POST/bulk, POST/:id/checkin | [[Parts Tracking API]] |
| Route Templates | GET, POST, GET/:id, PUT/:id, DELETE/:id, POST/:id/steps | [[Parts Tracking API]] |
| Station Kiosks | GET, POST/auth, GET/queue/:id, POST/:id/queue | [[Station Kiosks API]] |
| Machines | GET, POST, GET/:id, PUT/:id, DELETE/:id | [[Production API]] |
| Suppliers | GET, POST, GET/:id, PUT/:id, DELETE/:id | [[Supply Chain API]] |

## Common Patterns
- All list endpoints support basic filtering via query params
- Create endpoints return the new resource with `id`
- Update endpoints accept partial objects (only changed fields)
- Delete endpoints return 204 on success
- Nested resources use job-scoped paths: `/api/jobs/:jobId/bom`, `/api/jobs/:jobId/pbom`

---
See also: [[Data Flow]] · [[Services]]
