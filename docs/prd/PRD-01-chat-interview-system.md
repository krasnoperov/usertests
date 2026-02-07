# PRD-01: Interview System

> **MVP status:** The interview system is implemented as HTTP-based text chat with a 7-phase JTBD agent (Claude). Session state lives in D1. Audio is recorded and transcribed post-session. The voice/WebSocket/Durable Objects architecture described below is the **post-MVP target**.

## Overview

An AI interviewer that guides users through Jobs-to-be-Done (JTBD) interviews. The system captures conversations, user actions, and behavioral signals to understand why users make decisions. The long-term vision is real-time speech-to-speech; MVP uses text chat.

---

## User Problem

**Pain Points This Solves:**

- Traditional user research requires scheduling, coordination, and trained moderators
- Written surveys miss emotional nuance and struggle to capture the "why" behind decisions
- Remote usability testing lacks the contextual guidance of an in-person researcher
- JTBD interviews are time-intensive and require specialized interviewing skills
- Correlating what users say with what they do requires manual effort

**Who Benefits:**

- Product teams needing qualitative insights at scale
- Researchers who want richer data without moderating every session
- Users who prefer conversational interaction over form-filling

---

## Key Features

**Voice Conversation**
- Natural speech-to-speech interaction with low latency
- Voice activity detection for turn-taking
- Real-time transcription for review
- Recording with user consent

**Guided Interview Flow**
- AI-driven JTBD methodology questioning
- Adaptive follow-up based on user responses
- Phase transitions managed automatically
- Signal detection for key insights

**UI Guidance Capabilities**
- Highlight specific elements to focus attention
- Navigate users to relevant pages
- Display contextual tooltips
- Scroll to bring elements into view

**Behavioral Capture**
- Click, scroll, and input tracking
- Navigation path recording
- Correlation with transcript timestamps
- Privacy-respecting event logging

**Session Management**
- Reconnection handling for dropped connections
- Abandonment detection with timeout
- Session state persistence
- Post-session summary generation

---

## Interview Flow

### Phase 1: Context Setting (2-3 minutes)
Build rapport and understand the user's background. Ask about their role and how they discovered the product.

### Phase 2: Timeline Discovery (5-7 minutes)
Explore the user's journey from first awareness to current state. Understand the sequence of events and decisions.

### Phase 3: Struggling Moments (3-5 minutes)
Dig into pain points, frustrations, and workarounds. Identify what was not working before.

### Phase 4: Desired Outcomes (3-5 minutes)
Understand what success looks like for the user. Capture their goals and expectations.

### Phase 5: Hiring Criteria (2-3 minutes)
Learn why they chose this solution over alternatives. Understand decision factors.

### Phase 6: Wrap Up (1-2 minutes)
Thank the user, ask for any final thoughts, and close the session.

### Signal Types Captured

| Signal Type | Description |
|-------------|-------------|
| Struggling Moment | Pain points and frustrations |
| Desired Outcome | What the user wants to achieve |
| Hiring Criteria | Why they chose this solution |
| Firing Moment | What would make them leave |
| Workaround | Hacks they use to get things done |
| Emotional Response | Strong positive or negative reactions |

---

## Success Criteria

**Quantitative Metrics**
- Average session duration: 15-20 minutes
- Session completion rate: >70%
- Signals captured per session: 5-10
- System uptime: >99.5%
- Audio latency: <500ms round-trip

**Qualitative Metrics**
- Users report feeling heard and understood
- Insights are actionable for product teams
- Transcripts accurately reflect conversations
- UI guidance feels helpful, not intrusive

**Business Outcomes**
- Reduced time-to-insight vs. traditional research
- Lower cost per interview at scale
- Higher response rates than written surveys
- Richer data quality with behavioral correlation

---

## Dependencies

### This System Requires

| Dependency | Purpose | Status |
|------------|---------|--------|
| D1 Database | Session state, messages, transcripts | Active |
| R2 Storage | Audio recordings and session artifacts | Active |
| Queue | Async processing of completed sessions | Active |
| Claude API | JTBD agent conversation | Active |
| Real-time Voice API | Speech-to-speech conversation | Post-MVP |
| Durable Objects | Ephemeral session state + WebSocket | Post-MVP |

### This System Provides

| Output | Consumer |
|--------|----------|
| Interview Sessions | Analytics dashboard |
| Transcript Segments | Search and review tools |
| JTBD Signals | Task tracker integration |
| User Events | Behavior analysis |
| Session Summaries | Research reports |

### Integration Points

- **Screener System**: Receives qualified users to interview
- **Task Tracker**: Sends extracted signals and suggested tasks
- **Analytics**: Provides session metrics and completion data
- **User Management**: Optional user identification for repeat sessions

---

## Interview Modes

### Mode 1: Real-Time Voice (Primary)
Full speech-to-speech conversation with immediate responses. Best for high-value segments and deep qualitative research.

### Mode 2: Async Card-Based (Future)
Self-paced interview with pre-defined questions and voice recording. Best for scale and cost optimization.

---

## Implementation Phases

### Phase 1: Foundation
- Session management with state persistence
- WebSocket connection handling
- Basic reconnection support

### Phase 2: Voice Integration
- Real-time audio streaming
- Transcription handling
- Response playback

### Phase 3: Interview Logic
- JTBD methodology implementation
- Phase transitions
- Signal detection and recording

### Phase 4: UI Guidance
- Element highlighting
- Navigation commands
- Tooltip display

### Phase 5: Event Tracking
- Click and scroll capture
- Input monitoring
- Timestamp correlation

### Phase 6: Persistence
- Session completion processing
- Transcript storage
- Summary generation
