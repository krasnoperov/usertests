# PRD-08: Analysis Dashboard

## Overview

The analysis dashboard provides a unified view of all user research data—sessions, signals, tasks, and impact metrics. It enables product teams to quickly understand what users are saying and track the effectiveness of improvements. Every insight should be one click away from the evidence that supports it.

---

## User Problem

Product teams struggle to:
- Find patterns across multiple user interviews scattered in different tools
- Connect user feedback to actionable product decisions
- Track whether implemented changes actually improved user experience
- Share research findings with stakeholders in a digestible format
- Manage research data in compliance with privacy regulations (GDPR)

---

## Key Features

### Core Analytics
- Real-time metrics showing session counts, signal extraction progress, and task status
- Signal trend visualization over time by type (struggling moments, desired outcomes, workarounds, firing moments)
- Top pain points ranking based on frequency and priority scores
- Impact tracking to measure effectiveness of implemented changes

### Session Management
- Browse and filter all interview sessions by date, status, screener, and segment
- Play session recordings with synchronized transcript display
- View extracted signals in context with timestamps
- Link sessions to related tasks and evidence

### Signal Analysis
- Filter signals by type, intensity, date range, and task linkage
- AI-powered clustering of similar signals into themes
- Quick linking of signals to existing or new tasks
- Search across all extracted quotes

### Task Tracking
- Kanban board with columns: Backlog, Ready, In Progress, Review, Deployed, Measuring
- Priority scoring based on signal frequency and intensity
- Evidence collection showing all supporting quotes and patterns
- Implementation and impact tracking per task

### Usage & Cost Tracking
- Cost breakdown by service (interview audio, transcription, signal extraction, storage)
- Daily cost trends and per-session cost breakdown
- Optional budget limits with usage percentage tracking

### Data Management (GDPR Compliance)
- Delete individual sessions or all data for a participant email
- Configure retention periods for audio recordings and transcripts
- Export all project data in JSON or CSV format
- Track deletion request status

---

## Main Views

### Overview Page
Landing page with key metric cards (sessions, signals, tasks, impact), signal trends chart, top pain points list, and recent sessions preview.

### Sessions List
Filterable table of all interviews with status badges, participant info, signal counts, and quick-access to top quotes.

### Session Detail
Full session view including recording player, synchronized transcript, extracted signals timeline, and linked tasks.

### Signals View
Paginated list of all extracted signals with filters, clustering display, and task linking actions.

### Tasks Board
Kanban-style board for tracking tasks through the development lifecycle with drag-and-drop status changes.

### Task Detail
Complete task view showing all evidence (quotes, action sequences, patterns), linked sessions, implementation history, and impact timeline.

### Screeners View
List of all screeners with funnel metrics (views, started, completed, qualified, scheduled, interviewed).

### Usage Page
Cost breakdown by service, daily cost trends, per-session costs, and budget status.

### Data Management Page
Data summary, retention settings, deletion request form, and export history.

### Settings Page
Project configuration, repository connection, feature settings, and API key management.

---

## Success Criteria

- Teams can identify top 3 user pain points within 2 minutes of opening dashboard
- Average time from signal extraction to task creation under 30 seconds
- 80% of implemented fixes show measurable impact reduction in signal rate
- GDPR deletion requests completed within 72 hours
- Dashboard page load time under 2 seconds for projects with 1000+ sessions
- Cost tracking accuracy within 5% of actual API billing

---

## Dependencies

### Requires Data From
- PRD-01 (Interview): Session data, status, and real-time updates
- PRD-03 (Analytics): Signals, timeline events, and transcripts
- PRD-05 (Task Tracker): Tasks, evidence, priority scores, and implementation status
- PRD-06 (pi.dev): Implementation progress and impact measurements
- PRD-07 (Screener): Screener stats, funnel data, and responses

### Provides Data To
- PRD-09 (Self-Improvement): Platform usage patterns and insights for feedback loop

---

## Implementation Phases

### Phase 1: Core Dashboard (~3 days)
- Dashboard layout and navigation
- Overview page with metrics
- Basic charts for signal trends

### Phase 2: Sessions (~2 days)
- Sessions list with filters
- Session detail page
- Session player with transcript

### Phase 3: Signals & Tasks (~2 days)
- Signals list with filters
- Task board (kanban)
- Task detail page

### Phase 4: Impact & Analytics (~2 days)
- Impact summary view
- Screener funnel analytics
- Cost tracking display

### Phase 5: Data Management (~1 day)
- Session deletion
- Data export (JSON/CSV)
- Retention settings

---

## MVP Scope

**Included in MVP:**
- Overview dashboard with metrics
- Sessions list and detail view
- Signals list with filtering
- Task board (kanban)
- Basic cost tracking display
- Session deletion
- JSON data export

**Deferred to Later:**
- Signal clustering visualization
- Heatmaps
- Full session replay
- Shareable links
- PDF export
- Budget alerts
- Team management
