#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-stage}"
PROJECT_NAME="${2:-Demo CLI Acceptance $(date +%s)}"
MESSAGE="${3:-This is a CLI acceptance smoke message}"

echo "[1/9] auth login --env ${ENVIRONMENT}"
npm run cli -- auth login --env "${ENVIRONMENT}"

echo "[2/9] project create --name '${PROJECT_NAME}'"
CREATE_JSON="$(npm run -s cli -- project create --name "${PROJECT_NAME}" --env "${ENVIRONMENT}" --json)"
PROJECT_ID="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.project?.id ?? "")' "${CREATE_JSON}")"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Failed to parse project id from create response"
  exit 1
fi

echo "project_id=${PROJECT_ID}"

echo "[3/9] project list"
npm run cli -- project list --env "${ENVIRONMENT}"

PROJECT_JSON="$(npm run -s cli -- project get "${PROJECT_ID}" --env "${ENVIRONMENT}" --json)"
PUBLIC_KEY="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.project?.public_key ?? "")' "${PROJECT_JSON}")"

if [[ -z "${PUBLIC_KEY}" ]]; then
  echo "Failed to parse project public key from project get response"
  exit 1
fi

echo "[4/9] session create <projectId> --name Alice"
SESSION_JSON="$(npm run -s cli -- session create "${PROJECT_ID}" --name Alice --env "${ENVIRONMENT}" --json)"
SESSION_ID="$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.session?.id ?? "")' "${SESSION_JSON}")"

if [[ -z "${SESSION_ID}" ]]; then
  echo "Failed to parse session id from session create response"
  exit 1
fi

echo "session_id=${SESSION_ID}"

echo "[5/9] session start <sessionId> --key <publicKey>"
npm run cli -- session start "${SESSION_ID}" --key "${PUBLIC_KEY}" --env "${ENVIRONMENT}"

echo "[6/9] session send <sessionId> --key <publicKey> --message ..."
npm run cli -- session send "${SESSION_ID}" --key "${PUBLIC_KEY}" --message "${MESSAGE}" --env "${ENVIRONMENT}"

echo "[7/9] session end <sessionId> --key <publicKey>"
npm run cli -- session end "${SESSION_ID}" --key "${PUBLIC_KEY}" --env "${ENVIRONMENT}"

echo "[8/9] signal list <projectId>"
npm run cli -- signal list "${PROJECT_ID}" --env "${ENVIRONMENT}"

echo "[9/9] task list <projectId>"
npm run cli -- task list "${PROJECT_ID}" --env "${ENVIRONMENT}"

echo "CLI acceptance scenario finished successfully."
