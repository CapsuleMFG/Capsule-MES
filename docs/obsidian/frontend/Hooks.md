# Hooks

Custom React Query hooks in `client/src/hooks/`. Each domain has its own hook file.

## useJobs.ts
| Hook | Type | Key | Notes |
|------|------|-----|-------|
| `useJobs(filters?)` | Query | `['jobs', filters]` | List with optional status/priority/search |
| `useJob(id)` | Query | `['job', id]` | Single job with workflow progress |
| `useJobAnalytics()` | Query | `['jobAnalytics']` | Dashboard KPIs |
| `useCreateJob()` | Mutation | invalidates `['jobs']` | Auto-generates job number |
| `useUpdateJob(id)` | Mutation | invalidates `['jobs']`, `['job', id]` | Partial updates |
| `useDeleteJob()` | Mutation | invalidates `['jobs']` | |
| `useUpdateWorkflowStage(jobId)` | Mutation | invalidates `['job', jobId]`, `['jobs']` | Change stage status |

## useClients.ts
| Hook | Type | Key |
|------|------|-----|
| `useClients()` | Query | `['clients']` |
| `useCreateClient()` | Mutation | invalidates `['clients']` |
| `useUpdateClient(id)` | Mutation | invalidates `['clients']` |
| `useDeleteClient()` | Mutation | invalidates `['clients']` |

## useDashboard.ts
| Hook | Type | Key |
|------|------|-----|
| `useDashboardMetrics()` | Query | `['dashboardMetrics']` |

## usePartsTracking.ts
| Hook | Type | Key |
|------|------|-----|
| `useTrackedParts(jobId?)` | Query | `['trackedParts', jobId]` |
| `useCreateTrackedPart(jobId)` | Mutation | invalidates parts queries |
| `useUpdateTrackedPart(id)` | Mutation | invalidates parts queries |
| `useCheckInPart()` | Mutation | invalidates parts + kiosk queries |
| `useCheckOutPart()` | Mutation | invalidates parts + kiosk queries |

## useSupplyChainPriorities.ts
| Hook | Type |
|------|------|
| `useUpdateScPriorities()` | Mutation — reorder jobs, triggers inventory reallocation |

## Patterns
- All queries use React Query's `useQuery` with descriptive keys
- All mutations use `useMutation` with `onSuccess` invalidation
- Toast notifications fired in `onSuccess`/`onError` callbacks
- `isPending` used to disable submit buttons during mutations
- Related queries invalidated on mutation success for automatic refetch

---
See also: [[Services]] · [[Data Flow]] · [[Pages]]
