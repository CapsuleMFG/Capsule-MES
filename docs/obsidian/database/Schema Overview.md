# Schema Overview

Capsule MES uses **Supabase PostgreSQL** with 18 core tables across 26 additive migrations.

## Entity Relationship Summary

```
clients 1──∞ jobs 1──∞ job_workflow_progress
                  1──∞ job_materials
                  1──∞ job_labor
                  1──∞ bom_items
                  1──∞ pbom_items ∞──1 global_inventory
                  1──∞ work_orders
                  1──∞ design_milestones
                  1──∞ tracked_parts 1──∞ part_station_logs

workflow_stages 1──∞ job_workflow_progress

route_templates 1──∞ route_template_steps
                1──∞ tracked_parts

machines 1──∞ route_template_steps
         1──∞ station_kiosks
         1──∞ work_orders

purchase_orders 1──∞ pbom_items (via purchase_order_id)
```

## Tables by Domain

### Core
| Table | Purpose | Links |
|-------|---------|-------|
| [[clients]] | Customer master data | → jobs |
| [[jobs]] | Manufacturing jobs | → clients, workflow, materials, labor, BOM, PBOM |
| [[workflow_stages]] | 4-stage definitions | → job_workflow_progress |

### Workflow & Labor
| Table | Purpose | Links |
|-------|---------|-------|
| [[job_workflow_progress]] | Job stage status tracking | → jobs, workflow_stages |
| [[job_materials]] | Simple material tracking | → jobs |
| [[job_labor]] | Labor hour entries | → jobs, workflow_stages |

### Engineering
| Table | Purpose | Links |
|-------|---------|-------|
| [[design_milestones]] | Engineering checkpoints | → jobs |
| [[engineers]] | Engineering team members | standalone |
| [[bom_items]] | Bill of Materials (job-level) | → jobs, route_templates |

### Supply Chain
| Table | Purpose | Links |
|-------|---------|-------|
| [[pbom_items]] | Production BOM with ordering | → jobs, global_inventory, purchase_orders |
| [[global_inventory]] | Parts inventory | ← pbom_items |
| [[purchase_orders]] | Consolidated PO tracking | → global_inventory, ← pbom_items |
| [[suppliers]] | Vendor master data | standalone |

### Production & Parts
| Table | Purpose | Links |
|-------|---------|-------|
| [[work_orders]] | Manufacturing work orders | → jobs, machines |
| [[tracked_parts]] | Individual part tracking | → jobs, bom_items, work_orders, route_templates |
| [[route_templates]] | Manufacturing route definitions | → route_template_steps |
| [[station_kiosks]] | Shop floor stations | → machines |
| [[machines]] | Equipment definitions | ← work_orders, station_kiosks, route_template_steps |

## Status Enums

| Type | Values |
|------|--------|
| JobStatus | Active, On Hold, Completed, Cancelled |
| WorkflowStageStatus | Not Started, In Progress, Completed, Blocked |
| MaterialStatus | Needed, Ordered, Received, Issued |
| PbomStatus | Ready, In Progress, Ordered, Received |
| ProductionStatus | Not Sent, In Pool, Assigned, In Progress, Completed, Discarded |
| TrackedPartStatus | Pending, In Progress, Completed, Scrapped, On Hold |
| WorkOrderStatus | Draft, Released, Archived |
| QualityStatus | Pass, Fail, Pending |

---
See also: [[Migrations Log]] · [[Data Flow]]
