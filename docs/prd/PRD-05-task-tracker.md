# PRD-05: Internal Task Tracker

## Overview

The task tracker converts JTBD signals into actionable work items. It aggregates evidence from multiple user sessions, prioritizes by impact, and feeds tasks to configured providers (GitHub, Jira, Linear, etc.) for external implementation.

**Core insight:** A task backed by 5 user quotes saying "I can't find the export button" is more compelling than a feature request in a spreadsheet.

---

## User Problem

Product teams struggle to connect user research to development work. Pain points include:

- User feedback scattered across sessions with no aggregation
- No systematic way to prioritize based on actual user evidence
- Difficulty proving impact after shipping fixes
- Manual tracking of which issues affect multiple users

---

## Key Features

- Automatic task creation from JTBD signals
- Evidence aggregation linking tasks to user quotes and sessions
- Priority scoring based on frequency, recency, and intensity
- Task lifecycle management from backlog to measured impact
- Impact measurement comparing signal rates before and after deployment
- Integration with analytics (PRD-03) and task providers (PRD-06)

---

## Task Lifecycle

Tasks progress through the following states:

1. **Backlog** - New task created from signals, not yet prioritized
2. **Ready** - Prioritized and available for implementation
3. **In Progress** - Currently being worked on
4. **Review** - PR open, awaiting code review
5. **Deployed** - Merged and live in production
6. **Measuring** - Collecting post-deployment data to assess impact
7. **Done** - Impact confirmed, task closed

Transitions:
- Signals cluster into Backlog tasks
- Prioritization moves tasks to Ready
- Manual or automated pickup moves to In Progress
- PR merge moves to Deployed
- Time-based measurement check moves to Measuring
- Confirmed impact reduction moves to Done

Tasks may also be marked **Won't Fix** if decided not to address.

---

## Prioritization Factors

Priority score (0-100) is influenced by:

- **Frequency** - How many sessions mention this issue (more mentions = higher priority)
- **Recency** - How recent are the mentions (recent issues matter more)
- **Intensity** - How strongly users express frustration
- **Breadth** - How many different user segments are affected
- **Signal Type** - Some types are more urgent:
  - Firing moments (users leaving) = critical
  - Struggling moments = high
  - Workarounds = medium-high
  - Desired outcomes (feature requests) = medium
  - Hiring criteria (what's working) = lower priority to fix

Priority labels derived from score:
- Critical: 80+
- High: 60-79
- Medium: 40-59
- Low: below 40

---

## Success Criteria

- Tasks automatically created from 80%+ of actionable signals
- Similar signals correctly grouped into existing tasks 90%+ of the time
- Average time from signal to task creation under 1 minute
- Impact measurement available within 7 days of deployment
- 70%+ of completed tasks show measurable signal reduction
- Zero manual data entry required for evidence linking

---

## Dependencies

### Receives From
- **PRD-03 (Analytics)** - Extracted JTBD signals from user sessions
- **PRD-04 (Agent)** - Real-time task suggestions during interviews

### Provides To
- **PRD-06 (Task Providers)** - Ready tasks with evidence for external implementation
- **PRD-08 (Dashboard)** - Task lists, details, and impact metrics for display
