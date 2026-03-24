# Production

The final workflow stage. Manages work orders on the production floor, machine assignment, and production status tracking.

## Work Order Lifecycle

```
Draft → Released → Sent to Production → In Pool → Assigned → In Progress → Completed
                                                                         ↘ Discarded
```

### Production Status Values
| Status | Meaning |
|--------|---------|
| Not Sent | Work order not yet sent to production |
| In Pool | Available for assignment |
| Assigned | Assigned to a machine |
| In Progress | Actively being manufactured |
| Completed | Production finished |
| Discarded | Cancelled/discarded |

## Machine Assignment
- Work orders can be assigned to specific [[machines]]
- Machines have type, active status, and display order
- Production priority can be set independently of job priority

## Recuts
- Work orders can be flagged as `is_recut`
- Tracked parts link to original via `recut_from_id`
- RecutsTab component manages recut workflow

## Auto-Completion
When all [[tracked_parts]] for a job reach Completed status → Production stage auto-completes (see [[Workflow Engine]])

## Key Components
| Component | Purpose |
|-----------|---------|
| ProductionProjects.tsx | Production dashboard view |
| ProductionJobCard.tsx | Job card styled for production |
| ProductionTab.tsx | Production tab within job detail |
| RecutsTab.tsx | Recut parts management |

## API Endpoints
- [[Production API]] — work order start/complete, machines

## Database Tables
- [[work_orders]] · [[machines]] · [[tracked_parts]]

---
*Tags:* #done
