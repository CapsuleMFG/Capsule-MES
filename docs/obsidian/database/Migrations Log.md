# Migrations Log

All 26 migrations applied in order. Migrations are **additive only** — no drops or renames.

| # | Migration | Purpose |
|---|-----------|---------|
| 001 | create_tables | Core tables: [[clients]], [[workflow_stages]], [[jobs]], [[job_workflow_progress]], [[job_materials]], [[job_labor]] |
| 002 | seed_data | Sample data: 5 jobs, 5 clients, 4 stages, 9 materials, 9 labor entries |
| 003 | refactor_job_dates_and_hours | Refactor to target_start/end_date, start_date, completed_date |
| 004 | engineering_enhancements | [[design_milestones]] table for engineering progress |
| 004b | engineering_supply_chain | [[suppliers]], [[work_orders]], [[bom_items]], [[global_inventory]], job_procurement, job_engineering |
| 005 | bom_job_level | Convert BOM from work-order-level to job-level |
| 006 | create_pbom_table | [[pbom_items]] — Production BOM per job |
| 007 | update_bom_manufacturing_fields | Add material, thickness, surface_area, powdercoat to BOM |
| 008 | remove_bom_cost_fields | Remove unit_cost, total_cost from BOM |
| 009 | create_machines_table | [[machines]] — Equipment definitions |
| 010 | work_order_production_fields | Add machine, production status to [[work_orders]] |
| 011 | add_work_order_production_priority | Add production_priority to work_orders |
| 012 | add_discarded_production_status | Add 'Discarded' to ProductionStatus |
| 013 | pbom_inventory_link | Link [[pbom_items]] to [[global_inventory]] with qty_allocated |
| 014 | parts_tracking | [[route_templates]], route_template_steps, [[tracked_parts]], part_station_logs |
| 015 | station_kiosk | [[station_kiosks]] for shop floor check-in/out |
| 016 | bom_route_template | Add route_template_id to [[bom_items]] |
| 017 | tracked_parts_work_order | Add work_order_id to [[tracked_parts]] |
| 018 | scrap_recut | Add scrap_reason, scrapped_at, recut_from_id to tracked_parts |
| 019 | work_orders_recut_flag | Add is_recut flag to [[work_orders]] |
| 020 | engineers | [[engineers]] table for team management |
| 021 | milestone_target_date | Add target_date to [[design_milestones]] |
| 022 | fix_global_inventory | Make part_number optional, remove warehouse_location |
| 023 | pbom_ordering_fields | Add qty_ordered, qty_received to [[pbom_items]] |
| 024 | pbom_expected_receive_date | Add expected_receive_date to pbom_items |
| 025 | sc_priority | Add sc_priority to [[jobs]] for drag-drop reordering |
| 026 | purchase_orders | [[purchase_orders]] table for consolidated multi-job orders |

## Rules
- Migrations must be **additive** — never drop or rename existing columns
- Applied via Supabase MCP or manually
- Located in `server/database/migrations/`

---
See also: [[Schema Overview]] · [[Database Migrations]]
