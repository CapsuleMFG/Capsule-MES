# Roadmap

Future work and enhancement ideas, roughly prioritized.

## High Priority
- [ ] **User authentication** — login, sessions, JWT or Supabase Auth
- [ ] **Role-based access** — admin, engineer, operator, supply chain roles
- [ ] **Input validation** — consistent server-side validation with express-validator
- [ ] **Pagination** — all list endpoints need cursor or offset pagination
- [ ] **Test foundation** — set up Vitest + React Testing Library, write core tests

## Medium Priority
- [ ] **Date range filtering** — filter jobs, orders, parts by date ranges
- [ ] **Export to CSV/Excel** — download job lists, BOM, inventory reports
- [ ] **Advanced analytics** — production throughput, lead time trends, bottleneck analysis
- [ ] **Delete confirmations** — universal confirmation dialog for all destructive actions
- [ ] **Error handling overhaul** — centralized error middleware, consistent API error format

## Lower Priority
- [ ] **Email notifications** — job status changes, PO received alerts
- [ ] **Production scheduling** — Gantt-style timeline, capacity planning
- [ ] **MRP engine** — automatic procurement suggestions based on BOM + inventory
- [ ] **Mobile responsive** — optimize kiosk pages for tablets/phones
- [ ] **API documentation** — OpenAPI/Swagger spec generation
- [ ] **CI/CD pipeline** — GitHub Actions for build, test, deploy
- [ ] **Accounting integration** — QuickBooks, Xero, or similar
- [ ] **Audit logging** — track who changed what and when

## Ideas (Backlog)
- [ ] Barcode/QR scanner integration for kiosk
- [ ] Real-time dashboard with WebSocket updates
- [ ] Multi-language support
- [ ] Dark/light theme toggle
- [ ] Bulk job import
- [ ] Custom workflow stage configuration
- [ ] Inter-job dependency tracking

---
See also: [[Feature Status]] · [[Technical Debt]]
