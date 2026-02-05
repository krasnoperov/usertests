# UserTests System Review

## Executive Summary

A **self-building, self-improving** user research platform powered by pi.dev:

```
                         pi.dev
                           |
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
        BUILDS          OPERATES       IMPROVES
      (bootstrap)    (fix user pain)  (meta-loop)
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
                      UserTests
```

**The core loop:**
1. Interview users about product experience (voice AI)
2. Extract JTBD signals from what they say
3. Create tasks from pain points with user quotes as evidence
4. **pi.dev implements fixes** autonomously
5. Deploy and measure impact
6. Re-interview to verify improvement
7. Repeat

---

## pi.dev as Central Nervous System

pi.dev isn't a helper tool - it's the **engine that powers everything:**

### 1. Bootstrap Phase
pi.dev builds UserTests itself from these PRDs. The system is self-creating.

### 2. Operational Phase
pi.dev consumes tasks from the tracker and implements fixes based on real user evidence.

### 3. Meta-improvement Phase
UserTests interviews its own users, extracts signals about UserTests itself, and pi.dev improves UserTests using UserTests.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PI.DEV ORCHESTRATION LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │   EXTERNAL   │    │   USERTESTS  │    │  USERTESTS   │                  │
│  │   PROJECTS   │    │   (product)  │    │   (meta)     │                  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                   │                           │
│         └───────────────────┼───────────────────┘                           │
│                             │                                               │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        TASK QUEUE                                    │   │
│  │   [task_a: "Fix export button"] [task_b: "Improve interview UI"]    │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          pi.dev                                      │   │
│  │   1. Read task with user evidence                                    │   │
│  │   2. Gather codebase context                                         │   │
│  │   3. Generate implementation                                         │   │
│  │   4. Create PR with user quotes                                      │   │
│  │   5. Track deployment                                                │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      DEPLOYED CHANGES                                │   │
│  │   → Measure signal rate change                                       │   │
│  │   → Verify user pain reduced                                         │   │
│  │   → Feed results back to task tracker                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## System Components (All PRDs)

### PRD-01: Interview Engine (Durable Object)

**Purpose:** Real-time voice conversation with users using JTBD methodology

| Feature | MVP | Later |
|---------|-----|-------|
| Real-time voice via OpenAI Realtime API | Yes | - |
| WebSocket session management | Yes | - |
| 7-phase JTBD interview structure | Yes | - |
| Session state in Durable Object | Yes | - |
| Card-based async mode | - | Yes |
| Mobile-optimized mode | - | Yes |
| Multi-language support | - | Yes |
| Custom interview templates | - | Yes |

---

### PRD-02: Recording SDK

**Purpose:** Capture audio + interactions from any website via embeddable SDK

| Feature | MVP | Later |
|---------|-----|-------|
| Audio recording to R2 | Yes | - |
| Click tracking (JSONL) | Yes | - |
| Navigation/URL changes | Yes | - |
| ~15KB SDK bundle | Yes | - |
| **Consent dialog (GDPR)** | Yes | - |
| **Consent API & storage** | Yes | - |
| **Data retention policy** | Yes | - |
| **Script tag embedding** | Yes | - |
| **ES module export** | Yes | - |
| **CORS validation** | Yes | - |
| React SDK (`@usertests/react`) | - | Yes |
| Vue SDK | - | Yes |
| Screen video recording | - | Yes |
| Scroll/viewport tracking | - | Yes |
| DOM snapshot | - | Yes |
| Custom consent UI | - | Yes |

---

### PRD-03: Signal Extraction Pipeline

**Purpose:** Process recordings into JTBD signals using Claude

| Feature | MVP | Later |
|---------|-----|-------|
| Audio transcription (Whisper) | Yes | - |
| Timeline merging (transcript + events) | Yes | - |
| JTBD signal extraction (Claude) | Yes | - |
| VTT output for display | Yes | - |
| Queue-based async processing | Yes | - |
| Real-time signal detection | - | Yes |
| Multi-session pattern detection | - | Yes |
| Sentiment analysis | - | Yes |
| Speaker diarization | - | Yes |

---

### PRD-04: JTBD Interview Agent

**Purpose:** AI agent that conducts user interviews following JTBD methodology

| Feature | MVP | Later |
|---------|-----|-------|
| System prompt with JTBD structure | Yes | - |
| Phase transitions (7 phases) | Yes | - |
| Basic probing questions | Yes | - |
| Emotional moment detection | Yes | - |
| Tangent recovery | Yes | Basic |
| LLM-based signal confidence | - | Yes |
| Dynamic question adaptation | - | Yes |
| Quality scoring per session | - | Yes |
| Interview coaching feedback | - | Yes |

---

### PRD-05: Task Tracker

**Purpose:** Convert signals into actionable tasks with user evidence

| Feature | MVP | Later |
|---------|-----|-------|
| Manual task creation | Yes | - |
| Link signals as evidence | Yes | - |
| Simple priority (high/med/low) | Yes | - |
| Task status workflow | Yes | - |
| User quotes on tasks | Yes | - |
| Auto-task creation from signals | - | Yes |
| Similarity matching (dedup) | - | Yes |
| Auto priority recalculation | - | Yes |
| Impact score tracking | - | Yes |
| Sprint planning integration | - | Yes |

---

### PRD-06: pi.dev CLI Harness (CORE)

**Purpose:** Bridge between user insights and code implementation

**This is the central component - DO NOT simplify**

| Feature | MVP | Later |
|---------|-----|-------|
| `ut tasks list/show/update` | Yes | - |
| `ut implement prepare` (spec generation) | Yes | - |
| `ut implement run` (invoke pi.dev) | Yes | - |
| PiTaskSpec with user evidence | Yes | - |
| Codebase context gathering | Yes | - |
| Acceptance criteria generation | Yes | - |
| GitHub PR creation | Yes | - |
| Webhook for merge detection | Yes | - |
| `ut deploy mark/measure` | Yes | - |
| Auto-implement for high-priority | - | Yes |
| Auto-merge passing PRs | - | Yes |
| Multi-repo support | - | Yes |
| Rollback on negative impact | - | Yes |
| Learning from past implementations | - | Yes |
| Parallel implementations | - | Yes |

---

### PRD-07: Screener & Recruitment

**Purpose:** Landing pages to qualify and recruit users for interviews

| Feature | MVP | Later |
|---------|-----|-------|
| Landing page with questions | Yes | - |
| Pass/fail qualification logic | Yes | - |
| Thank you / redirect to interview | Yes | - |
| Basic branding | Yes | - |
| Email collection (optional) | Yes | - |
| Complex qualification rules | - | Yes |
| Quotas per segment | - | Yes |
| Calendar scheduling | - | Yes |
| Incentive management | - | Yes |
| A/B test screener variants | - | Yes |

---

### PRD-08: Analysis Dashboard

**Purpose:** View sessions, signals, and tasks in a unified interface

| Feature | MVP | Later |
|---------|-----|-------|
| Session list view | Yes | - |
| Session detail with transcript | Yes | - |
| Signal list with quotes | Yes | - |
| Task board (kanban) | Yes | - |
| Basic metrics (count, trends) | Yes | - |
| Implementation status | Yes | - |
| **Cost tracking display** | Yes | - |
| **Usage breakdown by service** | Yes | - |
| **Per-session cost view** | Yes | - |
| **Session deletion (GDPR)** | Yes | - |
| **Delete by participant email** | Yes | - |
| **Data export (JSON)** | Yes | - |
| **Retention settings UI** | Yes | - |
| Signal clusters | - | Yes |
| Heatmaps | - | Yes |
| Session replay | - | Yes |
| Shareable links | - | Yes |
| PDF export | - | Yes |
| Budget alerts | - | Yes |
| Team collaboration | - | Yes |

---

### PRD-09: Self-Improvement Loop (META)

**Purpose:** UserTests improves itself using its own tooling

| Feature | MVP | Later |
|---------|-----|-------|
| Manual dogfooding workflow | Yes | - |
| Meta-interview trigger (manual) | Yes | - |
| Track meta-signals separately | Yes | - |
| Bootstrap sequence docs | Yes | - |
| Auto-trigger meta-interviews | - | Yes |
| Circuit breakers | - | Yes |
| Auto-rollback on regression | - | Yes |
| Meta-metrics dashboard | - | Yes |
| Improvement velocity tracking | - | Yes |

---

## Coherence Resolutions

### Issue 1: Event Tracking Ownership

**Problem:** PRD-01 has `InterviewTracker`, PRD-02 has `EventTracker`

**Resolution:**
- PRD-02 SDK is the **source of truth** for all recording
- PRD-01 uses PRD-02's SDK, does not duplicate tracking
- SDK exports `InterviewSDK` that includes both audio + events

```typescript
// PRD-01 uses SDK from PRD-02
import { InterviewSDK } from '@usertests/sdk';

const sdk = new InterviewSDK({
  sessionId: 'xxx',
  endpoints: { ... }
});

sdk.startRecording();  // Audio + events
sdk.trackClick(event); // Delegated to SDK
```

---

### Issue 2: Signal Extraction Timing

**Problem:** Real-time (PRD-01) vs post-session (PRD-03)

**Resolution:** Keep both, but clear roles:

| Mode | PRD | When | Use Case |
|------|-----|------|----------|
| Post-session | PRD-03 | MVP | Primary analysis, full context |
| Real-time | PRD-01 | Later | Live indicators, optional |

**MVP:** Post-session only via PRD-03 pipeline
**Later:** Add real-time hints as enhancement (non-blocking)

---

### Issue 3: Format Standardization

**Problem:** VTT vs JSONL inconsistency

**Resolution:** Clear format ownership:

```
Recording (PRD-02):  JSONL  → Compact, append-friendly, raw
Processing (PRD-03): VTT   → Timeline display, timestamps
Storage: Keep both
  - R2: audio.webm, events.jsonl (raw)
  - D1: timeline.vtt, signals.json (processed)
```

---

### Issue 4: Session State Lifecycle

**Problem:** State split between Durable Object and D1

**Resolution:** Clear ownership with migration:

```
┌─────────────────────────────────────────────────────────────┐
│                   SESSION LIFECYCLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   START ──► DURABLE OBJECT ──► END ──► QUEUE ──► D1        │
│              (ephemeral)                 (permanent)         │
│                                                              │
│   - Active session state     - Session record               │
│   - WebSocket connection     - Processed signals            │
│   - Real-time events         - Task links                   │
│   - OpenAI session           - Implementation history       │
│                                                              │
│   TTL: session duration      TTL: forever                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Issue 5: Interview Modes

**Problem:** Too many modes (voice, card-based, async)

**Resolution:** Keep all, phase delivery:

| Mode | MVP | Later | Use Case |
|------|-----|-------|----------|
| Real-time voice | Yes | - | Primary, richest data |
| Card-based async | - | v2 | Mobile, low-bandwidth |
| Scheduled voice | - | v2 | Calendar integration |

---

## Cross-cutting Concerns (Now Addressed)

All previously identified gaps have been added to their respective PRDs:

| Concern | Now In | Details |
|---------|--------|---------|
| **Project/Multi-tenancy** | PRD-00 | Full Project model, SDK keys, settings |
| **Cost Tracking** | PRD-08 | Usage table, per-service breakdown, dashboard display |
| **Privacy/GDPR** | PRD-02 + PRD-08 | Consent dialog & API (PRD-02), deletion & export (PRD-08) |
| **Error Handling** | Each PRD | Session error states, retry logic, graceful degradation |
| **SDK Embedding** | PRD-02 | Script tag, ES module, React guide, CORS, CSP |

### Error Handling Strategy (Reference)

Each PRD now handles its own error cases, but the general strategy is:

| Failure | Handling |
|---------|----------|
| OpenAI API down | Graceful disconnect, session saved as partial |
| Upload fails | Retry 3x, then mark session as incomplete |
| Processing fails | Queue for retry, error state in DB |
| pi.dev fails | Task stays as "ready", attempt logged |
| GitHub API down | Queue PR creation, retry later |

---

## MVP Build Sequence

### Phase 0: Bootstrap (Week 0)
pi.dev builds the foundation from whitelabel template:
- Project structure
- D1 schema
- Basic API routes
- Auth integration

### Phase 1: Interview + Recording (Weeks 1-2)
- PRD-01: Durable Object + WebSocket
- PRD-02: Recording SDK (audio + clicks)
- PRD-04: Basic interview agent
- Integration: Voice conversation that records

**Milestone:** User can have a 20-min voice interview, recording saved

### Phase 2: Processing (Weeks 3-4)
- PRD-03: Transcription pipeline
- PRD-03: Signal extraction
- PRD-05: Basic task model
- Integration: Session → Signals → Tasks

**Milestone:** Session produces transcript + 3-5 signals

### Phase 3: Dashboard (Weeks 5-6)
- PRD-08: Session list
- PRD-08: Signal view with quotes
- PRD-08: Task board
- Integration: Full visibility

**Milestone:** View sessions, signals, tasks in UI

### Phase 4: Screener + pi.dev (Weeks 7-8)
- PRD-07: Basic landing page
- PRD-06: CLI commands
- PRD-06: Spec generation
- PRD-06: pi.dev invocation

**Milestone:** Qualify users, implement fixes via pi.dev

### Phase 5: Loop Closure (Weeks 9-10)
- PRD-06: PR creation + merge detection
- PRD-09: Manual dogfooding
- PRD-05: Impact tracking
- Integration: Full cycle

**Milestone:** Deploy fix, measure signal reduction

---

## Technology Stack

| Layer | Technology | Owner PRD |
|-------|------------|-----------|
| Frontend | React 19, Vite | PRD-08 |
| Backend | Cloudflare Workers, Hono | All |
| Database | D1 (SQLite) | All |
| Auth | Google OAuth (+ anonymous for interviews) | PRD-01, PRD-07 |
| Real-time | Durable Objects + WebSocket | PRD-01 |
| Storage | R2 | PRD-02 |
| Queues | Cloudflare Queues | PRD-03 |
| AI - Voice | OpenAI Realtime API | PRD-01, PRD-04 |
| AI - Transcription | Whisper (CF AI or OpenAI) | PRD-03 |
| AI - Analysis | Claude Sonnet | PRD-03 |
| Implementation | pi.dev | PRD-06 |
| CLI | Commander.js | PRD-06 |

---

## Data Flow (Complete)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  [Screener]          [Interview]           [Processing]         [Dashboard]
      │                    │                      │                    │
      ▼                    ▼                      ▼                    ▼
┌──────────┐        ┌──────────────┐       ┌──────────────┐    ┌──────────────┐
│  Land on │        │  Voice chat  │       │  Transcribe  │    │    View      │
│  page    │───────►│  with AI     │──────►│  + Extract   │───►│   insights   │
│          │ qualify│              │ end   │   signals    │done│              │
└──────────┘        └──────────────┘       └──────────────┘    └──────────────┘
                           │                      │                    │
                           │ record               │ save               │ create
                           ▼                      ▼                    ▼
                    ┌──────────────┐       ┌──────────────┐    ┌──────────────┐
                    │     R2       │       │     D1       │    │    Task      │
                    │  audio.webm  │       │   session    │    │   Tracker    │
                    │  events.jsonl│       │   signals    │    │              │
                    └──────────────┘       │   timeline   │    └──────┬───────┘
                                          └──────────────┘           │
                                                                      │ ready
                                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PI.DEV LAYER                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐       ┌──────────────┐    ┌──────────────┐
                    │   Generate   │       │    Invoke    │    │   Create     │
              ─────►│    Spec      │──────►│    pi.dev    │───►│     PR       │
                    │  + context   │       │              │    │              │
                    └──────────────┘       └──────────────┘    └──────┬───────┘
                                                                      │
                                                                      │ merge
                                                                      ▼
                    ┌──────────────┐       ┌──────────────┐    ┌──────────────┐
                    │   Update     │       │   Measure    │    │   Deploy     │
              ◄─────│   Task       │◄──────│   Impact     │◄───│   Webhook    │
                    │              │       │              │    │              │
                    └──────────────┘       └──────────────┘    └──────────────┘
                           │
                           │ if signal rate drops
                           ▼
                    ┌──────────────┐
                    │   SUCCESS    │
                    │  User pain   │
                    │  resolved    │
                    └──────────────┘
```

---

## Success Criteria

### MVP Launch Checklist

**Core Flow:**
- [ ] Conduct 20-minute voice interview
- [ ] Recording saved to R2 (audio + clicks)
- [ ] Transcript generated via Whisper
- [ ] 3+ JTBD signals extracted per session
- [ ] Signals visible in dashboard with quotes
- [ ] Create task from signal with evidence
- [ ] Generate PiTaskSpec for task
- [ ] Invoke pi.dev and get implementation
- [ ] Create PR with user quotes
- [ ] Track deployment and mark complete

**Consent & Privacy:**
- [ ] Consent dialog shown before recording
- [ ] Consent stored in database
- [ ] Session deletion works (cascade to R2 + D1)
- [ ] Data export generates downloadable JSON

**Cost Tracking:**
- [ ] Usage tracked for each API call
- [ ] Cost breakdown visible in dashboard
- [ ] Per-session costs displayed

**SDK Embedding:**
- [ ] Script tag works on external site
- [ ] CORS validation prevents unauthorized origins
- [ ] ES module import works

### Metrics to Track
| Metric | Target | Notes |
|--------|--------|-------|
| Interview duration | < 25 min | Time per session |
| Signals per session | 3-5 | Quality indicator |
| Cost per interview | Track | ~$1.50-2.00 estimate |
| Spec → PR time | < 10 min | pi.dev speed |
| Signal reduction | > 30% | Impact measurement |
| SDK bundle size | < 15KB | Gzipped |

---

## Decisions Made

| Question | Decision | Implemented In |
|----------|----------|----------------|
| Anonymous vs Authenticated | Email optional, encouraged for follow-up | PRD-02 consent flow |
| Cost Model | Track usage, pricing decision later | PRD-08 cost tracking |
| Auto-merge Safety | Never auto-merge in MVP. Human review required. | PRD-06 |
| Multi-project | Implicit single project in MVP, explicit later | PRD-00 |
| Dogfooding Priority | Manual workflow in MVP, part of launch | PRD-09 |

## Remaining Open Questions

1. **Budget Alerts**
   - When to notify users about spending? (Later feature)

2. **Data Retention Defaults**
   - Current: 90 days audio, 365 days transcripts
   - Should users be able to extend indefinitely?

3. **Consent Granularity**
   - Current: recording, analytics, follow-up as separate checkboxes
   - Is this the right split?

---

## PRD Completeness

All PRDs are now complete with:

| PRD | Status | Cross-cutting Concerns |
|-----|--------|------------------------|
| PRD-00 | Complete | Foundation: data model, stack, schema, API conventions |
| PRD-01 | Complete | Interview engine with session error states |
| PRD-02 | Complete | **+ Consent/GDPR, SDK embedding guide** |
| PRD-03 | Complete | Signal extraction with processing errors |
| PRD-04 | Complete | JTBD interview agent |
| PRD-05 | Complete | Task tracker |
| PRD-06 | Complete | pi.dev harness (CORE) |
| PRD-07 | Complete | Screener & recruitment |
| PRD-08 | Complete | **+ Cost tracking, data management/GDPR** |
| PRD-09 | Complete | Self-improvement loop |

---

## Next Steps

1. **Final review** - Confirm MVP vs Later boundaries are correct
2. **Build Phase 0** - Bootstrap project structure via pi.dev
3. **Implement Phase 1** - Interview + Recording (Weeks 1-2)
4. **Iterate weekly** - Ship early, dogfood with own tooling
5. **Close the loop** - Use UserTests to improve UserTests
