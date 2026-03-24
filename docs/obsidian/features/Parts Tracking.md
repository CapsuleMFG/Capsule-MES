# Parts Tracking

Granular tracking of individual parts through the manufacturing process. Parts follow route templates (defined sequences of stations) and operators check in/out at each station.

## Core Concepts

### Route Templates
- Reusable manufacturing routes defining the sequence of stations a part visits
- Each step has: station name, optional machine, estimated minutes
- Steps are ordered and can be reordered
- Example: Cut → Bend → Weld → Powdercoat → Assembly → QC

### Tracked Parts
- Individual pieces created from [[bom_items]]
- Each has a tracking ID (QR, Engraved, Sticker, or Other)
- Follows a route template step by step
- Status: Pending → In Progress → Completed (or Scrapped / On Hold)

### Station Kiosks
- Physical shop floor stations with PIN authentication
- Operators log in, see parts in their queue
- Check in/out parts, recording time spent and quality status

### Scrap & Recut
- Parts can be scrapped with a reason
- Recut creates new parts linked to the original via `recut_from_id`
- Work orders can be flagged as recut work orders

## Workflow

```
BOM Item created
    ↓ GeneratePartsModal (bulk create)
Tracked Parts created (Pending)
    ↓ Part arrives at first station
Operator checks in (→ In Progress)
    ↓ Work done
Operator checks out (quality: Pass/Fail)
    ↓ Advances to next step
... repeat for each route step ...
    ↓ Last step completed
Part status → Completed
    ↓ When all parts done
Production stage auto-completes
```

## Key Components
| Component | Purpose |
|-----------|---------|
| JobPartsPanel.tsx | View parts for a job |
| BulkCreatePartsModal.tsx | Create multiple parts at once |
| ScrapPartModal.tsx | Mark part as scrapped |
| RouteStepEditor.tsx | Define route steps |
| RouteTemplateModal.tsx | Create/edit route template |
| StationCheckInOut.tsx | Operator check-in/out UI |
| KioskPartModal.tsx | Part modal for kiosk screen |

## Pages
| Page | Route | Purpose |
|------|-------|---------|
| PartsTracking.tsx | /parts-tracking | Part tracking overview |
| PartDetail.tsx | /parts/:id | Single part detail + station history |
| RouteTemplates.tsx | /route-templates | Route template management |
| StationKiosks.tsx | /station-kiosks | Kiosk configuration |
| kiosk/StationLogin.tsx | /kiosk/login | PIN entry |
| kiosk/StationDashboard.tsx | /kiosk/dashboard | Operator queue |
| kiosk/MachineSelect.tsx | /kiosk/machine | Machine selection |

## API Endpoints
- [[Parts Tracking API]] — tracked parts CRUD, check-in/out, route templates
- [[Station Kiosks API]] — kiosk auth, queue management

## Database Tables
- [[tracked_parts]] · [[route_templates]] · [[station_kiosks]] · [[machines]]

---
*Tags:* #done
