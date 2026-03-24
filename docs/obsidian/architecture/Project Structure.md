# Project Structure

```
capsule-erp/
├── client/                           # React 18 + Vite frontend (port 5173)
│   └── src/
│       ├── components/               # 55 TSX components
│       │   ├── ui/                   # 9 base UI primitives (Button, Card, Input, Modal, etc.)
│       │   ├── layout/               # AppLayout wrapper + sidebar
│       │   ├── jobs/                 # Job cards, modals, detail tabs
│       │   │   └── tabs/             # OverviewTab, MaterialsTab, ProductionTab
│       │   ├── engineering/          # PBOM, design milestones, work orders
│       │   ├── supplychain/          # Orders, inventory, PO tracking
│       │   ├── parts-tracking/       # Route templates, station check-in/out
│       │   ├── kiosk/                # Station kiosk screens
│       │   ├── clients/              # Client CRUD modals
│       │   └── production/           # Production dashboard
│       ├── pages/                    # 12 route-level page components
│       ├── hooks/                    # React Query custom hooks
│       ├── services/                 # Axios API service layer (10 modules)
│       ├── contexts/                 # ToastContext, KioskContext
│       ├── types/                    # Re-exports from shared/types
│       ├── index.css                 # Tailwind directives
│       └── main.tsx                  # App entry point
│
├── server/                           # Express backend (port 3001)
│   └── src/
│       ├── controllers/              # 24 request handlers (~6,600 lines)
│       ├── routes/                   # 21 route files
│       ├── models/                   # database.ts (connection pool + helpers)
│       ├── middleware/               # Auth, validation
│       ├── services/                 # Utility functions, logging
│       └── server.ts                 # Express app entry point
│   └── database/
│       ├── migrations/               # 26 SQL migration files (001–026)
│       └── capsule_erp.db            # Legacy SQLite file (unused)
│
├── shared/types/
│   └── index.ts                      # 877 lines of shared TypeScript types
│
├── CLAUDE.md                         # Agent team coordination & context
├── DESIGN_SYSTEM.md                  # UI design specification
└── README.md                         # Project documentation
```

## File Ownership (Agent Team)

| Owner | Paths |
|-------|-------|
| Frontend Dev | `client/src/components/`, `client/src/pages/`, `client/src/styles/` |
| Backend Dev | `server/src/controllers/`, `server/src/models/`, `server/src/routes/`, `server/src/server.ts` |
| QA / Test Writer | `**/*.test.*`, `__tests__/` |
| Security Reviewer | Read-only |
| Performance Auditor | Read-only |
| Documentation Lead | `README.md`, `docs/` |

## Key Files
- **Type definitions**: `shared/types/index.ts` — single source of truth
- **Database layer**: `server/src/models/database.ts` — query helpers, connection pool
- **API base**: `client/src/services/api.ts` — Axios instance config
- **App layout**: `client/src/components/layout/AppLayout.tsx` — sidebar + main content
- **Design rules**: `DESIGN_SYSTEM.md` — authoritative UI spec

---
See also: [[Tech Stack]] · [[Data Flow]] · [[Design System]]
