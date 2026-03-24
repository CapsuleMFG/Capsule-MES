# BOM Management

Bill of Materials management at the job level. Defines what parts and materials a job needs for manufacturing.

## Key Facts
- BOMs are **job-level** (not work-order-level — changed in migration 005)
- BOMs are uploaded **before** work orders are created
- No cost fields on BOM items (removed in migration 008 — cost tracking is on [[job_materials]])

## Input Methods

### 1. Excel/CSV Import
- Upload via BomImport component
- Parses columns: Part Number, Description, Quantity, Unit, Material, Thickness, Surface Area, Powdercoat
- Bulk creates BOM items via `POST /api/jobs/:jobId/bom/import`

### 2. Manual Entry
- AddBomItemModal for one-at-a-time creation
- Same fields as import

## BOM Item Fields
| Field | Required | Notes |
|-------|----------|-------|
| Part Number | Yes | Identifier |
| Description | No | |
| Quantity | Yes | |
| Unit | No | ea, ft, etc. |
| Material | No | Material type (steel, aluminum, etc.) |
| Thickness | No | Gauge/dimension |
| Surface Area | No | Numeric |
| Powdercoat | No | Color/type |
| Route Template | No | Links to [[route_templates]] for parts tracking |

## Components
| Component | Purpose |
|-----------|---------|
| BomItemsTable.tsx | Display BOM items with edit/delete |
| BomImport.tsx | File upload for Excel/CSV |
| AddBomItemModal.tsx | Manual add form |
| EditBomItemModal.tsx | Edit existing item |

## Relationship to PBOM
- BOM defines **what to make** (engineering/manufacturing spec)
- [[pbom_items|PBOM]] defines **what to buy** (procurement/purchasing)
- Both are job-level but serve different purposes
- BOM items can generate [[tracked_parts]] for production floor tracking

## API
- `GET /api/jobs/:jobId/bom` — list items
- `POST /api/jobs/:jobId/bom` — create item
- `PUT /api/jobs/:jobId/bom/:bomId` — update
- `DELETE /api/jobs/:jobId/bom/:bomId` — delete
- `POST /api/jobs/:jobId/bom/import` — bulk import

---
See also: [[Engineering]] · [[bom_items]] · [[Engineering API]]
*Tags:* #done
