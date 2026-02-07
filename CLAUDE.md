# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**UserTests** is a user research platform that:
1. Conducts JTBD (Jobs-to-be-Done) AI interviews (text chat; voice is post-MVP)
2. Extracts signals from sessions (struggling moments, desired outcomes, workarounds, etc.)
3. Prioritizes work into tasks based on user evidence
4. Generates specs and GitHub PRs for implementation (autonomous pi.dev execution is post-MVP)
5. Measures impact by comparing signal rates before and after deployment

Built on Cloudflare Workers with React 19 frontend.

## Essential Commands

### Development
```bash
npm run dev                  # Start frontend (Vite:3002) + worker (Wrangler:8788)
npm run dev:frontend         # Vite dev server only
npm run dev:worker           # Wrangler worker only
```

### Testing & Quality
```bash
npm test                     # Run all tests
npm run typecheck            # TypeScript type checking
npm run lint                 # ESLint
```

### Database
```bash
npm run db:migrate                # Apply migrations locally
npm run db:migrate:stage          # Stage environment
npm run db:migrate:production     # Production
```

### Deployment
```bash
npm run deploy:stage              # Main worker to stage
npm run deploy:production         # Main worker to production
```

## Architecture

### Dual-Worker Architecture
- **Main Worker** (`src/worker/unified.ts` → `wrangler.toml`): HTTP API + React frontend
- **Processing Worker** (`src/worker/processing.ts` → `wrangler.processing.toml`): Queue consumption + workflows

### Directory Structure
```
src/
├── api/                  # Shared API types
├── backend/
│   ├── features/auth/    # Google OAuth + JWT
│   ├── middleware/        # Auth, project access, SDK auth, upload security
│   ├── routes/            # Hono API endpoints
│   │   ├── projects.ts    # PRD-00: Project CRUD
│   │   ├── sessions.ts    # PRD-01: Session management
│   │   ├── signals.ts     # PRD-03: Signal CRUD
│   │   ├── tasks.ts       # PRD-05: Task management
│   │   ├── screeners.ts   # PRD-07: Screener CRUD + public SDK
│   │   ├── interview.ts   # PRD-01/04: Interview flow (SDK)
│   │   ├── implementations.ts # PRD-06: pi.dev harness
│   │   ├── sdk.ts         # PRD-02: Recording SDK endpoints
│   │   └── overview.ts    # PRD-08: Dashboard metrics
│   └── services/
│       ├── interview/     # PRD-04: JTBD agent + prompts
│       ├── analytics/     # PRD-03: Signal extraction + session processing
│       ├── harness/       # PRD-06: Spec generation, GitHub, impact
│       └── tasks/         # PRD-05: Priority scoring, signal clustering
├── cli/                   # CLI tool
├── core/                  # DI container, env types
├── dao/                   # Data access objects (Kysely)
│   ├── project-dao.ts
│   ├── session-dao.ts
│   ├── signal-dao.ts
│   ├── task-dao.ts
│   ├── screener-dao.ts
│   └── implementation-dao.ts
├── db/                    # Database types
├── frontend/
│   ├── pages/             # React pages (dashboard, sessions, signals, tasks)
│   ├── components/        # Shared components
│   ├── lib/api.ts         # API client
│   └── stores/            # Zustand state (routing)
├── sdk/                   # PRD-02: Recording SDK for embedding
│   └── recorder.ts
├── shared/                # Shared utilities (ID generation)
└── worker/                # Worker entry points
```

### Database (D1)
14 tables across 6 migrations:
- `users` — Auth (from whitelabel)
- `projects`, `project_members` — Tenant boundary
- `sessions`, `session_messages`, `session_events`, `audio_chunks` — Interview data
- `signals`, `tasks`, `task_signals` — JTBD extraction + task management
- `screeners`, `screener_questions`, `screener_responses` — Recruitment
- `implementations` — pi.dev harness tracking

### Key Patterns

**Adding an API endpoint:**
1. Create route handler in `src/backend/routes/`
2. Register in `registerRoutes()` (`src/backend/routes/index.ts`)
3. Use `createAuthMiddleware()` for authenticated routes
4. Use `createProjectMiddleware()` for project-scoped routes
5. Use `createSDKAuthMiddleware()` for public SDK routes

**Adding a DAO:**
1. Create in `src/dao/` with `@injectable()` decorator
2. Bind in `src/core/container.ts`
3. Add symbol to `src/core/di-types.ts`

**Queue processing:**
Messages dispatched to `src/backend/queue-handler.ts`
Types: `session.completed`, `audio.transcribe`, `signals.extract`
(Note: `impact.measure` was removed for MVP — impact measurement is sync API only)

## Environment Variables

Required:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `OIDC_*` — JWT configuration
- `ANTHROPIC_API_KEY` — Signal extraction + interview agent

Optional:
- `OPENAI_API_KEY` — Whisper transcription
- `GITHUB_TOKEN` — PRD-06 harness PR creation
