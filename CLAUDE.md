# Agent Team — Capsule MES Project Context

This file is automatically loaded by all agents (lead and teammates).
It establishes shared project context, ground rules, and communication conventions.

---

## Team Architecture

```
LEAD (claude-opus-4-6-20251101) — delegate mode, orchestration only
├── TEAMMATE: Frontend Dev        (claude-sonnet-4-6-20250929)
├── TEAMMATE: Backend Dev         (claude-sonnet-4-6-20250929)
├── TEAMMATE: QA / Test Writer    (claude-sonnet-4-6-20250929)
├── TEAMMATE: Security Reviewer   (claude-sonnet-4-6-20250929)
├── TEAMMATE: Performance Auditor (claude-sonnet-4-6-20250929)
├── TEAMMATE: Documentation Lead  (claude-sonnet-4-6-20250929)
├── TEAMMATE: Data Gatherer       (claude-sonnet-4-6-20250929)
├── TEAMMATE: Source Validator    (claude-sonnet-4-6-20250929)
└── TEAMMATE: Insight Synthesizer (claude-sonnet-4-6-20250929)
```

> **Note:** Not all teammates need to be active at once. The Lead spawns only the
> teammates relevant to the current task and shuts them down when their work is done.

---

## Roles & Responsibilities

### Lead (Opus 4.6)
- Understands the full task and decomposes it into teammate-level workstreams
- Spawns only the teammates needed for the current task
- Operates in **Delegate Mode** — does NOT write code or produce deliverables directly
- Assigns tasks from the shared task list to specific teammates
- Reviews teammate outputs and synthesizes the final result
- Resolves conflicts and re-assigns work if a teammate is blocked
- Triggers team cleanup when all work is complete

### Teammates (Sonnet 4.6)
- Each owns a specific functional domain (see architecture above)
- Execute one focused, self-contained task at a time
- Claim or are assigned tasks from the shared task list
- Do NOT spawn sub-agents or additional teammates
- Message the Lead on completion or if blocked
- Mark tasks complete only when output is verifiable

---

## Communication Conventions

| From → To            | Method                  | Frequency                   |
|----------------------|-------------------------|-----------------------------|
| Teammate → Lead      | `message`               | On completion / blocker     |
| Lead → Teammate      | `message`               | Task assignment / feedback  |
| Lead → All           | `broadcast` (sparingly) | Critical pivots only        |
| Any → Any (urgent)   | `message`               | As needed                   |

**Broadcast sparingly** — each broadcast costs tokens proportional to team size.

---

## Task States

All agents use the shared task list with these states:

- `pending` — not yet started
- `in_progress` — claimed by a teammate (only ONE task per teammate at a time)
- `completed` — verified and deliverable produced

Tasks with unresolved dependencies remain blocked until dependencies complete.

---

## File Ownership Rules

To avoid merge conflicts, each teammate owns specific files/directories:

| Teammate             | Owned Paths                                                   |
|----------------------|---------------------------------------------------------------|
| Frontend Dev         | `client/src/components/`, `client/src/pages/`, `client/src/styles/` |
| Backend Dev          | `server/src/controllers/`, `server/src/models/`, `server/src/routes/`, `server/src/server.ts` |
| QA / Test Writer     | `client/src/**/*.test.*`, `server/src/**/*.test.*`, any `__tests__/` folders |
| Security Reviewer    | **Read-only** — no file edits                                 |
| Performance Auditor  | **Read-only** — no file edits                                 |
| Documentation Lead   | `README.md`, `docs/`, inline docstrings/comments only        |
| Data Gatherer        | `outputs/research/data-gathered.md`                          |
| Source Validator     | `outputs/research/validation-report.md`                      |
| Insight Synthesizer  | `outputs/research/insights.md`                               |

- Teammates should NOT edit files owned by another teammate
- If shared file edits are required, the Lead sequences those tasks with explicit dependencies
- The Lead tracks all file ownership assignments

---

## Quality Gates

Before the Lead marks the overall project complete:

1. All teammate tasks must be in `completed` state
2. Outputs reviewed against the original task scope
3. No unresolved blockers or open questions
4. Cross-domain conflicts resolved
5. Final synthesized output produced

---

## Project-Specific Context

- **Project name**: Capsule MES
- **Codebase root**: `/capsule-erp` (paths are relative to this root)
- **Primary language / stack**: TypeScript · React 18 · Vite · Node.js · Express · SQLite (sql.js) · Tailwind CSS · React Query
- **Key constraints**:
  - No breaking changes to the REST API contracts (existing endpoints must remain backward-compatible)
  - All frontend code must remain TypeScript-strict (no `any` types without justification)
  - Database migrations must be additive — do not drop or rename existing columns
  - All new UI must respect the Rivian-inspired dark theme (see Design System below)
  - Must pass existing CI checks before a task is marked `completed`
- **Definition of done**:
  - Code compiles without errors (`npm run build` passes in both `client/` and `server/`)
  - No TypeScript type errors
  - Feature works end-to-end with the SQLite database running
  - No hardcoded credentials or debug `console.log` statements

---

## Codebase Map (Quick Reference)

```
capsule-erp/
├── client/                        # React 18 + Vite frontend (port 5173)
│   └── src/
│       ├── components/
│       │   ├── layout/            # AppLayout, Sidebar
│       │   ├── dashboard/         # Dashboard widgets and metrics
│       │   ├── jobs/              # Job list, cards, detail tabs
│       │   └── ui/                # Base UI primitives
│       ├── pages/                 # Page-level route components
│       ├── hooks/                 # Custom React hooks
│       ├── services/              # Axios API service layer
│       └── types/                 # Shared TypeScript types (client-side)
│
├── server/                        # Express + SQLite backend (port 3001)
│   └── src/
│       ├── controllers/           # Request handlers
│       ├── models/                # Database models
│       ├── routes/                # API route definitions
│       └── server.ts              # Express app entry point
│   └── database/
│       ├── migrations/            # SQL migration files
│       └── capsule_erp.db         # SQLite database file
│
└── shared/                        # Types shared between client and server
    └── types/
```

---

## API Surface (REST Endpoints)

All endpoints are prefixed with `/api`.

| Resource          | Endpoints                                                             |
|-------------------|-----------------------------------------------------------------------|
| Jobs              | `GET /jobs`, `POST /jobs`, `GET /jobs/:id`, `PUT /jobs/:id`, `DELETE /jobs/:id` |
| Workflow          | `GET /jobs/:id/workflow`, `PUT /jobs/:id/workflow/:stageId`, `GET /workflow/stages` |
| Materials (BOM)   | `GET /jobs/:id/materials`, `POST /jobs/:id/materials`, `PUT /jobs/:id/materials/:materialId`, `DELETE /jobs/:id/materials/:materialId` |
| Labor             | `GET /jobs/:id/labor`, `POST /jobs/:id/labor`, `DELETE /jobs/:id/labor/:laborId` |
| Dashboard         | `GET /dashboard/metrics`                                             |
| Clients           | `GET /clients`, `POST /clients`, `GET /clients/:id`                  |

---

## Design System Reference

> Full spec in `DESIGN_SYSTEM.md`. This is the authoritative source — all agents must follow it.

**Theme:** Soft Structural Light — white surfaces, generous border-radius, semantic color only.

### Colors

**Backgrounds:**
- Page: `bg-gray-100`
- Cards / panels / sidebar: `bg-white`
- Hover states: `bg-gray-50`
- Card outline: `ring-1 ring-black/[0.02]`
- Dividers: `border-gray-100` · Table rows: `border-gray-50`

**Text:**
- Primary (headings, values): `text-gray-900`
- Secondary (body, tables): `text-gray-600`
- Muted (timestamps, hints): `text-gray-400`
- Disabled: `text-gray-300`

**Interactive:**
- Primary action: `bg-gray-900 text-white` · hover: `bg-gray-800`
- Links: `text-blue-600` · hover: `text-blue-700`
- Focus ring: `ring-2 ring-gray-900`

**Semantic colors (soft-tinted pill badges — never decorative):**
- Completed / Success: `bg-emerald-50 text-emerald-700`
- In Progress / Warning: `bg-amber-50 text-amber-700`
- Blocked / Error: `bg-red-50 text-red-700`
- Not Started / Neutral: `bg-gray-100 text-gray-500`

### Critical Design Rules (enforce on every PR)

1. **No colored icon backgrounds** — icons are `text-gray-400` or semantic color only
2. **No rainbow metric cards** — metric values are `text-gray-900`, never colored
3. **Semantic color only on the meaning-bearing element** — never on surrounding containers
4. **One primary action color** (`bg-gray-900`) for interactive elements
5. **Metric values use `text-3xl`** — not smaller
6. **Use `shadow-sm` for cards, `shadow-xl` for modals** — no `shadow-lg` on cards
7. **Soft-tinted pill badges** — no dot+text pattern, no colored backgrounds on container
8. **No gradient backgrounds**
9. **No colored borders on cards** — use `ring-1 ring-black/[0.02]`
10. **Tables always inside a white card container** with `overflow-hidden`

### Key Component Patterns

- **Cards:** `bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.02] p-5`
- **Primary button:** `bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all`
- **Secondary button:** `bg-white ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all`
- **Danger button:** `bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-[10px] active:scale-[0.98] transition-all`
- **Inputs:** `bg-white ring-1 ring-gray-200 rounded-[10px] text-sm text-gray-900 px-3 py-2 focus:ring-2 focus:ring-gray-900`
- **Sidebar active nav:** `bg-gray-900 text-white rounded-lg px-3 py-2 font-medium`
- **Status badges:** soft-tinted pill — `px-2 py-0.5 rounded-md text-[11px] font-medium` + semantic bg/text colors
- **Table rows:** `text-sm text-gray-600 px-5 py-3 border-b border-gray-50 hover:bg-gray-50`
- **Icons:** `@phosphor-icons/react` weight `light` — nav: 18px, inline: 16px, metrics: 20px

---

## 4-Stage Workflow

Jobs progress through these stages in order:

1. **Engineering** — Design and engineering sign-off
2. **WO Release** — Work order released to floor
3. **Materials** — BOM materials ordered, received, and issued
4. **Production** — Active manufacturing

Each stage has independent status: `Not Started | In Progress | Completed | Blocked`

---

## Cost Awareness

Each active teammate has its own context window. Token costs scale linearly with team size.

- Spawn only the teammates needed — not all 9 at once
- For typical ERP feature work, start with **Backend Dev + Frontend Dev + QA**
- For security/perf reviews, add **Security Reviewer** and/or **Performance Auditor**
- For research tasks (new integrations, MRP planning), use **Data Gatherer → Source Validator → Insight Synthesizer**
- Prefer `message` over `broadcast`
- Shut down idle teammates promptly
- Keep teammate tasks scoped to 1–3 clear deliverables

---

## How to Start a Team Session

```bash
# 1. Navigate to project root
cd path/to/capsule-erp

# 2. Launch Lead agent
claude --model claude-opus-4-6-20251101

# 3. Paste this kickoff prompt (customize as needed):
```

```
Create an agent team for the following task: [YOUR TASK]

Team structure:
- You are the Lead. Use claude-opus-4-6-20251101. Stay in Delegate Mode.
- Read CLAUDE.md for full project context, constraints, and file ownership rules.
- Spawn only the teammates needed for this task.
- Use claude-sonnet-4-6-20250929 for all teammates.
- Switch to Delegate Mode (Shift+Tab) immediately after spawning teammates.
```

---

*This CLAUDE.md is version-controlled. All agents read it at spawn time.*
