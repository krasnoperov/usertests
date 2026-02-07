# PRD-07: Screener & Recruitment System

## Overview

The screener system creates targeted landing pages to recruit specific user segments for interviews. It handles the full funnel from landing page to scheduled interview, with qualification logic to ensure you talk to the right users. The best insights come from users who match specific criteria—a power user and a churned user will give very different feedback about the same feature.

---

## User Problem

**Pain Points Solved:**
- Researchers waste time interviewing users who don't match target criteria
- Manual qualification is tedious and inconsistent
- Scheduling back-and-forth delays research timelines
- No centralized tracking of recruitment funnel metrics
- Difficulty targeting specific user segments (power users, churned, new signups)

---

## Key Features

**Implemented:**
- **Landing Page Generation**: Branded, shareable pages for recruitment campaigns
- **Screening Questionnaire**: Configurable questions to filter participants
- **Qualification Rules**: Automatic pass/fail based on answer criteria
- **UTM Tracking**: Measure recruitment source effectiveness
- **Consent Collection**: Recording permissions captured per session
- **Funnel Counters**: View, start, complete, qualified, disqualified counts

**Post-MVP:**
- **Calendar Scheduling**: Let participants self-book interview times
- **Incentive Management**: Gift cards, product credits, or donations
- **Segment Assignment**: Route qualified users to appropriate cohorts
- **Quota Management**: Cap recruitment per segment

---

## Screener Flow

```
1. RECRUITMENT
   - Email campaigns
   - Social media links
   - In-app prompts
   - Embedded widgets

        ↓

2. LANDING PAGE
   - Introduction & incentive info
   - Consent form
   - Start screener

        ↓

3. QUESTIONNAIRE
   - Series of screening questions
   - Progress indicator
   - Answer validation

        ↓

4. QUALIFICATION
   - Rules evaluated in order
   - Score calculation (optional)
   - Segment assignment

        ↓

5. RESULT
   ├── QUALIFIED → Schedule interview or start immediately
   └── NOT QUALIFIED → Thank you page (optional waitlist)

        ↓

6. SCHEDULING
   - Calendar availability display
   - Time slot selection
   - Confirmation email + calendar invite
```

---

## Question Types Supported

| Type | Description | Use Case |
|------|-------------|----------|
| **Single Choice** | Select one option from a list | Role, usage frequency, yes/no questions |
| **Multiple Choice** | Select multiple options | Features used, pain points experienced |
| **Text** | Free-form short answer | Job title, specific feedback |
| **Number** | Numeric input with validation | Team size, years of experience |
| **Scale** | Rating from 1-10 (or custom range) | Satisfaction, frustration level |
| **Date** | Date picker | Last usage, signup date |

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Screener completion rate | >70% | Completed / Started |
| Qualification accuracy | >90% | Post-interview validation |
| Time to first interview | <48 hours | From screener launch to scheduled call |
| No-show rate | <15% | Missed interviews / Scheduled |
| Researcher time saved | >2 hours/study | Compared to manual recruitment |
| Funnel visibility | 100% | All stages tracked in dashboard |

---

## Dependencies

### Requires (Inputs)
- **PRD-01 (Interview System)**: Interview session creation and management
- **Calendar Integration**: Availability slots and booking (post-MVP)
- **Email Service**: Confirmation and reminder emails (post-MVP)

### Provides (Outputs)
- **PRD-01 (Interview System)**: Qualified participants ready for interviews
- **PRD-08 (Dashboard)**: Recruitment funnel metrics and screener stats
- **PRD-09 (Self-Improvement)**: Signal data for targeting future screeners
- **PRD-06 (Task Providers)**: Follow-up screener creation for completed tasks
