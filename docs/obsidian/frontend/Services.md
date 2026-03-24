# Services

Axios-based API service layer in `client/src/services/`. Each service maps to a backend domain.

## api.ts (Base Configuration)
- Creates Axios instance with `baseURL` from `VITE_API_URL` env var
- Default: `http://localhost:3001/api`
- All other services import this instance

## Service Modules

| Service | File | Covers |
|---------|------|--------|
| Jobs | jobs.service.ts | Job CRUD, workflow, materials, labor, analytics |
| Engineering | engineering.service.ts | Design milestones, PBOM, auto-match, send to SC, mass order |
| Inventory | inventory.service.ts | Global inventory CRUD, demand details, allocation |
| Production | production.service.ts | Work order management, production status, machine assignment |
| Parts Tracking | parts-tracking.service.ts | Tracked parts, station logs, bulk creation, scrap/recut |
| Supply Chain | supplychain.service.ts | PO tracking, SC priority reordering |
| Purchase Orders | purchase-orders.service.ts | PO CRUD, receive/allocation |
| Engineers | engineers.service.ts | Engineer management |
| Suppliers | suppliers.service.ts | Supplier CRUD |

## Patterns
- Each service exports an object with methods (e.g., `jobsService.getJobs()`)
- Methods return `axios.get/post/put/delete` promises
- Request bodies match the `Create*Request` / `Update*Request` types from `shared/types`
- File uploads use `FormData` with `multipart/form-data` content type
- No error transformation — errors bubble to React Query's `onError`

---
See also: [[Hooks]] · [[Data Flow]] · [[API Overview]]
