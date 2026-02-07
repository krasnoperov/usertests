# PRD-06: Task Providers

> **MVP status:** GitHub provider implemented — spec generation, branch+PR creation, webhook merge detection, and sync impact measurement all working. Provider plugin architecture in place for future providers (Jira, Linear, etc.). **Not yet built:** codebase file search for spec context, additional providers.

## Overview

The task provider system connects UserTests' prioritized tasks to external execution systems. It takes tasks from PRD-05, translates them into implementation specs, and pushes them to configured providers (GitHub, Jira, Linear, etc.) as issues, tickets, or PRs. External agents — whether human developers, OpenClaw, Claude Code, or any other tool — pick up and implement the work outside of UserTests. The platform tracks progress via provider-specific webhooks and measures impact after deployment.

**Core principle:** UserTests is opinionated about feedback, agnostic about execution. The platform's job is to record interviews, extract signals, and prioritize tasks. What happens to those tasks is a pluggable concern.

---

## User Problem

Product teams collect valuable user feedback through interviews, but translating that feedback into actual code changes is slow and disconnected. Teams use different project management tools (GitHub Issues, Jira, Linear) and different execution approaches (dev teams, AI agents, contractors). There's no systematic way to:

- Push evidence-backed tasks to the team's existing workflow tool
- Track whether external work was completed
- Verify that shipped changes actually solved the user problems they were meant to address

The provider system solves this by:
- Automatically generating implementation specs from user evidence
- Pushing tasks to the team's configured external system
- Tracking completion via webhooks from external systems
- Measuring whether deployed changes actually reduced user friction

---

## Key Features

**Provider Interface**
- Pluggable provider architecture supporting multiple external systems
- GitHub provider as the first implementation (Issues + PRs)
- Standardized push/webhook/state contract for all providers
- Per-project provider configuration

**Spec Generation**
- Build comprehensive implementation specs from task data
- Generate acceptance criteria from user signal types
- Include user quotes and measurement plans
- Export specs for external consumption

**External System Sync**
- Push tasks to configured providers (create issues, tickets, PRs)
- Track external state via webhooks (PR merged, issue closed)
- Update core task status based on provider events
- Store provider-specific metadata separately from core task data

**Impact Measurement**
- Track baseline signal rates before deployment
- Measure signal reduction after deployment
- Store measurement history over time
- Report on fix effectiveness

---

## Workflow

### 1. Spec Generation
- Select a ready task from PRD-05's prioritized queue
- Extract keywords from task title and user quotes
- Build implementation spec with objective, acceptance criteria, constraints, and user evidence

### 2. Push to Provider
- Push task to the configured external system (e.g., GitHub Issue + PR)
- Provider creates the external artifact (issue, ticket, branch, PR)
- Provider state is stored in `task_provider_state` table
- Core task status moves to `in_progress`

### 3. External Work
- External agent (dev team, OpenClaw, Claude Code, etc.) picks up the work
- Work happens entirely outside UserTests
- UserTests is agnostic about who implements

### 4. Webhook Update
- Provider webhook detects completion (e.g., PR merged, issue closed)
- Provider state is updated with new external status
- Core task status is updated (e.g., moved to `done`)

### 5. Impact Measurement
- Compare post-deployment signal rates to baseline
- Calculate percentage reduction in user friction signals
- Store measurement in history for trend analysis
- Report impact score

---

## Architecture

### Core Task Statuses (simplified)

| Status | Meaning | Who sets it |
|--------|---------|-------------|
| `backlog` | New task, not prioritized | Signal extraction |
| `ready` | Prioritized, available for work | User or auto-priority |
| `in_progress` | Being worked on (somewhere) | Provider push or manual |
| `done` | Completed and verified | Provider webhook or manual |
| `wont_fix` | Decided not to address | User |

### Provider State (separate table)

Provider-specific states (like `pr_open`, `merged`, `closed`) are stored in `task_provider_state`, not on the task itself. This keeps the core task model clean and allows multiple providers per task.

### Measurement History

Impact measurements are stored in `task_measurements` as a time series, allowing trend analysis and repeated measurements.

---

## Success Criteria

- **Provider sync reliability:** >99% of pushed tasks successfully create external artifacts
- **Webhook processing:** >95% of external events correctly update task state
- **Impact measurement:** >60% of completed tasks show measurable signal reduction
- **Time to push:** <5 seconds from push request to external artifact creation
- **Provider extensibility:** Adding a new provider requires only implementing the `TaskProvider` interface

---

## Dependencies

### Consumes (from other PRDs)
- **PRD-05 (Task Tracker):** Ready tasks with evidence, quotes, signal types, and priority scores

### Provides (to other PRDs)
- **PRD-07 (Screener):** Completed task IDs for targeted follow-up screeners
- **PRD-08 (Dashboard):** Provider state and impact metrics
- **PRD-09 (Self-Improvement):** Feedback loop data for system learning

### External Dependencies
- **GitHub API:** Repository access, branch/PR creation, webhook events (first provider)
- **Future:** Jira API, Linear API, etc.

### Configuration Required
- Provider-specific tokens (e.g., GitHub token with repo access)
- Project repository URL and default branch (for GitHub provider)
- Webhook endpoints configured in external systems
