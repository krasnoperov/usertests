# UserTests: Self-Improving User Research Platform

## Vision
A platform that interviews users using Jobs-to-be-Done methodology, captures rich behavioral data (voice, screen, interactions), and uses AI to generate actionable improvements—then implements those improvements autonomously via pi.dev harness.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER TOUCHPOINTS                             │
├─────────────────────────────────────────────────────────────────────┤
│  Screener Landing Pages  │  Chat Interview UI  │  Session Recording │
└──────────┬───────────────┴─────────┬───────────┴─────────┬──────────┘
           │                         │                     │
           ▼                         ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE EDGE (Workers)                       │
├─────────────────────────────────────────────────────────────────────┤
│  Pages (Static)  │  Workers (API)  │  Durable Objects  │  R2 Storage│
│  - Screeners     │  - Chat API     │  - Session State  │  - Videos  │
│  - Interview UI  │  - Recording    │  - Interview Flow │  - Audio   │
│                  │  - Analytics    │  - Rate Limiting  │  - Logs    │
└──────────────────┴────────┬────────┴───────────────────┴────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INTELLIGENCE LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  Realtime Processing          │  Batch Analysis                      │
│  - Whisper transcription      │  - Session aggregation               │
│  - Sentiment analysis         │  - Pattern recognition               │
│  - JTBD signal extraction     │  - Insight generation                │
│  - Live adaptation            │  - Task creation                     │
└───────────────────────────────┴──────────────────┬──────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TASK TRACKER & ACTION LAYER                     │
├─────────────────────────────────────────────────────────────────────┤
│  Internal Task DB (D1)        │  pi.dev Integration                  │
│  - Prioritized backlog        │  - Code generation                   │
│  - Evidence linking           │  - PR creation                       │
│  - Impact scoring             │  - Deploy triggers                   │
└───────────────────────────────┴─────────────────────────────────────┘
                                                   │
                                                   ▼
                                          ┌───────────────┐
                                          │   FEEDBACK    │
                                          │     LOOP      │
                                          │  (Measures    │
                                          │   Impact)     │
                                          └───────────────┘
```

---

## Product Design Documents Index

### PRD-01: Core Chat Interview System
### PRD-02: Multi-Modal Recording Pipeline
### PRD-03: Interaction Analytics Engine
### PRD-04: JTBD Agentic Interviewer
### PRD-05: Internal Task Tracker
### PRD-06: pi.dev CLI Harness
### PRD-07: Screener & Recruitment System
### PRD-08: Analysis Dashboard
### PRD-09: Self-Improvement Loop

---

# PRD-01: Core Chat Interview System

## Purpose
Real-time chat interface that conducts structured JTBD interviews while feeling conversational.

## Components

### 1.1 Frontend Chat UI
- **Tech**: Cloudflare Pages + Workers
- **Features**:
  - Typewriter effect for AI responses
  - Markdown rendering for rich content
  - Image/prototype embedding for context
  - Typing indicators, read receipts
  - Mobile-first responsive design
  - Accessibility (ARIA, keyboard nav)

### 1.2 Message Protocol
```typescript
interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'interviewer' | 'system';
  content: string;
  metadata: {
    timestamp: number;
    sentiment?: number;
    jtbdSignals?: JTBDSignal[];
    audioRef?: string;  // R2 key if voice
  };
}

interface JTBDSignal {
  type: 'struggling_moment' | 'desired_outcome' | 'hiring_criteria' | 'firing_moment';
  confidence: number;
  quote: string;
}
```

### 1.3 Session State (Durable Objects)
- Maintains conversation history
- Tracks interview progress (phases)
- Handles reconnection gracefully
- Persists to D1 on completion

### 1.4 API Endpoints
```
POST /api/session/start     - Initialize interview
POST /api/session/:id/msg   - Send message
GET  /api/session/:id/stream - SSE for responses
POST /api/session/:id/end   - Complete session
```

---

# PRD-02: Multi-Modal Recording Pipeline

## Purpose
Capture voice, screen, and video with high quality while minimizing user friction.

## Components

### 2.1 Audio Recording
- **Approach**: MediaRecorder API → chunked upload
- **Format**: WebM/Opus for streaming, convert to MP3 for storage
- **Features**:
  - Voice activity detection (skip silence)
  - Real-time transcription via Whisper
  - Background upload during recording

### 2.2 Screen Recording
- **Two modes**:
  1. **Streaming** (WebRTC): Lower quality, real-time analysis
  2. **Chunked upload** (Vimeo-style): Higher quality, post-processing

```typescript
interface RecordingConfig {
  mode: 'stream' | 'chunked';
  quality: 'low' | 'medium' | 'high';
  includeAudio: boolean;
  includeCamera: boolean;  // Picture-in-picture
}
```

### 2.3 Chunked Upload Pipeline
```
Browser                    Worker                    R2
   │                          │                       │
   │──chunk (5MB)────────────►│                       │
   │                          │──multipart upload────►│
   │◄─────────ack─────────────│                       │
   │──chunk (5MB)────────────►│                       │
   │                          │──multipart upload────►│
   │◄─────────ack─────────────│                       │
   │──complete───────────────►│                       │
   │                          │──complete upload─────►│
   │                          │◄─────manifest─────────│
   │◄────processing started───│                       │
```

### 2.4 Video Processing Queue
- Workers Queue for async processing
- Thumbnail extraction
- Highlight detection (emotion spikes)
- Transcript alignment

---

# PRD-03: Interaction Analytics Engine

## Purpose
Capture every user interaction to understand behavior beyond what they say.

## Components

### 3.1 Event Capture SDK
```typescript
interface InteractionEvent {
  type: 'click' | 'keypress' | 'scroll' | 'hover' | 'focus' | 'blur';
  timestamp: number;
  target: {
    selector: string;      // CSS selector path
    text?: string;         // Visible text (truncated)
    rect: DOMRect;         // Position
    attributes: Record<string, string>;
  };
  viewport: { width: number; height: number };
  scrollPosition: { x: number; y: number };
}
```

### 3.2 Heatmap Generation
- Aggregate click/hover data
- Per-page heatmaps
- Scroll depth tracking
- Rage click detection

### 3.3 Session Replay
- DOM snapshot + mutation observer
- Reconstruct session visually
- Sync with audio/video timeline
- Privacy: auto-mask sensitive fields

### 3.4 Pattern Detection
- Confusion indicators (back-forth navigation)
- Drop-off points
- Time-on-element analysis
- A/B variant correlation

---

# PRD-04: JTBD Agentic Interviewer

## Purpose
AI agent that conducts Jobs-to-be-Done interviews adaptively.

## Components

### 4.1 Interview Framework
```
JTBD Interview Phases:
1. Context Setting (2-3 min)
   - Build rapport
   - Understand user's role/situation

2. Timeline Discovery (5-7 min)
   - First thought about the problem
   - Passive looking phase
   - Active looking phase
   - Decision moment

3. Struggling Moments (3-5 min)
   - What wasn't working?
   - Emotional impact
   - Workarounds tried

4. Desired Outcomes (3-5 min)
   - What does success look like?
   - How would you measure it?

5. Hiring/Firing Criteria (2-3 min)
   - What made you choose this?
   - What would make you switch?
```

### 4.2 Agentic Core
```typescript
interface InterviewerAgent {
  // State
  currentPhase: InterviewPhase;
  collectedSignals: JTBDSignal[];
  rapport: number;  // 0-1 score

  // Behaviors
  generateNextQuestion(context: ConversationContext): Promise<string>;
  detectSignal(message: string): Promise<JTBDSignal[]>;
  shouldProbe(signal: JTBDSignal): boolean;
  shouldTransition(): InterviewPhase | null;
  handleTangent(message: string): 'redirect' | 'explore' | 'note';
}
```

### 4.3 Real-time Adaptation
- Sentiment monitoring (adjust tone)
- Engagement tracking (speed up/slow down)
- Signal saturation (move on when enough data)
- Tangent management (valuable vs. off-topic)

### 4.4 Prompt Engineering
- System prompt for JTBD methodology
- Few-shot examples of good probing
- Dynamic context injection
- Guardrails for sensitive topics

---

# PRD-05: Internal Task Tracker

## Purpose
Store actionable insights with evidence linking, prioritized for implementation.

## Components

### 5.1 Data Model
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'improvement' | 'research';

  // Evidence
  evidence: Evidence[];
  userQuotes: string[];
  sessionIds: string[];

  // Prioritization
  impactScore: number;      // Calculated from frequency + severity
  effortEstimate: 'xs' | 's' | 'm' | 'l' | 'xl';
  confidence: number;       // How sure are we this matters?

  // Status
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'deployed' | 'measuring';

  // pi.dev integration
  piTaskId?: string;
  prUrl?: string;
  deployedAt?: number;
  measuredImpact?: ImpactMeasurement;
}

interface Evidence {
  type: 'quote' | 'behavior' | 'metric' | 'pattern';
  sessionId: string;
  timestamp: number;
  data: any;
}
```

### 5.2 Auto-Generation Pipeline
```
Session Complete
      │
      ▼
┌─────────────────┐
│ Extract Signals │ ← JTBD signals from transcript
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cluster Similar │ ← Group with existing insights
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create/Update   │ ← New task or add evidence
│ Tasks           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Recalculate     │ ← Impact scores shift
│ Priorities      │
└─────────────────┘
```

### 5.3 Priority Algorithm
```
ImpactScore = (
  frequency_weight * sessions_mentioning +
  severity_weight * avg_emotional_intensity +
  breadth_weight * user_segments_affected +
  recency_weight * decay_function(days_since_last)
)
```

---

# PRD-06: pi.dev CLI Harness

## Purpose
Bridge between task tracker and pi.dev for autonomous implementation.

## Components

### 6.1 CLI Commands
```bash
# Task Management
pi-harness tasks list              # Show prioritized backlog
pi-harness tasks show <id>         # Detail with evidence
pi-harness tasks implement <id>    # Trigger pi.dev

# Session Management
pi-harness sessions list           # Recent interviews
pi-harness sessions analyze <id>   # Deep analysis
pi-harness sessions export         # Export for training

# Screener Management
pi-harness screener create         # Interactive screener builder
pi-harness screener deploy <id>    # Deploy to Cloudflare
pi-harness screener results <id>   # View submissions

# Analysis
pi-harness analyze patterns        # Cross-session patterns
pi-harness analyze sentiment       # Sentiment trends
pi-harness analyze jtbd            # JTBD insight summary

# pi.dev Integration
pi-harness pi connect              # Auth with pi.dev
pi-harness pi submit <task-id>     # Create pi.dev task
pi-harness pi status <task-id>     # Check progress
pi-harness pi deploy <task-id>     # Deploy completed work
```

### 6.2 Task → pi.dev Translation
```typescript
interface PiTaskSpec {
  // Context
  codebaseRef: string;           // Git repo
  relevantFiles: string[];       // Files to focus on

  // Task
  objective: string;             // What to achieve
  acceptanceCriteria: string[];  // How to verify
  constraints: string[];         // What NOT to do

  // Evidence
  userQuotes: string[];          // Why this matters
  behaviorPatterns: string[];    // What we observed

  // Verification
  testCases: TestCase[];         // Auto-generated tests
  measurementPlan: string;       // How to measure impact
}
```

### 6.3 Feedback Loop
```
Task Deployed
      │
      ▼
┌─────────────────┐
│ Create Screener │ ← Target users who reported issue
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Collect New     │ ← Same users, new interviews
│ Sessions        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Compare Signals │ ← Did pain points decrease?
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Calculate       │ ← Update task with measured impact
│ Impact          │
└─────────────────┘
```

---

# PRD-07: Screener & Recruitment System

## Purpose
Create targeted landing pages to recruit specific user segments for interviews.

## Components

### 7.1 Screener Builder
```typescript
interface Screener {
  id: string;
  title: string;

  // Targeting
  targetSegment: UserSegment;
  qualificationQuestions: Question[];
  disqualificationCriteria: Criterion[];

  // Incentive
  incentiveType: 'none' | 'gift_card' | 'product_credit' | 'donation';
  incentiveValue?: number;

  // Scheduling
  availableSlots: TimeSlot[];
  maxParticipants: number;

  // Tracking
  source: 'email' | 'social' | 'in_app' | 'referral';
  utmParams: Record<string, string>;
}
```

### 7.2 Qualification Flow
```
Landing Page
      │
      ▼
┌─────────────────┐
│ Intro + Consent │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Screening       │ ← Quick questions to qualify
│ Questions       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Qualified   Not Qualified
    │              │
    ▼              ▼
Schedule      Thank You
Interview     (Maybe future)
```

### 7.3 Generated Pages (Cloudflare Pages)
- Dynamic generation from screener config
- A/B testing of copy/design
- Conversion tracking
- Mobile optimized

---

# PRD-08: Analysis Dashboard

## Purpose
Visualize insights, patterns, and progress for product teams.

## Components

### 8.1 Views
1. **Session List**: Browse all interviews with filters
2. **Session Detail**: Transcript + recording + signals
3. **Insight Board**: Clustered JTBD insights
4. **Task Board**: Kanban of prioritized work
5. **Impact Metrics**: Before/after comparisons
6. **Trends**: Sentiment and signal trends over time

### 8.2 Key Visualizations
- JTBD signal frequency chart
- User journey map (common paths)
- Pain point heat map
- Segment comparison matrix
- Implementation impact tracker

### 8.3 Export/Sharing
- Shareable session links (privacy-aware)
- PDF reports for stakeholders
- Raw data export (CSV/JSON)
- API for custom integrations

---

# PRD-09: Self-Improvement Loop

## Purpose
The meta-system: how the platform improves itself using its own methodology.

## Components

### 9.1 Dogfooding Protocol
```
1. Deploy UserTests platform
2. Create screener for UserTests users
3. Interview users about using UserTests
4. Generate tasks from feedback
5. Implement via pi.dev
6. Measure impact
7. Repeat
```

### 9.2 Bootstrap Sequence
```
Phase 1: Manual Foundation
├── Basic chat UI (Cloudflare Pages)
├── Simple message API (Workers)
├── Text-only interviews
└── Manual task creation

Phase 2: Recording Pipeline
├── Audio recording
├── Transcription
├── Basic signal extraction
└── Semi-auto task generation

Phase 3: Full Multi-Modal
├── Screen recording
├── Interaction tracking
├── Session replay
└── Pattern detection

Phase 4: Agentic Interview
├── JTBD agent
├── Real-time adaptation
├── Automatic probing
└── Full signal extraction

Phase 5: Self-Improvement
├── pi.dev integration
├── Autonomous implementation
├── Impact measurement
└── Feedback loop closure
```

### 9.3 Meta-Metrics
Track how well the system improves itself:
- Time from insight to deployed fix
- User satisfaction trend
- Feature adoption rates
- Bug recurrence rate
- Autonomous vs. manual implementation ratio

---

# Technical Stack Summary

## Whitelabel Foundation Analysis

**What we get for FREE from `krasnoperov/whitelabel`:**

| Component | Details |
|-----------|---------|
| **Auth System** | Google OAuth + JWT (OIDC-compliant), session management |
| **Dual Workers** | Main (HTTP/frontend) + Processing (queues/workflows) |
| **Frontend** | React 19, Vite, Zustand stores, custom SPA router |
| **Database** | D1 + Kysely query builder, migration system |
| **DI Container** | InversifyJS with decorators |
| **CLI Foundation** | Login/logout, extensible command structure |
| **API Framework** | Hono routes, middleware pattern |
| **User Management** | Profile page, user DAO |
| **Dev Tooling** | TypeScript, ESLint, test runner, hot reload |

**Bindings ready to enable (commented in wrangler.toml):**
- `Queue` - for async processing
- `R2Bucket` - for media storage
- `Workflow` - for long-running tasks

**What we need to BUILD:**

| Component | Effort | Notes |
|-----------|--------|-------|
| Chat UI components | Medium | Build on existing React patterns |
| Message API routes | Medium | Follow existing route registration |
| Durable Objects for sessions | High | New binding, new pattern |
| Recording SDK | High | Browser APIs, chunked upload |
| Interaction tracker SDK | Medium | DOM observers, event capture |
| JTBD Agent prompts | Medium | LLM integration |
| Task tracker DB schema | Low | D1 migrations |
| pi.dev CLI commands | Medium | Extend existing CLI |
| Screener generator | Medium | New pages, dynamic routes |
| Analysis dashboard | High | New frontend section |

## Cloudflare Services

| Service | Use Case | Status |
|---------|----------|--------|
| Workers Assets | Static frontend hosting | ✅ Configured |
| Workers | API endpoints, business logic | ✅ Configured |
| D1 | Relational data (users, tasks, sessions) | ✅ Configured |
| KV | OAuth state, feature flags | ✅ Configured |
| Durable Objects | Session state, rate limiting | 🔧 Need to add |
| R2 | Media storage (audio, video, screenshots) | 🔧 Enable binding |
| Queues | Async processing (transcription, analysis) | 🔧 Enable binding |
| Workflows | Long-running analysis tasks | 🔧 Enable binding |
| Analytics Engine | Custom event tracking | 🔧 Add later |

## External Services

| Service | Use Case |
|---------|----------|
| pi.dev | Autonomous code generation |
| Whisper (Cloudflare AI or external) | Speech-to-text |
| Anthropic Claude | Interview agent, analysis |
| Stripe | Incentive payments (optional) |

## Repository Structure (Adapted from Whitelabel)

```
usertests/
├── src/
│   ├── api/                  # Shared API types
│   ├── backend/
│   │   ├── features/
│   │   │   ├── auth/         # ✅ Exists (Google OAuth)
│   │   │   ├── chat/         # 🆕 Chat session management
│   │   │   ├── recording/    # 🆕 Media upload handling
│   │   │   ├── analytics/    # 🆕 Interaction event ingestion
│   │   │   └── tasks/        # 🆕 Task tracker logic
│   │   ├── routes/
│   │   │   ├── auth.ts       # ✅ Exists
│   │   │   ├── chat.ts       # 🆕 Chat API endpoints
│   │   │   ├── recording.ts  # 🆕 Upload endpoints
│   │   │   ├── analytics.ts  # 🆕 Event ingestion
│   │   │   └── tasks.ts      # 🆕 Task CRUD
│   │   ├── services/
│   │   │   ├── interviewer/  # 🆕 JTBD agent
│   │   │   ├── transcription/# 🆕 Whisper integration
│   │   │   └── analysis/     # 🆕 Signal extraction
│   │   └── workflows/        # 🆕 Long-running analysis
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── login.ts      # ✅ Exists
│   │   │   ├── tasks.ts      # 🆕 Task management
│   │   │   ├── sessions.ts   # 🆕 Session analysis
│   │   │   ├── screener.ts   # 🆕 Screener management
│   │   │   └── pi.ts         # 🆕 pi.dev integration
│   │   └── index.ts
│   ├── dao/
│   │   ├── user-dao.ts       # ✅ Exists
│   │   ├── session-dao.ts    # 🆕 Interview sessions
│   │   ├── message-dao.ts    # 🆕 Chat messages
│   │   ├── task-dao.ts       # 🆕 Tasks
│   │   └── event-dao.ts      # 🆕 Analytics events
│   ├── frontend/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx    # ✅ Exists (customize)
│   │   │   ├── LoginPage.tsx      # ✅ Exists
│   │   │   ├── ProfilePage.tsx    # ✅ Exists
│   │   │   ├── InterviewPage.tsx  # 🆕 Chat interview UI
│   │   │   ├── DashboardPage.tsx  # 🆕 Analysis dashboard
│   │   │   └── ScreenerPage.tsx   # 🆕 Recruitment screener
│   │   ├── components/
│   │   │   ├── chat/         # 🆕 Chat components
│   │   │   ├── recorder/     # 🆕 Recording UI
│   │   │   └── dashboard/    # 🆕 Analytics components
│   │   └── sdk/
│   │       ├── tracker.ts    # 🆕 Interaction tracking
│   │       └── recorder.ts   # 🆕 Media recording
│   ├── worker/
│   │   ├── unified.ts        # ✅ Exists (extend)
│   │   └── processing.ts     # ✅ Exists (extend)
│   └── durable-objects/      # 🆕 Session state
│       └── interview-session.ts
├── db/
│   └── migrations/
│       ├── 0001_initial_schema.sql  # ✅ Exists (users)
│       ├── 0002_sessions.sql        # 🆕 Interview sessions
│       ├── 0003_messages.sql        # 🆕 Chat messages
│       ├── 0004_tasks.sql           # 🆕 Task tracker
│       └── 0005_events.sql          # 🆕 Analytics events
└── docs/
    └── prd/                  # These documents
```

---

# Implementation Roadmap

## Week 1-2: Foundation
- [ ] Fork whitelabel, setup monorepo
- [ ] Basic chat UI
- [ ] Message API with Durable Objects
- [ ] D1 schema for sessions

## Week 3-4: Recording
- [ ] Audio recording + upload
- [ ] Whisper integration
- [ ] Basic transcription display
- [ ] R2 storage pipeline

## Week 5-6: Intelligence
- [ ] JTBD signal extraction
- [ ] Interview agent v1
- [ ] Task auto-generation
- [ ] Basic dashboard

## Week 7-8: Full Pipeline
- [ ] Screen recording
- [ ] Interaction tracking
- [ ] Session replay
- [ ] Pattern detection

## Week 9-10: pi.dev Integration
- [ ] CLI harness
- [ ] Task → pi.dev translation
- [ ] PR automation
- [ ] Impact measurement

## Week 11-12: Polish & Dogfood
- [ ] Screener system
- [ ] Full dashboard
- [ ] Self-improvement loop
- [ ] Documentation

---

# Success Metrics

1. **Interview Quality**: Average JTBD signals per session
2. **Insight Velocity**: Time from interview to actionable task
3. **Implementation Speed**: Time from task to deployed code
4. **Impact Accuracy**: Correlation between predicted and measured impact
5. **Loop Closure**: % of insights that complete full feedback cycle

---

# Open Questions

1. **Privacy/Consent**: What's the legal framework for screen/voice recording?
2. **Data Retention**: How long to keep recordings? User deletion rights?
3. **pi.dev Limits**: What types of changes can it reliably implement?
4. **Scale**: Expected interview volume? Cost projections?
5. **Security**: How to handle sensitive user data in recordings?
