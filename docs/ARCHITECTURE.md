# UserTests Architecture

## Implementation Order

| Phase | PRD | Component | Status |
|-------|-----|-----------|--------|
| 1 | PRD-00 | Foundation (schema, types, project config) | 🔧 Building |
| 2 | PRD-05 | Task Tracker (signals → tasks → evidence) | |
| 3 | PRD-07 | Screener & Recruitment | |
| 4 | PRD-01+04 | Interview System + JTBD Agent | |
| 5 | PRD-02 | Recording Pipeline (SDK) | |
| 6 | PRD-03 | Analytics Engine | |
| 7 | PRD-06 | pi.dev CLI Harness | |
| 8 | PRD-08 | Analysis Dashboard | |
| 9 | PRD-09 | Self-Improvement Loop (v2) | |

## Data Flow

```
Screener (PRD-07) → Interview (PRD-01/04) → Recording (PRD-02)
                                                    ↓
                                            Analytics (PRD-03)
                                                    ↓
                                            Task Tracker (PRD-05)
                                                    ↓
                                            pi.dev Harness (PRD-06)
                                                    ↓
                                            Dashboard (PRD-08)
```

## Database Schema (D1)

### Core Entities
- `users` — Authenticated users (from whitelabel)
- `projects` — Tenant boundary, owns all data
- `project_members` — User ↔ Project membership

### Interview & Recording
- `sessions` — Interview sessions
- `session_messages` — Chat messages per session
- `session_events` — User interaction events (clicks, nav)
- `audio_chunks` — R2 references for recorded audio

### Intelligence
- `signals` — JTBD signals extracted from sessions
- `tasks` — Actionable items derived from signals
- `task_signals` — Many-to-many: tasks ↔ signals

### Screener
- `screeners` — Qualification landing pages
- `screener_questions` — Questions per screener
- `screener_responses` — Participant answers
- `screener_results` — Qualification outcomes

### Implementation (PRD-06)
- `implementations` — PR tracking, impact measurement

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Compute | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Queue | Cloudflare Queues |
| KV | Cloudflare KV |
| Framework | Hono (API), React 19 (Frontend) |
| ORM | Kysely |
| DI | InversifyJS |
| Voice AI | OpenAI Realtime API |
| Analysis | Claude (Anthropic) |
| Transcription | OpenAI Whisper |
