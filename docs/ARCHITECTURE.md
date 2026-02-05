# UserTests Architecture

## Implementation Status

| Phase | PRD | Component | Status |
|-------|-----|-----------|--------|
| 1 | PRD-00 | Foundation (schema, types, DI, project CRUD) | ✅ Done |
| 2 | PRD-05 | Task Tracker (signals → tasks, priority scoring) | ✅ Done |
| 3 | PRD-07 | Screener & Recruitment (questions, qualification) | ✅ Done |
| 4 | PRD-01+04 | Interview System + JTBD Agent (7-phase) | ✅ Done |
| 5 | PRD-02 | Recording Pipeline (SDK, audio upload) | ✅ Done |
| 6 | PRD-03 | Analytics Engine (signal extraction, session processing) | ✅ Done |
| 7 | PRD-06 | pi.dev CLI Harness (spec gen, GitHub, impact) | ✅ Done |
| 8 | PRD-08 | Analysis Dashboard (overview, sessions, signals, tasks) | ✅ Done |
| 9 | PRD-09 | Self-Improvement Loop | ⏳ Deferred (v2) |

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
POST  /api/sdk/events
GET   /api/sdk/screener/:id
POST  /api/sdk/screener/:id/respond
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
```

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
