# Components

55 TSX components in `client/src/components/`, organized by domain.

## UI Base (`components/ui/`)
| Component | Purpose |
|-----------|---------|
| Button.tsx | Primary, secondary, danger, ghost variants |
| Card.tsx | `bg-gray-800 border border-gray-700 rounded-lg` container |
| Input.tsx | Text input with focus states |
| Select.tsx | Dropdown select |
| Modal.tsx | Dialog overlay (`bg-black/60`) |
| Tabs.tsx | Tab interface |
| Badge.tsx | Status badge (colored dot + gray text) |
| ToastContainer.tsx | Toast notification system |
| LoadingSpinner.tsx | Animated loading indicator |

## Layout (`components/layout/`)
| Component | Purpose |
|-----------|---------|
| AppLayout.tsx | Main layout: sidebar nav + content area |

## Jobs (`components/jobs/`)
| Component | Purpose |
|-----------|---------|
| JobCard.tsx | Job summary card for list view |
| EngineeringJobCard.tsx | Job card for Engineering page |
| ProductionJobCard.tsx | Job card for Production page |
| SupplyChainJobCard.tsx | Job card for Supply Chain page |
| SortableJobCard.tsx | Draggable job card (React DnD Kit) |
| QuickAddJobModal.tsx | Quick job creation form |
| EditJobModal.tsx | Edit all job fields except job number |

### Job Detail Tabs (`components/jobs/tabs/`)
| Component | Purpose |
|-----------|---------|
| OverviewTab.tsx | Job overview — description, dates, labor summary |
| MaterialsTab.tsx | Simple material tracking (Needed/Ordered/Received/Issued) |
| ProductionTab.tsx | Production tracking + labor entry |

## Engineering (`components/engineering/`)
| Component | Purpose |
|-----------|---------|
| DesignMilestones.tsx | Milestone list with status toggles |
| BomItemsTable.tsx | BOM display table |
| BomImport.tsx | Upload BOM from Excel/CSV |
| AddBomItemModal.tsx | Add single BOM item |
| EditBomItemModal.tsx | Edit BOM item |
| PbomTableEngineering.tsx | PBOM table (engineering view) |
| PbomImport.tsx | Bulk import PBOM |
| AddPbomItemModal.tsx | Add single PBOM item |
| EditPbomItemModal.tsx | Edit PBOM item |
| SendToProductionModal.tsx | Send PBOM to supply chain |
| ManageEngineersModal.tsx | Assign engineers |
| GeneratePartsModal.tsx | Bulk create tracked parts |
| InitializePartsModal.tsx | Set part identification |
| WorkOrderFiles.tsx | File attachments for WOs |
| RecutsTab.tsx | Recut parts management |

## Supply Chain (`components/supplychain/`)
| Component | Purpose |
|-----------|---------|
| PbomTableSupplyChain.tsx | PBOM display (SC view) |
| EditPbomItemModalSupplyChain.tsx | SC-specific PBOM editing |
| GlobalInventoryPanel.tsx | All inventory items |
| OrderTrackingPanel.tsx | PO tracking with expandable rows |
| MassOrderModal.tsx | Create bulk PO from demand |
| EditOrderModal.tsx | Update PO fields |
| ReceiveOrderModal.tsx | Receive PO with distribution breakdown |
| SortableJobCard.tsx | Draggable job card for priority |
| AddInventoryModal.tsx | Add inventory item |
| EditInventoryModal.tsx | Edit inventory item |

## Parts Tracking (`components/parts-tracking/`)
| Component | Purpose |
|-----------|---------|
| JobPartsPanel.tsx | Parts list for a job |
| BulkCreatePartsModal.tsx | Create multiple tracked parts |
| ScrapPartModal.tsx | Mark part as scrapped |
| RouteStepEditor.tsx | Define route steps |
| RouteTemplateModal.tsx | Create/edit route template |
| StationCheckInOut.tsx | Operator check-in/out |

## Kiosk (`components/kiosk/`)
| Component | Purpose |
|-----------|---------|
| KioskPartModal.tsx | Part modal for kiosk screen |

## Clients (`components/clients/`)
| Component | Purpose |
|-----------|---------|
| AddClientModal.tsx | Create client |
| EditClientModal.tsx | Edit client |

## Production (`components/production/`)
| Component | Purpose |
|-----------|---------|
| ProductionProjects.tsx | Production dashboard |

## Contexts (`contexts/`)
| Context | Purpose |
|---------|---------|
| ToastContext.tsx | Toast notifications — `useToast()` hook |
| KioskContext.tsx | Kiosk station state |

---
See also: [[Pages]] · [[Design System]] · [[Hooks]]
