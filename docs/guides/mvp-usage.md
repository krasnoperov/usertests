# MVP Usage Guide

## Overview

UserTests runs a full cycle from participant interview to actionable signals/tasks,
and triggers implementation workflows with GitHub PRs.

This guide covers both the **UI flow** and **CLI flow**.

---

## Prerequisites

1. A deployed UserTests instance (stage or production)
2. A Google account for authentication
3. (For implementation loop) A GitHub token set as worker secret

---

## UI Flow

### 1. Create a Project

1. Log in at `https://usertests-stage.krasnoperov.me/login`
2. Click **New Project** on the profile page
3. Fill in name, description, and optionally a GitHub repo URL
4. Note the **public key** (`ut_pub_...`) from Settings — participants need this

### 2. Create a Screener

1. Navigate to **Screeners** tab in your project
2. Click **New Screener**
3. Add questions with qualification rules:
   - Single choice questions can have `qualify` / `disqualify` rules
4. Set the screener status to **Active**
5. Share the screener URL: `/u/screener/<screenerId>?key=<publicKey>`

### 3. Participant Flow

Participants visit the screener URL:

1. **Screener page** (`/u/screener/:id`) — answers questions, gives consent
2. If qualified → redirected to **Interview room** (`/u/interview/:sessionId`)
3. Interview room:
   - Grants mic + screen permissions
   - Clicks **Start interview**
   - Converses with the AI interviewer (7-phase JTBD agent)
   - Clicks **End interview** when done
4. Redirected to **Completion page** (`/u/complete/:sessionId`)
   - Shows processing status (processing → processed)

### 4. Review Results

In the dashboard:

- **Sessions** — browse completed sessions, see processing status
- **Signals** — explore extracted JTBD signals (struggling moments, desired outcomes, etc.)
- **Tasks** — see suggested tasks with priority scores

### 5. Implementation Loop

From a task detail page:
1. Click **Generate Spec** to preview the implementation specification
2. Click **Implement** to create a branch + PR on GitHub
3. The PR contains user evidence, acceptance criteria, and measurement plan
4. When the PR is merged, the webhook updates the task to `deployed`

---

## CLI Flow

### Authentication

```bash
# Login (opens browser for Google OAuth)
npm run cli login --env stage

# Verify
npm run cli auth whoami --env stage
```

### Project Management

```bash
# List projects
npm run cli project list --env stage

# Create project
npm run cli project create "My Project" --env stage

# Get project details
npm run cli project get <projectId> --env stage
```

### Screener Management

```bash
# List screeners
npm run cli screener list <projectId> --env stage

# Create screener
npm run cli screener create <projectId> --title "User Research Study" --env stage
```

### Session Management (Interview Flow)

```bash
# Create session manually (alternative to screener flow)
npm run cli session create <projectId> --name "Alice" --email "alice@test.com" --env stage

# Start interview
npm run cli session start <sessionId> --key ut_pub_xxx --env stage

# Send messages
npm run cli session send <sessionId> --key ut_pub_xxx --message "I struggle with checkout" --env stage

# End interview
npm run cli session end <sessionId> --key ut_pub_xxx --env stage

# View session details (messages, events, processing status)
npm run cli session get <projectId> <sessionId> --env stage --json

# Reprocess a failed session
npm run cli session reprocess <projectId> <sessionId> --env stage
```

### Signals & Tasks

```bash
# List signals
npm run cli signal list <projectId> --env stage

# List tasks
npm run cli task list <projectId> --env stage

# Get task details
npm run cli task get <projectId> <taskId> --env stage --json
```

### Implementation Loop

```bash
# Generate spec (preview)
npm run cli task spec <projectId> <taskId> --env stage

# Create implementation attempt (with PR)
npm run cli task implement <projectId> <taskId> --env stage

# Dry run (spec only, no GitHub)
npm run cli task implement <projectId> <taskId> --dry-run --env stage

# View implementation details (includes PR URL/number)
npm run cli implementation get <projectId> <implId> --env stage --json

# Measure impact (after deployment)
npm run cli task measure <projectId> <taskId> --env stage
```

---

## Expected Outputs

### After Interview Completion

1. **Session status:** `completed`
2. **Processing status:** `processing` → `processed` (or `failed`)
3. **R2 artifacts:**
   - `sessions/<sessionId>/transcript.txt`
   - `sessions/<sessionId>/timeline.json`
   - `sessions/<sessionId>/signals.json`
   - `audio/<sessionId>/chunk-XXXX.webm` (if recorded)

### After Signal Extraction

- JTBD signals with types: `struggling_moment`, `desired_outcome`, `hiring_criteria`, `firing_moment`, `workaround`, `emotional_response`
- Each signal has: quote, context, analysis, confidence, intensity

### After Task Suggestion

- Tasks with types: `bug`, `improvement`, `feature`, `research`
- Priority scoring based on signal frequency and intensity

### After Implementation

- GitHub branch: `usertests/<taskId>-<slug>`
- PR with user evidence, acceptance criteria, measurement plan
- PR URL + number persisted in DB and visible in dashboard + CLI

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Screener says "Not found" | Verify screener status is `active` and key is correct |
| Interview won't start | Check session status is `pending`, not already started |
| Processing stuck | Check `session.processing_failed` events; try reprocess |
| No signals | Verify `ANTHROPIC_API_KEY` is set on processing worker |
| Audio not transcribed | Verify `OPENAI_API_KEY` is set on processing worker |
| PR creation fails | Verify `GITHUB_TOKEN` secret and project `github_repo_url` |
| Rate limited (429) | Wait 60s; public endpoints have per-IP rate limits |

For detailed operational procedures, see `docs/runbooks/mvp-ops.md`.
