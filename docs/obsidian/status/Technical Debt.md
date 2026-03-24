# Technical Debt

Known issues, gaps, and things that should be improved.

## Testing #debt
- **No tests exist** — no unit, integration, or E2E tests anywhere in the codebase
- No test framework configured (no Jest, Vitest, Playwright, etc.)
- Manual testing only (scenarios documented in README)

## Security #debt
- **No authentication** — anyone with network access can use all endpoints
- **No authorization** — no role-based access control
- Station kiosk PINs stored in plain text in database
- No rate limiting on API endpoints
- No CSRF protection
- Helmet provides basic security headers only

## Error Handling #debt
- Controllers use basic try/catch with generic error messages
- No centralized error handling middleware
- Frontend shows generic toast errors in some cases
- express-validator imported but not consistently applied

## Code Quality #debt
- `pbom.controller.ts` is 41KB — should be split into smaller modules
- Some controllers mix business logic with data access
- No consistent input validation layer
- README.md references old SQLite setup (now Supabase)
- `database/capsule_erp.db` is legacy (unused since Supabase migration)

## Performance #debt
- No database query optimization or indexing audit
- No pagination on list endpoints (could be slow with many records)
- No caching layer (relies on React Query client-side only)
- No lazy loading of frontend routes

## Documentation #debt
- API documentation is in README only (no OpenAPI/Swagger)
- No inline JSDoc comments on controllers
- No architecture decision records (ADRs)

---
See also: [[Feature Status]] · [[Roadmap]]
