# Engineering

The first stage of the manufacturing workflow. Engineers review designs, track milestones, manage the BOM/PBOM, and release work to supply chain.

## Design Milestones
- Track engineering checkpoints per job (e.g., "Design Review", "Drawing Approval")
- Status: Not Started → In Progress → Completed
- Optional target date per milestone
- When ALL milestones complete → Engineering stage auto-completes (see [[Workflow Engine]])

## BOM (Bill of Materials)
- **Job-level** (not work-order-level)
- Created BEFORE work orders
- Two input methods:
  1. **Excel/CSV import** — bulk upload via `importBom`
  2. **Manual entry** — AddBomItemModal, one at a time
- Fields: Part Number, Description, Quantity, Unit, Material, Thickness, Surface Area, Powdercoat
- Each BOM item can be linked to a [[route_templates|Route Template]]
- See [[BOM Management]] for full details

## PBOM (Production BOM)
- The purchasing/procurement side — what needs to be ordered
- Created in Engineering, fulfilled in [[Supply Chain]]
- Fields: Description, Qty Required, Mfr/Vendor, Vendor Part#, Category, Status
- **Auto-matches to [[global_inventory]]** on create/import:
  1. Description match (case-insensitive, trimmed)
  2. Part number match (mfrVendorPart → inventory partNumber)
- **Send to Supply Chain** — sets `sent_to_sc = true`, makes items visible in SC view
- Import from Excel/CSV supported

## Work Orders
- Created per job, with WO number auto-generated
- Status: Draft → Released → Archived
- Can be marked as recut (`is_recut` flag)
- Links to [[machines]] for assignment
- Has its own production status lifecycle

## Engineer Management
- Manage engineering team (name, email, active status)
- Assign engineers to jobs

## Key Components
| Component | Purpose |
|-----------|---------|
| DesignMilestones.tsx | Milestone list with status toggles |
| PbomTableEngineering.tsx | PBOM table for engineering view |
| AddPbomItemModal.tsx | Add single PBOM item |
| EditPbomItemModal.tsx | Edit PBOM item |
| PbomImport.tsx | Bulk import PBOM |
| SendToProductionModal.tsx | Send PBOM items to supply chain |
| BomItemsTable.tsx | BOM display table |
| BomImport.tsx | Upload BOM file |
| ManageEngineersModal.tsx | Engineer team management |
| GeneratePartsModal.tsx | Bulk create tracked parts from BOM |
| InitializePartsModal.tsx | Set identification on parts |
| WorkOrderFiles.tsx | File attachments for work orders |

## API Endpoints
- [[Engineering API]] — BOM, PBOM, milestones, work orders, engineers

## Database Tables
- [[bom_items]] · [[pbom_items]] · [[design_milestones]] · [[engineers]] · [[work_orders]]

---
*Tags:* #done
