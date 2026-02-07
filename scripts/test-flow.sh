#!/bin/bash
# Test the full UserTests flow via API
# Usage: ./scripts/test-flow.sh [base_url]

BASE="${1:-https://usertests-stage.krasnoperov.me}"
echo "Testing against: $BASE"

# We need an auth token. For testing, we'll create a user directly in D1
# and generate a JWT. But since we can't do that from outside, let's use
# the SDK auth path instead (project key based, no user login needed).

echo ""
echo "=== 1. Health Check ==="
curl -s "$BASE/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE/api/health"

echo ""
echo "=== NOTE ==="
echo "Full flow requires auth. Use the web UI to sign in with Google,"
echo "or test the SDK endpoints which use project keys instead."
echo ""
echo "Once you have a project, the SDK flow is:"
echo "  1. GET  /api/sdk/screener/:id?key=ut_pub_xxx    — load screener"  
echo "  2. POST /api/sdk/screener/:id/respond?key=...   — submit answers"
echo "  3. POST /api/sdk/interview/:sessionId/start?key= — start interview"
echo "  4. POST /api/sdk/interview/:sessionId/message?key= — chat back and forth"
echo "  5. POST /api/sdk/interview/:sessionId/end?key=   — end interview"
echo "  6. Queue processes: transcription → signal extraction → task creation"
