# PRD-09: Self-Improvement Loop

## Status: Deferred to v2

This is a meta-feature that enables the platform to improve itself. It should be implemented after the core product (PRD-01 through PRD-08) is stable and has an active user base.

---

## Overview

The self-improvement loop is the meta-system that enables UserTests to improve itself using its own methodology. The platform interviews its own users, extracts insights about itself, generates improvement tasks, implements them, and measures the impact—completing the feedback loop automatically.

**Core philosophy:** A user research platform that doesn't use user research to improve itself is like a shoemaker whose children go barefoot.

---

## User Problem

**Pain points this solves:**

- Product teams lack systematic feedback about their own tools
- Manual collection and analysis of internal feedback is time-consuming
- Improvements happen reactively rather than continuously
- No closed-loop validation that changes actually helped users
- Difficult to prioritize which internal issues matter most

---

## Key Features

- **Dogfooding protocol** - Always-on interview loop for UserTests users
- **Automatic trigger system** - Request feedback at optimal moments (after onboarding, N sessions, feature usage, churn risk)
- **Rate limiting** - Prevent over-surveying users
- **Quality scoring** - Prioritize high-value feedback based on specificity, actionability, and user credibility
- **Meta-metrics dashboard** - Track how well the system improves itself
- **Automated experimentation** - A/B test implementations before full rollout

---

## Loop Phases

### 1. Trigger
User activity triggers a feedback request (e.g., completed onboarding, 5th session, used key feature, or detected churn risk).

### 2. Interview
User participates in a voice interview about their UserTests experience. The same AI interviewer used for customer research interviews the platform's own users.

### 3. Signal Extraction
Interview is transcribed and analyzed. Signals extracted include struggling moments, workarounds, desired outcomes, and emotional responses—all related to the UserTests product itself.

### 4. Task Creation
Signals cluster into actionable tasks. Quality scoring prioritizes high-value, specific, actionable feedback from credible users.

### 5. Implementation
Tasks are implemented (via pi.dev integration or manual development). Changes go through standard PR review process.

### 6. Measure
Post-deployment monitoring tracks whether the change had positive impact:
- Did related complaints decrease?
- Did target metrics improve?
- Did follow-up interviews confirm the fix worked?

The cycle then repeats, continuously improving the platform.

---

## Safety Mechanisms

### Circuit Breaker

The system includes automatic safeguards to prevent runaway automation:

- **Daily limits** - Cap on how many automated changes can deploy per day
- **Failure thresholds** - Pause automation after consecutive failures
- **Cooldown periods** - Wait period after issues before resuming
- **Auto-rollback** - Revert changes automatically if error rates spike, performance degrades, or negative feedback increases

### Human Checkpoints

Certain changes always require human approval:
- Security-related changes
- Database schema modifications
- Authentication/authorization logic
- Billing and payment logic
- External API integrations
- Large changes touching many files

---

## Success Criteria

1. **Cycle time < 14 days** - From user signal to measured impact
2. **Task success rate > 70%** - Most implemented changes have positive impact
3. **Autonomy rate > 80%** - Most steps happen without human intervention
4. **Zero degradation rollbacks** - No auto-rollbacks due to performance issues
5. **Upward meta-metric trends** - System demonstrably improves over time

**Ultimate test:** UserTests becomes measurably better through its own feedback loop, faster than traditional development processes would achieve.

---

## Dependencies

### Requires (from other PRDs)
- PRD-01: Voice Interview Engine (for conducting interviews)
- PRD-02: Recording Infrastructure (for capturing feedback)
- PRD-03: Signal Extraction (for analyzing feedback)
- PRD-05: Task Management (for creating improvement tasks)
- PRD-06: pi.dev Integration (for automated implementation)
- PRD-07: Screener System (for targeting users)

### Provides (to other systems)
- Meta-metrics about platform health
- Continuous improvement data
- Validated feedback loop methodology
- Proof that the platform works (dogfooding credibility)
