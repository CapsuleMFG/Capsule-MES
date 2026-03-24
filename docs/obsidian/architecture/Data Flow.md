# Data Flow

## Request Lifecycle

```
User Action (click, form submit)
    ↓
React Component
    ↓
Custom Hook (useJobs, useCreateJob, etc.)
    ↓  uses React Query mutation/query
Service Layer (jobs.service.ts)
    ↓  Axios HTTP request
Express Router (jobs.routes.ts)
    ↓  route matching
Controller (jobs.controller.ts)
    ↓  business logic
Database Helper (database.ts → query/execute)
    ↓  pg client
Supabase PostgreSQL
    ↓  returns rows
Controller formats response
    ↓  JSON
React Query caches result
    ↓  invalidates related queries
Component re-renders with new data
```

## Data Fetching Pattern (Read)

1. **Component** calls `useJobs()` or `useJob(id)` hook
2. **Hook** wraps `useQuery()` with a query key like `['jobs']` or `['job', id]`
3. **Query function** calls service: `jobsService.getJobs()`
4. **Service** makes `axios.get('/api/jobs')` via the configured Axios instance
5. **Express** routes to `jobs.controller.getJobs`
6. **Controller** calls `query('SELECT ... FROM jobs ...')`
7. **database.ts** executes via `pg` pool, returns rows
8. **Controller** maps snake_case → camelCase, sends JSON response
9. **React Query** caches the response, component renders

## Mutation Pattern (Create/Update/Delete)

1. **Component** calls `useCreateJob()` hook
2. **Hook** wraps `useMutation()` with `onSuccess` callback
3. **On submit**, mutation calls `jobsService.createJob(data)`
4. **Service** makes `axios.post('/api/jobs', data)`
5. **Controller** validates, inserts into DB
6. **On success**, React Query invalidates `['jobs']` cache
7. **All components** using `useJobs()` automatically refetch
8. **Toast** notification fires via `onSuccess`/`onError` callbacks

## Cache Invalidation Strategy

| Action | Invalidates |
|--------|------------|
| Create job | `['jobs']` |
| Update job | `['jobs']`, `['job', id]` |
| Delete job | `['jobs']` |
| Update workflow stage | `['job', id]`, `['jobs']` |
| Create/update material | `['job', id]` |
| PBOM changes | `['job', id]`, `['pbom', jobId]` |
| Inventory changes | `['inventory']`, `['pbom', jobId]` |

## Database Helper Functions

From `server/src/models/database.ts`:

- `query(sql, params)` — SELECT queries, returns array of rows
- `queryOne(sql, params)` — SELECT single row
- `execute(sql, params)` — INSERT/UPDATE/DELETE, auto-appends `RETURNING id` for INSERTs
- Uses `$1, $2...` PostgreSQL-style placeholders (auto-converted from `?`)

## Key Patterns
- **camelCase ↔ snake_case**: Controllers convert between JS conventions and DB columns
- **Additive migrations**: Never drop/rename columns — always add new ones
- **Auto-completion**: Stage transitions trigger `autoCompleteStage()` checks
- **Auto-matching**: PBOM items auto-link to inventory on create/import

---
See also: [[Tech Stack]] · [[Hooks]] · [[Services]] · [[Schema Overview]]
