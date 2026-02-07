# UserTests Architecture

## Implementation Status (MVP)

| Phase | PRD | Component | Status | Notes |
|-------|-----|-----------|--------|-------|
| 1 | PRD-00 | Foundation (schema, types, DI, project CRUD) | ✅ Done | |
| 2 | PRD-05 | Task Tracker (signals → tasks, priority scoring) | ✅ Done | |
| 3 | PRD-07 | Screener & Recruitment (questions, qualification) | ✅ Done | Scheduling/incentives deferred |
| 4 | PRD-01+04 | Interview System + JTBD Agent (7-phase) | ✅ Done | HTTP-based; Durable Objects/WebSocket/voice deferred |
| 5 | PRD-02 | Recording Pipeline (SDK, audio upload) | ✅ Done | |
| 6 | PRD-03 | Analytics Engine (signal extraction, session processing, audio transcription) | ✅ Done | |
| 7 | PRD-06 | pi.dev CLI Harness (spec gen, GitHub branch+PR, impact sync-only) | ⚠️ Partial | Codebase file search not implemented (TODOs in spec-generator) |
| 8 | PRD-08 | Analysis Dashboard (overview, sessions, signals, tasks) | ✅ Done | Cost tracking, GDPR data management deferred |
| 9 | PRD-09 | Self-Improvement Loop | ⏳ Deferred | Post-MVP |

### MVP-Specific Status

| Component | Status | Notes |
|-----------|--------|-------|
| Audio transcription (Whisper) | ✅ Implemented | Queue handler → OpenAI Whisper API |
| Session processing status contract | ✅ Implemented | `processing_started` / `processed` / `processing_failed` events |
| Impact measurement | ✅ Sync API only | Queue path intentionally removed for MVP |
| Retry/backoff policy | ✅ Implemented | 60s → 300s → 900s, max 3 attempts |
| Session reprocess API + CLI | ✅ Implemented | `POST .../reprocess` + `npm run cli session reprocess` |
| Consent wiring | ✅ Implemented | Granular consent fields through screener → session |
| UTM forwarding | ✅ Implemented | URL query → screener response → DB |
| Rate limiting (public endpoints) | ✅ Implemented | Per-IP + per-session rate limits |
| Payload size limits | ✅ Implemented | Audio 10MB, screen 25MB, message 4000 chars, events 256KB |
| Implementation loop (branch + PR) | ✅ Implemented | Creates GitHub branch + PR with user evidence. Codebase file search skipped (see PRD-06 note above). |
| Production bindings parity | ✅ Verified | Processing worker has D1, R2, Queue in prod config |
| Smoke test script | ✅ Created | `scripts/mvp-smoke.sh` |
| Operations runbook | ✅ Created | `docs/runbooks/mvp-ops.md` |

### What MVP Does NOT Include

These are explicitly deferred. See individual PRDs in `docs/prd/` for full specs:

- **Real-time voice interviews** — PRD-01 describes Durable Objects + WebSocket + OpenAI Realtime speech-to-speech. MVP uses HTTP-based text chat with the JTBD agent. Voice is post-MVP.
- **Codebase context in spec generation** — PRD-06 describes gathering relevant files from the repo before generating specs. Currently skipped (TODOs in `spec-generator.ts`). Specs are still generated from signal evidence alone.
- **Cost tracking and GDPR data management UI** — PRD-08 describes usage/cost dashboards, session deletion by email, data export, retention settings. Not built. Dashboard covers sessions, signals, tasks, and screeners only.
- **Full autonomous pi.dev orchestration** — MVP creates specs and GitHub PRs, but does not invoke pi.dev as an autonomous coding agent. Human runs the implementation.
- **Auto-merge / auto-rollback policies** — PRs require human review and merge.
- **Advanced screener features** — Scheduling, calendar, incentive automation, quota segmentation.
- **PRD-09 self-improvement loop** — The meta-system where UserTests improves itself. Entirely post-MVP.
- **Async impact measurement** — Impact measurement is sync API only; no queue path.
- **Session replay / heatmaps** — Events are captured but no visual replay or heatmap UI.

## Data Flow

```
Screener (PRD-07) → Interview (PRD-01/04) → Recording (PRD-02)
                                                    ↓
                                         Queue: session.completed
                                                    ↓
                                            Analytics (PRD-03)
                                            - Transcription
                                            - Signal extraction
                                            - Task suggestion
                                                    ↓
                                            Task Tracker (PRD-05)
                                            - Priority scoring
                                            - Signal clustering
                                                    ↓
                                            pi.dev Harness (PRD-06)
                                            - Spec generation
                                            - PR creation
                                            - Impact measurement
                                                    ↓
                                            Dashboard (PRD-08)
                                            - Overview metrics
                                            - Session browser
                                            - Signal explorer
                                            - Task kanban
```

## Database Schema (D1)

14 tables across 6 migrations:

### Core (Migration 0001-0002)
- `users` — Auth users (Google OAuth)
- `projects` — Tenant boundary, SDK keys
- `project_members` — User ↔ Project membership

### Interview & Recording (Migration 0003)
- `sessions` — Interview sessions with phase tracking
- `session_messages` — Chat messages per session
- `session_events` — User interaction events
- `audio_chunks` — R2 references for recorded audio

### Intelligence (Migration 0004)
- `signals` — JTBD signals extracted from sessions
- `tasks` — Actionable items derived from signals
- `task_signals` — Many-to-many evidence linking

### Screener (Migration 0005)
- `screeners` — Qualification landing pages
- `screener_questions` — Questions with qualification rules
- `screener_responses` — Participant submissions

### Implementation (Migration 0006)
- `implementations` — PR tracking, impact measurement

## API Routes

### Authenticated (JWT)
```
GET/POST       /api/projects
GET/PATCH/DEL  /api/projects/:id
GET/POST       /api/projects/:id/sessions
GET/PATCH/DEL  /api/projects/:id/sessions/:id
POST           /api/projects/:id/sessions/:id/messages
POST           /api/projects/:id/sessions/:id/events
POST           /api/projects/:id/sessions/:id/reprocess
GET            /api/projects/:id/signals
POST           /api/projects/:id/signals/:id/link
GET/POST       /api/projects/:id/tasks
GET/PATCH/DEL  /api/projects/:id/tasks/:id
GET            /api/projects/:id/tasks/ready
POST           /api/projects/:id/tasks/:id/spec
POST           /api/projects/:id/tasks/:id/implement
POST           /api/projects/:id/tasks/:id/measure
GET/POST       /api/projects/:id/screeners
GET/PATCH/DEL  /api/projects/:id/screeners/:id
GET            /api/projects/:id/implementations
GET            /api/projects/:id/overview
```

### SDK (Project Key)
```
POST  /api/sdk/sessions
POST  /api/sdk/audio/upload
POST  /api/sdk/screen/upload
POST  /api/sdk/events
POST  /api/sdk/interview/:id/events      (compat)
GET   /api/sdk/screener/:id
POST  /api/sdk/screener/:id/respond
GET   /api/sdk/interview/:id
PATCH /api/sdk/interview/:id/participant
POST  /api/sdk/interview/:id/start
POST  /api/sdk/interview/:id/message
POST  /api/sdk/interview/:id/end
```

### Webhook
```
POST  /api/webhooks/github
```

## Frontend Routes

```
/                          Landing page
/login                     Google OAuth login
/profile                   Projects list
/p/:projectId              Dashboard overview
/p/:projectId/sessions     Sessions list
/p/:projectId/sessions/:id Session detail
/p/:projectId/signals      Signals explorer
/p/:projectId/tasks        Tasks kanban board
/p/:projectId/tasks/:id    Task detail
/p/:projectId/screeners    Screeners list
/p/:projectId/settings     Project settings
/u/screener/:screenerId    Public screener page
/u/interview/:sessionId    Public participant interview room
/u/complete/:sessionId     Public completion page
```

## Key MVP Decisions

These decisions deviate from the original PRDs and are intentional for MVP scope:

| Decision | Rationale |
|----------|-----------|
| HTTP chat instead of WebSocket/Durable Objects (PRD-01) | Simpler to ship; voice can be layered on later without changing the data model |
| Post-session signal extraction only (PRD-03) | Real-time detection adds complexity; batch processing via queue is sufficient |
| Sync-only impact measurement (PRD-06) | Queue-driven measurement deferred; API endpoint covers the pilot use case |
| No cost/usage tracking UI (PRD-08) | Cloudflare dashboard covers cost visibility for now |
| No GDPR data management UI (PRD-08) | Session/signal deletion available via API and CLI; no self-serve UI yet |

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Compute | Cloudflare Workers | Edge serverless |
| Database | Cloudflare D1 | SQLite at the edge |
| Storage | Cloudflare R2 | Audio/media blobs |
| Queue | Cloudflare Queues | Async processing |
| KV | Cloudflare KV | OAuth state |
| Backend | Hono | API framework |
| ORM | Kysely | Type-safe SQL |
| DI | InversifyJS | Dependency injection |
| Frontend | React 19 + Vite | UI framework |
| State | Zustand | Frontend state |
| Voice AI | OpenAI Realtime | Speech-to-speech (future) |
| Transcription | Whisper | Audio → text |
| Analysis | Claude (Anthropic) | Signal extraction |
| Auth | Google OAuth + JWT | User authentication |
