# Capsule MES — Gap-Analysis & Completion Plan

> **Status:** Working draft · **Date:** 2026-06-16
>
> **What this is:** A correction of an earlier refactor plan that was written against the
> stale `README.md`/`CLAUDE.md`. The repo is far past where that plan assumed — Postgres,
> auth, and the full feature set already exist. This document is a *delta from reality*:
> keep what works, fix what's inconsistent, build only what's genuinely missing.

---

## Corrected baseline — what already exists and works (verified against the code)

- **Data layer:** fully PostgreSQL via `pg` → Supabase (`server/src/models/database.ts`).
  sql.js is gone; the durability risk is gone.
- **Auth:** Supabase email/password + server-proxied login, kiosk PIN → signed JWT,
  forgot/reset password, 30-min idle timeout, rate-limit lockout, RBAC, operator
  station-scoping, IDOR hardening.
- **Schema (live in Supabase):** jobs, workflow_stages, clients, work_orders, bom_items,
  pbom_items, job_materials (legacy), suppliers, global_inventory, purchase_orders,
  job_procurement, **tracked_parts** (the generic unit — *no* pod/panel hardcoding),
  route_templates + route_template_steps, machines (+ downtime/OEE), station_kiosks,
  schedule_entries, shipments, profiles, audit_log, notifications, part_station_logs,
  design_milestones, engineers.
- **UI:** ~24 wired routes, no stubs — Dashboard, Engineering (BOM/PBOM/WO PDF-parse →
  parts), Supply Chain (procurement/inventory/orders), Production + Production Dashboard
  (Command Center / Machine Grid / Downtime), Scheduling board (drag-drop), Parts Tracking,
  Route Templates, Station Kiosk (PIN, check-in/out, barcode, quality gates), Shipping,
  Reports + CSV, Audit Log, User Management.
- **Design system:** light "Soft Structural" (Geist font, Phosphor icons, white cards).
  The README's "Rivian dark theme" is stale.

**Implication:** this is a *finishing / hardening* effort on a working system, not a
refactor. Do **not** restart from scratch.

---

## 0. Decisions to lock BEFORE writing code

Two of the original five decisions are now moot (data layer is chosen; the existing-data
question is gone — it's live on Supabase). Three remain; the *product-line* one is the only
true net-new architecture.

- [ ] **Product lines — the one real mandate gap.** The system has **no `product_lines`
      concept** and no pod/panel hardcoding — it's generic-by-omission via per-part route
      templates. That's enough to *route* different products differently, but there is no way
      to **group, default, filter, or report by product line.** Decide: does the company need
      to manage/report by line (pods, panels, …), or do route templates + an optional line
      tag suffice? If first-class lines are needed, this is the single most significant
      addition in the whole plan. **Lock it first.**
- [ ] **Unit nesting (pods-contain-panels).** `tracked_parts` is **flat** (it has
      `recut_from_id` for rework, but no `parent_unit_id` for assemblies). If a pod must be
      tracked as an assembly of panels, that's a genuine schema + UI change. Decide per line
      whether nesting is required.
- [ ] **Is "Shipping" a workflow stage or a module?** Today it's a separate module/screen;
      the tracked workflow is still the 4 seeded stages (Engineering → WO Release → Materials
      → Production). `workflow_stages` is a table, but stage-specific logic is hardcoded
      across controllers, so promoting Shipping to a 5th tracked stage is more than a data
      edit. Decide whether the mandate needs shipping *in the stage pipeline* or the existing
      module is enough.
- [ ] **Telemetry scope — unchanged, already handled correctly.** Machine tracking is
      status-only (`machines.is_down`, `machine_downtime_events`, OEE). The clean seam for
      future telemetry already exists. Confirm with Chad/Wade that status-only stays the line.
- [ ] **Role model — already decided, just reconcile.** 5 roles exist in code
      (`admin/manager/engineer/supply_chain/operator`). Don't redesign; fix the DB/UI
      mismatch (see §1).

---

## 1. Foundation fixes (do FIRST — the real prerequisites)

The original "migrate to Postgres + stand up auth" is **done**. The actual foundation gaps
are different and smaller:

- [ ] **Establish a schema source of truth + a real migration runner.** *Highest priority.*
      There is no migration runner (`server/package.json` has no `migrate` script, nothing in
      `server/src` executes the migration files, and the SQLite-syntax migrations 001–026
      can't run on Postgres). `migrations/` is a historical artifact; the live schema was
      built out-of-band and may have drifted. Concretely: (a) dump the live Supabase schema
      and commit it as the canonical baseline; (b) reconcile against the on-disk migrations;
      (c) adopt one forward-only Postgres migration tool (Supabase CLI migrations, or a small
      `pg`-based runner with a `schema_migrations` table) and wire `npm run migrate`.
      **Nothing in §0/§2 should be built until there's a repeatable way to ship a schema
      change.**
- [ ] **Fix the role-model inconsistency.** Add `supply_chain` to the `profiles.role` CHECK
      constraint (or remove it from code/UI) so DB, middleware, and User Management agree.
      Verify whether the live constraint was already altered out-of-band.
- [ ] **Decide on realtime — and probably skip it.** Live views poll via React Query at
      10–60s. For ~20 users on a floor board that's fine and simple; `@supabase/realtime-js`
      is present but unused. **Recommendation: leave polling**, revisit only if a specific
      screen demonstrably needs sub-second push.

---

## 2. Schema work — only the genuine gaps

The "generic units" keystone already exists as `tracked_parts`; "routing" exists as
`route_templates`. So this section shrinks to four real items:

- [ ] **Canonical `stations` table (highest-value data-integrity fix).** Stations are
      **free-text `station_name` strings** in `route_template_steps`, and operator security
      scoping relies on case-insensitive string matching of that text. A typo silently breaks
      routing *and* access control. Introduce a `stations` table, migrate the distinct names
      into it, FK `route_template_steps.station_id` (keep the string during transition). This
      is also the natural home for product-line tagging.
- [ ] **`product_lines` (only if decision 0a says first-class).** One row per line;
      reference it from `jobs` and/or `tracked_parts` as a tag, optionally from
      `stations`/`route_templates` for per-line defaults. Adding a line becomes data entry.
- [ ] **Unit nesting (only if decision 0b says required).** Add
      `tracked_parts.parent_unit_id` self-reference and roll-up logic (a pod's status derived
      from its panels).
- [ ] **Unit-level shipping (only if you ship partial jobs).** `shipments` are job-level with
      a `packing_list` JSONB. If you ship some units before others, add a `shipment_items`
      link table (shipment ↔ tracked_parts). Otherwise leave it.

**Explicitly NOT doing:** the original "one universal `events` table." The repo already has
purpose-built logs (`part_station_logs`, `machine_downtime_events`, `audit_log`) which are
better than a polymorphic mega-table (FK integrity, real indexes). If you want a single
timeline, add a **read-only SQL view** that unions them — don't refactor the writes.

---

## 3. Cleanup & hygiene

The code rename (ERP → MES) happened; the docs didn't. Cheap and high-leverage.

- [ ] **Fix `CLAUDE.md` first — it actively misleads every future agent session.** It still
      says sql.js, 4-stage-ending-at-Production, `/capsule-erp` root, a 9-teammate agent
      model, and an old API surface. It's auto-loaded at spawn; until corrected, every
      session inherits the wrong mental model (exactly what happened to the original plan).
- [ ] **Update `README.md`:** Postgres not SQLite, light theme not Rivian, the real feature
      set, correct clone path (`Capsule-MES`), remove stale `DATABASE_PATH`/sql.js
      instructions.
- [ ] **Resolve the design-system contradiction in docs** (README dark vs code/DESIGN_SYSTEM
      light — code wins). Then fix the one real piece of UI debt: the dark-themed OEE cards
      in `CommandCenterTab` that violate the light system.
- [ ] **Prune stale scaffolding** — `.superpowers/brainstorm/*`, the `agents/` directory, and
      superseded `docs/superpowers/plans`. Keep the design specs that still describe the
      system; delete the rest.
- [ ] **Extend tests, don't start them.** `auth.test.ts`, `workflow.test.ts`,
      `routes.smoke.test.ts` already exist. Add coverage for the parts state machine
      (check-in/out, route-step dependency enforcement, scrap/recut) and schedule-entry
      position integrity — where a bug corrupts tracking state.
- [ ] **Seed gating** — confirm `002_seed_data` (CAP-2025 / Lennar / DR Horton sample data)
      is opt-in and can't clobber live data. Lower urgency now that seeding isn't auto-run,
      but verify before wiring the migration runner in §1.

---

## 4. Feature gap-fill (small, targeted — most features already exist)

The original §4 was "build these"; the audit shows they're built. The real gaps are minor:

- [ ] **Wire the "machine down" operator UI.** Backend (`is_down`, `down_reason`, downtime
      events) and the `useUpdateMachineStatus` hook exist, but there's no operator-facing
      button to flag a machine down. Small, high-value.
- [ ] **Purchase Order creation UI.** PO *data* exists and is created via the
      Engineering/allocation flow, but there's no direct PO create/manage screen. Add if
      Supply Chain needs to raise POs independently.
- [ ] **Product-line dimensions in dashboards/reports** (only if 0a lands) — units in WIP by
      line, per-line on-time-ship rate, etc.
- [ ] **Unit-level shipping UI** (only if §2 unit-level shipping lands).

Everything else (floor board, machine status views, scheduling, shipping module,
supply-chain depth) is already shipping.

---

## 5. Explicitly OUT of scope this pass

- Live machine telemetry / PLC integration (status-only stays; seam already clean).
- Realtime/WebSocket push (polling is sufficient — see §1).
- A universal polymorphic events table (purpose-built logs are better — see §2).
- MRP, capacity planning, auto-scheduling (already deferred in the design docs).
- Mobile app (kiosk web view covers the floor).
- Expanding the RLS matrix (coarse `service_role`/`authenticated` policies exist; app-layer
  middleware is the access model — don't grow it this pass).

---

## Suggested execution order

1. **§3 docs first** — rewrite `CLAUDE.md` + `README.md` (stops the misleading-context bleed
   immediately).
2. **§1 foundation** — schema source-of-truth + migration runner, then the role-CHECK fix.
3. **§0 decisions** — lock product lines (0a) and nesting (0b) with Chad/Wade; everything in
   §2 branches off these.
4. **§2 `stations` table** — do this regardless (data-integrity + security fix), then
   product_lines / nesting only as decisions dictate.
5. **One thin end-to-end slice on the *new* concept** — if product lines land: create a job
   tagged to a line → spawn units on that line's route → units move through stations (logged)
   → marked shipped, floor board filtered by line. Prove the line dimension threads
   end-to-end before generalizing.
6. **§4 gap-fills** — machine-down button first (cheapest real gap), then the rest.
