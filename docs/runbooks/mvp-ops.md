# MVP Operations Runbook

## Overview
Operational procedures for the UserTests MVP platform.
Covers queue failures, session reprocessing, key rotation, and health checks.

---

## 1. Queue Failure Investigation

### Symptoms
- Sessions stuck in `processing` status for >10 minutes
- Dashboard shows `failed` processing status
- Cloudflare Queue dashboard shows dead-letter messages

### Diagnosis

1. **Check processing worker health:**
   ```bash
   curl https://usertests-processing-stage.krasnoperov.me/api/health
   # Expected: {"status":"ok","worker":"processing"}
   ```

2. **Check session processing status via API:**
   ```bash
   npm run cli session get <projectId> <sessionId> --env stage --json
   # Look at events array for:
   #   session.processing_started
   #   session.processing_failed (check data_json for reason)
   #   session.processed
   ```

3. **Check Cloudflare dashboard:**
   - Workers & Pages → usertests-processing-stage → Logs
   - Queues → usertests-processing-stage → Messages tab

### Resolution

- If `session.processing_failed` with reason:
  - `ANTHROPIC_API_KEY not set` → Set secret: `wrangler secret put ANTHROPIC_API_KEY -c wrangler.processing.toml`
  - `OPENAI_API_KEY not set` → Set secret: `wrangler secret put OPENAI_API_KEY -c wrangler.processing.toml`
  - `Session not found` → Data integrity issue, check D1 database
  - API rate limit / timeout → Reprocess (see below)

---

## 2. Session Reprocessing

### Via CLI
```bash
npm run cli session reprocess <projectId> <sessionId> --env stage
```

### Via API
```bash
curl -X POST \
  https://usertests-stage.krasnoperov.me/api/projects/<projectId>/sessions/<sessionId>/reprocess \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### What it does
1. Clears `session.processing_started`, `session.processing_failed`, and `session.processed` events
2. Re-queues a `session.completed` message
3. The processing worker picks it up fresh

### Verification
Poll the session until `processing_status` becomes `processed` or `failed`:
```bash
npm run cli session get <projectId> <sessionId> --env stage --json | jq '.session.signal_count, .events[-1]'
```

---

## 3. Key Rotation

### Cloudflare Worker Secrets

Secrets used by processing worker:
- `ANTHROPIC_API_KEY` — Claude API for signal extraction + task suggestion
- `OPENAI_API_KEY` — Whisper API for audio transcription
- `GITHUB_TOKEN` — GitHub API for branch/PR creation (main worker only)

#### Rotation procedure

1. Generate new API key from provider dashboard
2. Update the secret:
   ```bash
   # Stage
   echo "<NEW_KEY>" | wrangler secret put ANTHROPIC_API_KEY -c wrangler.processing.toml
   echo "<NEW_KEY>" | wrangler secret put ANTHROPIC_API_KEY -c wrangler.toml

   # Production
   echo "<NEW_KEY>" | wrangler secret put ANTHROPIC_API_KEY -c wrangler.processing.toml --env production
   echo "<NEW_KEY>" | wrangler secret put ANTHROPIC_API_KEY -c wrangler.toml --env production
   ```
3. Verify with a smoke test:
   ```bash
   ./scripts/mvp-smoke.sh --env stage --project-id <id> --screener-id <id> --project-key <key> --auth-token <token>
   ```
4. Revoke old key from provider dashboard

### OIDC Keys
- `OIDC_PRIVATE_KEY_BASE64` and `OIDC_KEY_ID` are used for JWT signing
- Rotation requires coordinated update of both main worker and any CLI clients
- See `scripts/auth/` for key generation tooling

---

## 4. Processing Worker Health Checks

### Quick health check
```bash
# Stage
curl -s https://usertests-processing-stage.krasnoperov.me/api/health | jq .

# Production
curl -s https://usertests-processing-production.krasnoperov.me/api/health | jq .
```

### Full system check
```bash
# Main worker
curl -s https://usertests-stage.krasnoperov.me/api/health | jq .

# Processing worker
curl -s https://usertests-processing-stage.krasnoperov.me/api/health | jq .

# Verify queue is consuming (check Cloudflare dashboard)
# Workers & Pages → Queues → usertests-processing-stage
# Look for: messages consumed, no backlog
```

### Deployment verification
After deploying either worker:
```bash
# 1. Deploy
npm run deploy:stage
# or
wrangler deploy -c wrangler.processing.toml

# 2. Health check
curl -s https://usertests-stage.krasnoperov.me/api/health | jq .
curl -s https://usertests-processing-stage.krasnoperov.me/api/health | jq .

# 3. Smoke test
./scripts/mvp-smoke.sh --env stage ...
```

---

## 5. Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Sessions stuck in `processing` | Worker crashed or secret missing | Check logs, reprocess |
| `429 Too Many Requests` on SDK endpoints | Rate limiter triggered | Wait 60s, or check if abuse |
| Audio not transcribed | `OPENAI_API_KEY` not set on processing worker | Set secret |
| Signals not extracted | `ANTHROPIC_API_KEY` not set on processing worker | Set secret |
| PR creation failed | `GITHUB_TOKEN` expired or repo URL invalid | Rotate token, check project settings |
| Webhook not firing | GitHub webhook not configured for repo | Add webhook URL: `<base>/api/webhooks/github` |

---

## 6. Monitoring Checklist (Daily)

- [ ] Check Cloudflare Workers dashboard for error rates
- [ ] Check Queue backlog (should be 0 or near 0)
- [ ] Verify at least one session processed in last 24h (if active usage)
- [ ] Check R2 storage usage trending
- [ ] Review any `session.processing_failed` events
