# Tech Stack

## Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | latest | Dev server & bundler |
| Tailwind CSS | 3.4 | Utility-first styling |
| React Router | 6.21 | Client-side routing |
| React Query (TanStack) | 5.17 | Server state management & caching |
| Axios | 1.6 | HTTP client |
| Lucide React | 0.305 | Icon library |
| Headless UI | 1.7 | Accessible primitives |
| React Hook Form | 7.49 | Form handling |
| Zod | 3.22 | Schema validation |
| @dnd-kit | 6.3 / 10.0 | Drag and drop (sortable) |
| date-fns | 3.0 | Date formatting |

## Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18 | HTTP framework |
| TypeScript | 5.x | Type safety |
| pg (node-postgres) | 8.18 | PostgreSQL client |
| Helmet | 7.1 | Security headers |
| CORS | 2.8 | Cross-origin |
| Winston | 3.11 | Logging |
| Multer | 2.0 | File uploads |
| xlsx | 0.18 | Excel parsing |
| pdf-parse | 1.1 | PDF parsing |
| express-validator | 7.0 | Input validation |
| dotenv | 16.3 | Environment variables |

## Database
- **Supabase PostgreSQL** (project: `jmbezxqvsbzbslexgbhj`, region: us-east-2)
- Connected via `pg` with connection pooling
- 26 additive migrations
- Originally SQLite (sql.js), migrated to Supabase

## Dev Tools
- `tsx watch` for backend hot-reload
- Vite HMR for frontend
- ESLint for linting
- TypeScript strict mode

## Key Architectural Decisions
- **React Query over Redux** — server state doesn't need a global store; React Query handles caching, invalidation, and optimistic updates
- **Axios over fetch** — interceptors for base URL, error handling
- **Supabase over self-hosted** — managed PostgreSQL with connection pooling, no ops burden
- **Tailwind over CSS modules** — rapid iteration, design system enforcement via utility classes
- **Shared types** — `shared/types/index.ts` is the single source of truth for both client and server

---
See also: [[Project Structure]] · [[Data Flow]]
