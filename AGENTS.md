# UserTests — Agent Instructions

## Verify changes
```bash
npm test && npm run typecheck && npm run lint
```

## Do NOT modify
- `db/migrations/` — existing migrations are immutable
- `wrangler*.toml` — deployment configuration
- `.env*` — environment secrets
- `AGENTS.md` — this file

## Patterns
- **Routes:** Hono with auth/project middleware
- **DAOs:** Kysely with `@injectable()` decorator, registered in `src/core/container.ts`
- **Frontend:** React 19 + Zustand for routing state
- **Tests:** Vitest
- **IDs:** `generateId()` from `src/shared/id.ts`
