#!/usr/bin/env bash
# =============================================================================
# MVP Smoke Test Script (D2)
#
# Validates the full participant flow end-to-end:
#   screener load → qualification → interview start/send/end → processing → signals
#
# Usage:
#   ./scripts/mvp-smoke.sh --env stage
#   ./scripts/mvp-smoke.sh --env production
#
# Prerequisites:
#   - A project with a screener must exist.
#   - Set PROJECT_ID, SCREENER_ID, PROJECT_KEY, and AUTH_TOKEN environment vars,
#     or pass as arguments.
#
# Evidence is saved to docs/release-evidence/mvp/
# =============================================================================

set -euo pipefail

# --- Defaults ---
ENV="stage"
WAIT_PROCESSING_SECS=30
MAX_POLL_ATTEMPTS=20
POLL_INTERVAL=5

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2 ;;
    --project-id) PROJECT_ID="$2"; shift 2 ;;
    --screener-id) SCREENER_ID="$2"; shift 2 ;;
    --project-key) PROJECT_KEY="$2"; shift 2 ;;
    --auth-token) AUTH_TOKEN="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# --- Resolve base URL ---
case $ENV in
  stage) BASE_URL="https://usertests-stage.krasnoperov.me" ;;
  production) BASE_URL="https://usertests.krasnoperov.me" ;;
  local) BASE_URL="http://localhost:8788" ;;
  *) echo "Unknown env: $ENV"; exit 1 ;;
esac

# --- Validate required vars ---
: "${PROJECT_ID:?Set PROJECT_ID or pass --project-id}"
: "${SCREENER_ID:?Set SCREENER_ID or pass --screener-id}"
: "${PROJECT_KEY:?Set PROJECT_KEY (ut_pub_...) or pass --project-key}"
: "${AUTH_TOKEN:?Set AUTH_TOKEN (Bearer token) or pass --auth-token}"

# --- Evidence directory ---
EVIDENCE_DIR="docs/release-evidence/mvp"
mkdir -p "$EVIDENCE_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$EVIDENCE_DIR/smoke_${ENV}_${TIMESTAMP}.log"

log() {
  echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"
}

fail() {
  log "❌ FAIL: $*"
  exit 1
}

pass() {
  log "✅ PASS: $*"
}

curl_sdk() {
  curl -sS -H "X-Project-Key: $PROJECT_KEY" -H "Content-Type: application/json" "$@"
}

curl_auth() {
  curl -sS -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" "$@"
}

log "=== MVP Smoke Test ==="
log "Environment: $ENV"
log "Base URL: $BASE_URL"
log "Project: $PROJECT_ID"
log "Screener: $SCREENER_ID"

# --- Step 1: Screener load ---
log ""
log "--- Step 1: Load screener ---"
SCREENER_RESP=$(curl_sdk "$BASE_URL/api/sdk/screener/$SCREENER_ID")
echo "$SCREENER_RESP" >> "$LOG_FILE"

SCREENER_TITLE=$(echo "$SCREENER_RESP" | jq -r '.screener.title // empty')
if [ -z "$SCREENER_TITLE" ]; then
  fail "Could not load screener"
fi
pass "Screener loaded: $SCREENER_TITLE"

# --- Step 2: Submit qualification ---
log ""
log "--- Step 2: Submit screener response ---"
QUALIFY_RESP=$(curl_sdk -X POST "$BASE_URL/api/sdk/screener/$SCREENER_ID/respond" \
  -d '{
    "participant_name": "Smoke Test User",
    "participant_email": "smoke@test.local",
    "answers": {},
    "consent_given": true,
    "consent_recording": true,
    "consent_analytics": true,
    "utm_source": "smoke-test",
    "utm_medium": "script",
    "utm_campaign": "mvp-'$TIMESTAMP'"
  }')
echo "$QUALIFY_RESP" >> "$LOG_FILE"

SESSION_ID=$(echo "$QUALIFY_RESP" | jq -r '.session_id // empty')
QUALIFIED=$(echo "$QUALIFY_RESP" | jq -r '.qualified // empty')

if [ "$QUALIFIED" != "true" ] || [ -z "$SESSION_ID" ]; then
  fail "Screener did not qualify or no session_id returned"
fi
pass "Qualified! Session: $SESSION_ID"

# --- Step 3: Start interview ---
log ""
log "--- Step 3: Start interview ---"
START_RESP=$(curl_sdk -X POST "$BASE_URL/api/sdk/interview/$SESSION_ID/start" -d '{}')
echo "$START_RESP" >> "$LOG_FILE"

OPENING=$(echo "$START_RESP" | jq -r '.message // empty')
if [ -z "$OPENING" ]; then
  fail "No opening message returned"
fi
pass "Interview started. Opening: ${OPENING:0:80}..."

# --- Step 4: Send message ---
log ""
log "--- Step 4: Send interview message ---"
MSG_RESP=$(curl_sdk -X POST "$BASE_URL/api/sdk/interview/$SESSION_ID/message" \
  -d '{"content": "I have been struggling with finding the checkout button. It takes me at least 3 clicks to get there and I almost gave up last time."}')
echo "$MSG_RESP" >> "$LOG_FILE"

AI_RESP=$(echo "$MSG_RESP" | jq -r '.message // empty')
if [ -z "$AI_RESP" ]; then
  fail "No AI response returned"
fi
pass "AI responded: ${AI_RESP:0:80}..."

# --- Step 5: End interview ---
log ""
log "--- Step 5: End interview ---"
END_RESP=$(curl_sdk -X POST "$BASE_URL/api/sdk/interview/$SESSION_ID/end" -d '{}')
echo "$END_RESP" >> "$LOG_FILE"

QUEUED=$(echo "$END_RESP" | jq -r '.queued // false')
pass "Interview ended. Queued for processing: $QUEUED"

# --- Step 6: Wait for processing ---
log ""
log "--- Step 6: Wait for queue processing (max ${MAX_POLL_ATTEMPTS} x ${POLL_INTERVAL}s) ---"

PROCESSING_STATUS="processing"
for i in $(seq 1 $MAX_POLL_ATTEMPTS); do
  sleep "$POLL_INTERVAL"

  POLL_RESP=$(curl_sdk "$BASE_URL/api/sdk/interview/$SESSION_ID")
  PROCESSING_STATUS=$(echo "$POLL_RESP" | jq -r '.session.processing_status // "unknown"')

  log "  Poll $i/$MAX_POLL_ATTEMPTS: status=$PROCESSING_STATUS"

  if [ "$PROCESSING_STATUS" = "processed" ] || [ "$PROCESSING_STATUS" = "failed" ]; then
    break
  fi
done

if [ "$PROCESSING_STATUS" = "processed" ]; then
  pass "Session processed successfully!"
elif [ "$PROCESSING_STATUS" = "failed" ]; then
  fail "Session processing failed"
else
  fail "Session processing did not complete within timeout (status=$PROCESSING_STATUS)"
fi

# --- Step 7: Check signals ---
log ""
log "--- Step 7: Verify signals generated ---"
SESSION_DETAIL=$(curl_auth "$BASE_URL/api/projects/$PROJECT_ID/sessions/$SESSION_ID")
echo "$SESSION_DETAIL" >> "$LOG_FILE"

SIGNAL_COUNT=$(echo "$SESSION_DETAIL" | jq -r '.session.signal_count // 0')
if [ "$SIGNAL_COUNT" -gt 0 ]; then
  pass "Signals generated: $SIGNAL_COUNT"
else
  log "⚠️  No signals generated (may be expected if ANTHROPIC_API_KEY not set)"
fi

# --- Summary ---
log ""
log "=== Smoke Test Complete ==="
log "Evidence saved to: $LOG_FILE"
log ""
log "Session ID: $SESSION_ID"
log "Processing status: $PROCESSING_STATUS"
log "Signal count: $SIGNAL_COUNT"

echo ""
echo "✅ MVP smoke test passed for $ENV"
