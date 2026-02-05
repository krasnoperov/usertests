# PRD-03: Analytics Engine (MVP)

## Overview

Process recorded sessions (audio + clicks) to extract Jobs-to-be-Done (JTBD) insights. The MVP focuses on correlating what users said with what they did to identify actionable signals from user research sessions.

---

## User Problem

Product teams conduct user interviews but struggle to extract actionable insights efficiently. Manual analysis of recordings is time-consuming and prone to missing important moments. Teams need an automated way to:

- Identify when users struggle with the product
- Understand what outcomes users are trying to achieve
- Discover workarounds users have developed
- Surface patterns that indicate product improvements

Without automated analysis, valuable user feedback gets lost or takes weeks to process into actionable items.

---

## Key Features

### Session Processing
- Transcribe audio recordings to timestamped text
- Merge speech with user actions (clicks, navigation) into a unified timeline
- Queue-based processing for reliability and scalability

### Signal Extraction
- AI-powered analysis of user sessions using JTBD framework
- Automatic identification of struggling moments, desired outcomes, and workarounds
- Confidence scoring for each extracted signal
- Suggested tasks generated from signals

### Output Generation
- Timestamped transcript files for review
- Merged timeline combining speech and actions
- Structured signals with quotes, context, and analysis

---

## Signal Types

The engine extracts five types of JTBD signals:

- **Struggling Moment**: User expresses frustration, confusion, or difficulty (e.g., "can't find", "doesn't work", repeated clicks, navigation loops)

- **Desired Outcome**: User describes what they want to achieve (e.g., "I want to", "I need to", underlying goals beyond feature requests)

- **Hiring Criteria**: Why the user chose this solution (e.g., "what sold me", "the reason I chose")

- **Firing Moment**: What would make the user leave (e.g., "deal breaker", "would switch if")

- **Workaround**: Hacks the user employs to accomplish goals (e.g., "what I do instead", "my hack is")

---

## Success Criteria

### Processing Metrics
- 95% of sessions successfully processed within 5 minutes of completion
- Transcription accuracy above 90% for clear audio
- Signal extraction produces at least one signal per 10-minute session

### Quality Metrics
- Signal confidence scores correlate with manual review ratings
- Suggested tasks rated as actionable by product team in 70%+ of cases
- False positive rate for struggling moments below 20%

### User Metrics
- Product teams review processed sessions within 24 hours
- 50%+ of extracted signals converted to tasks or insights
- Time to first insight reduced from days to hours

---

## Dependencies

### Requires (Inputs)
- **PRD-02 (Recording)**: Audio chunks, click/navigation events, session manifest stored in R2
- **Whisper API**: Audio transcription service (Cloudflare AI or OpenAI)
- **Claude API**: AI analysis for signal extraction
- **Cloudflare Queue**: Reliable message processing

### Provides (Outputs)
- **PRD-05 (Tasks)**: Signals can be converted to actionable tasks
- **PRD-08 (Dashboard)**: Timeline, transcript, and signals for display

### Storage
- R2: Processed files (transcript, timeline, signals)
- D1: Signal metadata for querying and linking

---

## Deferred Features (v2+)

- Heatmaps (requires scroll/hover tracking)
- Session replay (requires DOM snapshots)
- Cross-session pattern detection
- Speaker diarization for multi-participant sessions
- Real-time processing
