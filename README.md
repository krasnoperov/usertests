# UserTests

**UserTests is a closed-loop user research platform that interviews users, extracts JTBD signals, prioritizes work, and autonomously implements improvements—then re-interviews to measure impact.**

The key differentiator: **insights don't sit in reports; they become deployed code.**

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Interview  │────▶│   Extract   │────▶│  Prioritize │────▶│  Implement  │
│    Users    │     │   Signals   │     │    Tasks    │     │    Code     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                                                            │
       │                                                            │
       └────────────────── Re-interview to measure ─────────────────┘
```

1. **Interview** - AI conducts JTBD (Jobs-to-be-Done) voice interviews while capturing user interactions
2. **Extract** - Transcribe audio, correlate with behavior, identify struggle moments and desired outcomes
3. **Prioritize** - Cluster signals into tasks, rank by frequency/intensity/breadth
4. **Implement** - AI generates code fixes, creates PRs, deploys changes
5. **Measure** - Re-interview users to verify the problem was solved

## Current Status (MVP)

The MVP is functional and deployed to stage. Core loop works end-to-end:

- **Working:** Screener qualification, text-based JTBD interviews (7-phase agent), audio + screen recording, signal extraction (Claude), task prioritization, GitHub PR creation, CLI for all operations
- **Not yet built:** Real-time voice interviews (Durable Objects/WebSocket), autonomous pi.dev execution, cost tracking UI, GDPR self-serve deletion UI, session replay, scheduling/incentives
- **Known limitation:** Spec generation skips codebase file search (generates from signal evidence only)

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed status.

## Documentation

- [Architecture & Status](./docs/ARCHITECTURE.md) - Implementation status, tech stack, what's deferred
- [PRDs](./docs/prd/) - Product requirements (specs for current + future features)
- [Usage Guide](./docs/guides/mvp-usage.md) - How to use the platform (UI + CLI)
- [Operations Runbook](./docs/runbooks/mvp-ops.md) - Troubleshooting and operational procedures

## Components

| Component | Description |
|-----------|-------------|
| Interview System | Real-time AI voice interviewer using JTBD methodology |
| Recording Pipeline | SDK capturing audio + user interactions |
| Analytics Engine | Transcription and signal extraction |
| Task Tracker | Signal clustering and prioritization |
| Implementation Harness | AI code generation and deployment |
| Screener & Recruitment | User qualification and scheduling |
| Public Participant Flow | External screener → interview room → completion journey |
| Analysis Dashboard | Insights visualization and data management |

## Public Participant Routes

- `/u/screener/:screenerId` - Public screener and consent form
- `/u/interview/:sessionId` - Public interview room (chat + mic + screen recording)
- `/u/complete/:sessionId` - Thank-you/completion status page

These routes are intentionally isolated from the authenticated dashboard shell.

## Recording & Privacy Notes

For participant sessions, the platform currently records:
- Audio chunks (`audio/{sessionId}/chunk-*.webm` in R2 + `audio_chunks` table refs)
- Screen chunks (`screen/{sessionId}/chunk-*.webm` in R2 + `session_events` linkage)
- Session events (click/navigation/markers and recording metadata in `session_events`)
- Chat messages (`session_messages`)

Public pages use project public keys for SDK auth (`X-Project-Key` / `key`) and do not expose project secret keys.

## CLI

Run the CLI with:

```bash
npm run cli help
```

### Authentication

```bash
npm run cli auth login --env stage
npm run cli auth whoami --env stage
npm run cli auth whoami --env stage --no-verify
npm run cli auth logout --env stage
```

Legacy aliases are preserved:

```bash
npm run cli login --env stage
npm run cli logout --env stage
```

### Command Matrix

- `auth`: `login`, `logout`, `whoami`
- `project`: `list`, `create`, `get`, `update`
- `session`: `list`, `create`, `start`, `send`, `end`, `get`
- `signal`: `list`, `link`
- `task`: `list`, `get`, `update-status`, `spec`, `implement`, `measure`
- `screener`: `list`, `create`, `get`, `respond`
- `implementation`: `list`, `get`
- `api`: generic HTTP passthrough

### Environment Profiles

All command groups support:

- `--env stage`
- `--env production`
- `--env local` (or `--local`)

Examples:

```bash
npm run cli project list --env stage
npm run cli project list --env production
```

### Cookbook (No raw curl)

```bash
npm run cli auth login --env stage
npm run cli project create --name "Demo"
npm run cli project list
npm run cli session create <projectId> --name Alice
npm run cli session start <sessionId> --key <publicKey>
npm run cli session send <sessionId> --key <publicKey> --message "Hello"
npm run cli session end <sessionId> --key <publicKey>
npm run cli signal list <projectId>
npm run cli task list <projectId>
```

You can also run the scripted flow:

```bash
./scripts/cli-acceptance.sh stage
```

### `api` Command (gh-style)

```bash
npm run cli api GET /api/projects
npm run cli api POST /api/projects --data '{"name":"Demo"}'
npm run cli api GET /api/projects --json
npm run cli api POST /api/sdk/interview/<sessionId>/start --key <projectKey>
npm run cli api GET /api/health --raw --env production
```
