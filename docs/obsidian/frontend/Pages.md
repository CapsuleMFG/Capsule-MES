# Pages

12 route-level page components in `client/src/pages/`.

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard.tsx | `/` | KPI metrics (active jobs, critical, material issues, labor hours) + recent jobs table |
| Jobs.tsx | `/jobs` | Job list with search/filter by status and priority, create job button |
| JobDetail.tsx | `/jobs/:id` | Full job detail with tabs: Overview, Engineering, Materials, Production, Labor. Workflow progress bar with clickable stage dropdowns |
| Clients.tsx | `/clients` | Client list with search, CRUD operations |
| Engineering.tsx | `/engineering` | Engineering stage view — design milestones, PBOM, work orders |
| SupplyChain.tsx | `/supply-chain` | WO Release + Materials stages — PBOM fulfillment, ordering, inventory |
| Production.tsx | `/production` | Production stage — work order management, machine assignment |
| PartsTracking.tsx | `/parts-tracking` | Part tracking overview, station logs |
| PartDetail.tsx | `/parts/:id` | Single tracked part detail with station history timeline |
| RouteTemplates.tsx | `/route-templates` | Create/manage manufacturing route templates |
| StationKiosks.tsx | `/station-kiosks` | Configure shop floor kiosk stations |

### Kiosk Pages (operator-facing)
| Page | Route | Purpose |
|------|-------|---------|
| StationLogin.tsx | `/kiosk/login` | PIN-based station authentication |
| StationDashboard.tsx | `/kiosk/dashboard` | Operator's part queue with check-in/out |
| MachineSelect.tsx | `/kiosk/machine` | Machine selection for kiosk |

## Routing
- React Router v6 with nested routes
- AppLayout wraps all main pages (sidebar + content)
- Kiosk pages use their own layout (no sidebar)

## Page Patterns
- Pages use custom hooks for data fetching (e.g., `useJobs()`, `useClients()`)
- Filter/search state managed locally with `useState`
- Modal-driven create/edit operations
- Card-based layouts for job lists
- Tab interfaces for detail views (JobDetail)

---
See also: [[Components]] · [[Hooks]] · [[Services]]
