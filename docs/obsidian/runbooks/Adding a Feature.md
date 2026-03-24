# Adding a Feature

Step-by-step guide to adding a new feature to Capsule MES.

## 1. Database (if needed)

Create a new migration in `server/database/migrations/`:
```
027_your_feature.sql
```

**Rules:**
- Additive only — never drop or rename columns
- Use `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ... ADD COLUMN`
- Apply via Supabase MCP or manually

See [[Database Migrations]] for details.

## 2. Shared Types

Update `shared/types/index.ts`:
- Add interfaces for your entity (e.g., `MyFeature`, `CreateMyFeatureRequest`, `UpdateMyFeatureRequest`)
- Add any new enum types
- This file is the single source of truth for both client and server

## 3. Backend Controller

Create `server/src/controllers/myfeature.controller.ts`:
```typescript
import { query, queryOne, execute } from '../models/database';

export async function getItems(req, res) {
  const items = await query('SELECT * FROM my_table');
  res.json(items);
}
```

**Patterns:**
- Use `query()`, `queryOne()`, `execute()` from database.ts
- Convert snake_case DB columns → camelCase in response
- Convert camelCase request body → snake_case for SQL
- Wrap in try/catch, return `{ error: message }` on failure

## 4. Backend Route

Create `server/src/routes/myfeature.routes.ts`:
```typescript
import { Router } from 'express';
import { getItems, createItem } from '../controllers/myfeature.controller';

const router = Router();
router.get('/', getItems);
router.post('/', createItem);
export default router;
```

Register in `server/src/server.ts`:
```typescript
import myfeatureRoutes from './routes/myfeature.routes';
app.use('/api/myfeature', myfeatureRoutes);
```

## 5. Frontend Service

Create `client/src/services/myfeature.service.ts`:
```typescript
import api from './api';

export const myfeatureService = {
  getItems: () => api.get('/myfeature').then(r => r.data),
  createItem: (data) => api.post('/myfeature', data).then(r => r.data),
};
```

## 6. Frontend Hook

Add to existing hook file or create `client/src/hooks/useMyFeature.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { myfeatureService } from '../services/myfeature.service';

export function useMyFeature() {
  return useQuery({ queryKey: ['myfeature'], queryFn: myfeatureService.getItems });
}

export function useCreateMyFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: myfeatureService.createItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myfeature'] }),
  });
}
```

## 7. Frontend Components

Create in `client/src/components/myfeature/`:
- Follow [[Design System]] rules strictly
- Use base [[Components|UI components]] (Button, Card, Modal, etc.)
- Add toast notifications via `useToast()`

## 8. Frontend Page (if needed)

Create `client/src/pages/MyFeature.tsx` and add route in main router.

## Checklist
- [ ] Migration created and applied
- [ ] Types added to shared/types/index.ts
- [ ] Controller with CRUD operations
- [ ] Routes registered in server.ts
- [ ] Service layer with Axios calls
- [ ] React Query hooks with proper cache invalidation
- [ ] Components following design system
- [ ] Toast notifications on mutations
- [ ] No TypeScript errors (`npm run build` passes)

---
See also: [[Project Structure]] · [[Data Flow]] · [[Design System]]
