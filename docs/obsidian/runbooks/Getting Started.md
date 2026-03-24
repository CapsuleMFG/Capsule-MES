# Getting Started

How to run Capsule MES locally.

## Prerequisites
- Node.js 18+
- npm
- Git
- Access to Supabase project (for database)

## Setup

### 1. Clone & Install
```bash
git clone <repository-url>
cd capsule-erp

# Backend
cd server
npm install

# Frontend
cd ../client
npm install --legacy-peer-deps
```

### 2. Environment Variables

**Backend** (`server/.env`):
```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`client/.env`):
```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Run

**Terminal 1 — Backend (port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd client
npm run dev
```

### 4. Verify
- Frontend: http://localhost:5173
- API: http://localhost:3001/api/jobs

## Build for Production

```bash
# Backend
cd server && npm run build && npm start

# Frontend
cd client && npm run build
# Serve dist/ with any static file server
```

## Sample Data
The database is pre-seeded with:
- 5 clients (Lennar Homes, DR Horton, Pulte Homes, KB Home, Taylor Morrison)
- 5 jobs (CAP-2025-001 through CAP-2025-005)
- 4 workflow stages
- Sample materials and labor entries

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend won't connect to backend | Check backend is running on 3001, verify CORS_ORIGIN |
| Database errors | Check DATABASE_URL in server/.env, verify Supabase project is running |
| Tailwind not working | Restart Vite dev server |
| TypeScript errors | Run `npx tsc --noEmit` to check, ensure shared/types is accessible |

---
See also: [[Tech Stack]] · [[Project Structure]]
