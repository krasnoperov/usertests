# PRD-02: Recording Pipeline (MVP)

## Overview

Lightweight recording SDK that captures the minimum data needed for JTBD insights: user voice, clicks, and navigation. Embeddable on any website with approximately 1MB/min bandwidth. Everything else (screen video, DOM replay, scroll tracking) is deferred to v2.

---

## User Problem

Product teams struggle to understand the "why" behind user behavior. Traditional analytics show what users clicked, but not what they were thinking or feeling. Watching full session recordings is time-consuming and often lacks context.

The Recording Pipeline solves this by capturing the correlation between **what users say** and **what they do**:

> "I was really frustrated trying to find the export button"
> [clicked: Settings -> Account -> Settings -> Help]

This correlation reveals user intent, confusion points, and emotional context that pure analytics miss.

---

## Key Features

### Core Recording
- Audio recording with automatic chunking and upload
- Click tracking with element identification
- Navigation tracking for both traditional and SPA navigation
- Timestamped events for audio-action correlation
- Markers for custom event tagging

### SDK Integration
- Script tag embedding for quick setup
- Programmatic API for custom control
- Start, stop, pause, and resume controls
- Session identification and user identity linking

### Consent Management
- Built-in consent dialog before recording starts
- Configurable consent options (recording, analytics, follow-up)
- GDPR-compliant consent storage

### Real-time Control
- WebSocket connection for live control
- Remote start/stop from interview agent
- Real-time event streaming

---

## What Gets Captured

### MVP (v1)
- **User Audio**: Voice recording for transcription and sentiment analysis
- **Click Events**: Element clicked, visible text, position, and ARIA roles
- **Navigation Events**: URL changes, page titles, SPA route transitions
- **Page Context**: Current URL, page title, viewport size, user agent
- **Markers**: Custom events added programmatically for timeline correlation

### Deferred (v2+)
- Screen video recording
- DOM snapshots for pixel-perfect replay
- Scroll and hover events
- Network and console logs

### Never Captured
- Input field values (privacy protection)
- Passwords or sensitive form data

---

## Success Criteria

### Technical Metrics
- SDK size under 15KB gzipped
- Bandwidth usage approximately 1MB/min (audio only)
- Event delivery latency under 1 second via WebSocket
- 100-500 events captured per 10-minute session

### User Experience
- Recording starts within 2 seconds of user consent
- No visible performance impact on host website
- Consent dialog completion rate above 80%
- Session completion rate above 70%

### Data Quality
- Audio chunks successfully uploaded with 99% reliability
- All click and navigation events captured with timestamps
- Transcription-ready audio quality maintained

---

## Dependencies

### Requires (from other PRDs)
- **PRD-01 (Voice Interview)**: Provides the interview agent that controls recording sessions
- Backend infrastructure for session creation and storage

### Provides (to other PRDs)
- **PRD-03 (Analytics)**: Raw audio chunks and event logs for processing
- **PRD-04 (Agent)**: Real-time event stream for interview context
- Session manifests with metadata and consent records

### External Dependencies
- Browser MediaRecorder API for audio capture
- WebSocket support for real-time control
- Cloud storage for audio and event persistence

---

## Implementation Phases

### Phase 1: Core SDK (2 days)
- Audio recorder with chunked upload
- Click tracker
- Navigation tracker
- Session creation API

### Phase 2: Upload Pipeline (1 day)
- Storage upload routes
- Manifest management
- Session finalization

### Phase 3: Control Channel (1 day)
- WebSocket connection
- Remote start/stop
- Marker commands

### Phase 4: Package Distribution (1 day)
- Build configuration
- Script tag loader
- TypeScript types

---

## Data Retention

- Audio recordings: 90 days (configurable per project)
- Event logs: 90 days
- Transcripts: 365 days
- Extracted signals: Indefinite (anonymized after retention period)
- Consent records: Indefinite (required for compliance)
