# PRD-06: pi.dev CLI Harness

## Overview

The pi.dev CLI harness bridges user research insights and code changes. It takes prioritized tasks from PRD-05, translates them into specifications that pi.dev can understand, orchestrates implementation, and tracks deployment through to impact measurement. Every code change traces back to user evidence.

---

## User Problem

Product teams collect valuable user feedback through interviews, but translating that feedback into actual code changes is slow and disconnected. Developers lack context about why changes matter, and there's no systematic way to verify that shipped changes actually solved the user problems they were meant to address.

The pi.dev harness solves this by:
- Automatically generating implementation specs from user evidence
- Providing developers with rich context (quotes, signals, affected sessions)
- Creating a direct link between user pain points and code changes
- Measuring whether deployed changes actually reduced user friction

---

## Key Features

**Task Management**
- List, view, and filter tasks ready for implementation
- Display task details with full user evidence and quotes
- Export tasks as implementation specs
- Track task status through the implementation lifecycle

**Spec Generation**
- Build comprehensive implementation specs from task data
- Extract relevant codebase context automatically
- Generate acceptance criteria from user signal types
- Include measurement plans for post-deployment tracking

**pi.dev Integration**
- Invoke pi.dev with user-evidence-enriched prompts
- Support dry-run mode for previewing changes
- Handle implementation failures and retries
- Parse and track changes made by pi.dev

**PR Management**
- Create pull requests with user evidence context
- Auto-label PRs with priority and effort estimates
- Detect PR merges via GitHub webhooks
- Update task status automatically on deployment

**Impact Measurement**
- Track baseline signal rates before deployment
- Measure signal reduction after deployment
- Report on fix effectiveness

---

## Workflow

### 1. Spec Generation
- Select a ready task from PRD-05's prioritized queue
- Extract keywords from task title and user quotes
- Search codebase for relevant files and code patterns
- Build PiTaskSpec with objective, acceptance criteria, constraints, and user evidence

### 2. Implementation
- Invoke pi.dev CLI with the generated spec
- pi.dev analyzes context and makes code changes
- Review changes in dry-run mode or apply directly
- Handle failures with error tracking and retry support

### 3. Pull Request
- Create branch with task ID prefix
- Commit changes and push to remote
- Create PR with user quotes, acceptance criteria, and verification steps
- Apply labels for priority, effort, and UserTests tracking

### 4. Deployment
- GitHub webhook detects PR merge
- Task status updates to "deployed"
- Measurement timer starts (default: 7 days post-deployment)

### 5. Measurement
- Compare post-deployment signal rates to baseline
- Calculate percentage reduction in user friction signals
- Report impact score and mark task complete if successful

---

## Success Criteria

- **Implementation success rate:** >80% of pi.dev runs produce valid, reviewable changes
- **PR merge rate:** >70% of auto-generated PRs are merged without major rework
- **Impact measurement:** >60% of deployed fixes show measurable signal reduction
- **Time to implementation:** <30 minutes from task selection to PR creation
- **Context accuracy:** Relevant files identified in >90% of specs

---

## Dependencies

### Consumes (from other PRDs)
- **PRD-05 (Task Tracker):** Ready tasks with evidence, quotes, signal types, and priority scores

### Provides (to other PRDs)
- **PRD-07 (Screener):** Deployed task IDs for targeted follow-up screeners
- **PRD-08 (Dashboard):** Implementation history and impact metrics
- **PRD-09 (Self-Improvement):** Feedback loop data for system learning

### External Dependencies
- **pi.dev CLI:** AI-powered code implementation tool
- **GitHub API:** Repository access, branch/PR creation, webhook events
- **Project repository:** Codebase access for context gathering

### Configuration Required
- GitHub token with repo access
- pi.dev API key
- Project repository URL and default branch
- PR settings (labels, reviewers, branch prefix)
- Implementation constraints (excluded paths, test requirements)
