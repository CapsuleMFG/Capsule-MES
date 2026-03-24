# Capsule MES — Second Brain

> Manufacturing MES tracking jobs through Engineering → WO Release → Materials → Production

## Architecture
- [[Tech Stack]] — React 18, TypeScript, Node.js, Express, Supabase PostgreSQL
- [[Project Structure]] — Directory map and file ownership
- [[Data Flow]] — Request lifecycle from UI to database
- [[Design System]] — Dark theme, color rules, component patterns

## Database
- [[Schema Overview]] — All tables, relationships, ER summary
- [[Migrations Log]] — 26 migrations in chronological order
- Tables: [[jobs]] · [[clients]] · [[work_orders]] · [[bom_items]] · [[pbom_items]] · [[global_inventory]] · [[purchase_orders]] · [[tracked_parts]] · [[route_templates]] · [[station_kiosks]] · [[design_milestones]] · [[engineers]] · [[suppliers]] · [[machines]] · [[job_workflow_progress]] · [[job_materials]] · [[job_labor]] · [[workflow_stages]]

## API
- [[API Overview]] — All endpoints grouped by domain
- Endpoints: [[Jobs API]] · [[Clients API]] · [[Engineering API]] · [[Supply Chain API]] · [[Production API]] · [[Parts Tracking API]] · [[Inventory API]] · [[Purchase Orders API]] · [[Station Kiosks API]]

## Features
- [[Workflow Engine]] — 4-stage pipeline with auto-advancement
- [[Engineering]] — Design milestones, PBOM, send to supply chain
- [[Supply Chain]] — Ordering, POs, inventory matching, priority reordering
- [[Production]] — Work orders, machine assignment, production status
- [[Parts Tracking]] — Route templates, station kiosks, scrap/recut
- [[BOM Management]] — Job-level BOM with Excel/CSV import
- [[Clients]] — Client CRUD with delete protection

## Frontend
- [[Pages]] · [[Components]] · [[Hooks]] · [[Services]]

## Status
- [[Feature Status]] — Done, partial, not started
- [[Technical Debt]] — Known issues and gaps
- [[Roadmap]] — Future work and ideas

## Runbooks
- [[Getting Started]] — How to run locally
- [[Adding a Feature]] — Where to add routes, controllers, hooks
- [[Database Migrations]] — How to create and apply migrations

---
*Last updated: 2026-03-18*
