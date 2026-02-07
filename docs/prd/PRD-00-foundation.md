# PRD-00: Foundation

## Overview

This PRD defines the foundational layer that all other PRDs build upon: the core data model, technology stack, API conventions, and authentication model. Every other PRD references these foundations to ensure consistency across the platform.

---

## User Problem

Product teams struggle to connect user feedback directly to code changes. Current tools create silos between user research, product decisions, and engineering work. Teams need a unified system that captures user interviews, extracts actionable insights, and tracks those insights through to implementation and impact measurement.

---

## Key Features

- **Multi-tenant project system** with isolated data boundaries and SDK authentication keys
- **User authentication** via Google OAuth for dashboard access
- **SDK authentication** via public/secret key pairs for embedded widgets
- **Consistent API conventions** with standardized error handling, pagination, and filtering
- **Edge-first architecture** for low-latency global access
- **Unified data model** connecting interviews to insights to implementations

---

## Core Entities

### User
The authenticated human using the system. Owns one or more projects.

### Project
The tenant boundary. All data belongs to a project. A project:
- Is owned by a User
- Can link to a GitHub Repository
- Contains Sessions, Signals, Tasks, and Screeners
- Has SDK keys (public + secret) for embedded access

### Session
A single user interview. The atomic unit of data collection.
- Belongs to a Project
- May reference a Screener (if participant came through screening)
- Produces Signals after processing
- Stores audio, events, and transcript data

### Signal
A JTBD (Jobs-to-be-Done) insight extracted from a session.
- Extracted from a Session
- Belongs to a Project (denormalized for queries)
- May be linked to a Task
- Types include: struggling moment, desired outcome, workaround, trigger event, hiring criteria, firing moment, emotional peak

### Task
An actionable item derived from signals.
- Belongs to a Project
- Linked to multiple Signals as evidence
- May have an Implementation (PR, branch)
- Tracks measurement data (baseline vs. current rates)
- Types: bug, improvement, feature, research

### Screener
A landing page that qualifies participants before interviews.
- Belongs to a Project
- Contains qualification questions
- Links qualified participants to Sessions
- Tracks view, qualified, and disqualified counts

### Screener Response
A participant's answers to screener questions.
- Belongs to a Screener
- May link to a Session (if qualified)

---

## Technology Stack

| Layer | Technology | Purpose | Status |
|-------|------------|---------|--------|
| Compute | Cloudflare Workers | Edge serverless functions | Active |
| Database | Cloudflare D1 | SQLite at the edge | Active |
| Storage | Cloudflare R2 | Audio/video blob storage | Active |
| Queues | Cloudflare Queues | Async job processing | Active |
| Cache | Cloudflare KV | OAuth state | Active |
| Backend Framework | Hono | Lightweight web framework | Active |
| Frontend | React 19 + Vite | UI and build tooling | Active |
| Transcription | OpenAI Whisper | Audio to text | Active |
| Analysis | Claude (Anthropic) | Signal extraction | Active |
| Source Control | GitHub | Repository + PRs | Active |
| Auth | Google OAuth | User authentication | Active |
| Real-time | Durable Objects | WebSocket + session state | Post-MVP |
| Voice AI | OpenAI Realtime API | Speech-to-speech interviews | Post-MVP |
| Task Providers | GitHub API (+ future Jira, Linear) | External task sync | Active |

---

## Success Criteria

- Users can authenticate via Google OAuth and create projects within 60 seconds
- SDK keys are generated automatically for each project
- API response times average under 100ms at the edge
- All core entities (User, Project, Session, Signal, Task, Screener) can be created, read, updated, and deleted
- Authentication works for both dashboard (JWT) and SDK (project keys) contexts
- Data isolation is enforced: users can only access their own projects' data
- Storage operations (R2) and database operations (D1) function correctly
- Queue messages are sent and consumed successfully

---

## Dependencies

### What This PRD Provides

All other PRDs depend on Foundation for:

- Database schema and D1 bindings
- R2 storage configuration
- Authentication middleware (OAuth + SDK keys)
- API conventions (error handling, pagination, ID format)
- Core entity definitions and relationships
- Cloudflare bindings configuration

### What This PRD Requires

- Cloudflare account with Workers, D1, R2, KV, and Queues enabled
- Google OAuth application credentials
- OpenAI API access
- Anthropic API access
- GitHub OAuth/token for repository integration

---

## PRD Dependency Map

```
PRD-00 (Foundation) <-- All PRDs depend on this

PRD-01 (Interview Engine)
    Uses: Session, D1 (MVP: HTTP chat; later: Durable Objects, WebSocket)

PRD-02 (Recording SDK)
    Uses: R2 storage, Session, Project keys

PRD-03 (Signal Extraction)
    Uses: Queues, Signal, Session

PRD-04 (Interview Agent)
    Uses: OpenAI binding, Session

PRD-05 (Task Tracker)
    Uses: Task, Signal

PRD-06 (Task Providers)
    Uses: Task, GitHub integration, CLI

PRD-07 (Screener)
    Uses: Screener, Session

PRD-08 (Dashboard)
    Uses: All entities, Frontend framework

PRD-09 (Self-improvement)
    Uses: All of the above
```
