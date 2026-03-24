# Feature Status

## Fully Implemented #done
- 4-stage workflow tracking with auto-advancement
- Job CRUD with auto-generated numbers (CAP-YYYY-XXX)
- Design milestones for engineering
- BOM management (job-level, import + manual)
- PBOM with auto-matching to inventory
- Global inventory with demand tracking
- Purchase order consolidation + auto-distribution
- Supply chain priority drag-drop reordering
- Material and labor tracking per job
- Client management with delete protection
- Supplier management
- Machine definitions
- Engineer team management
- Individual parts tracking (create, route, check-in/out)
- Route templates (reusable manufacturing sequences)
- Station kiosks with PIN authentication
- Scrap and recut tracking
- Work order file attachments
- PDF work order parsing (experimental)
- Toast notification system
- Dashboard with KPI metrics
- Professional dark theme (see [[Design System]])
- TypeScript strict mode throughout

## Partially Implemented #partial
- **Error handling** — basic try/catch in controllers, could be more comprehensive
- **Delete confirmations** — some modals have them, not universal
- **Advanced filtering** — client-side search works, but no date range filters
- **Input validation** — express-validator available but not consistently used

## Not Implemented #todo
- User authentication & authorization
- Multi-tenant support
- Email notifications
- Advanced reporting & analytics
- Production scheduling / capacity planning
- MRP (Material Requirements Planning)
- Accounting system integration
- Mobile app / responsive design
- Unit, integration, and E2E tests
- CI/CD pipeline
- Export functionality (CSV/Excel)

---
See also: [[Technical Debt]] · [[Roadmap]]
