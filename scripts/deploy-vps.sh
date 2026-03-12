#!/usr/bin/env bash

set -euo pipefail

HOST="${DEPLOY_HOST:-${1:-}}"
SSH_USER="${DEPLOY_SSH_USER:-root}"
APP_DIR="${DEPLOY_APP_DIR:-/opt/apps/Socail_Media_Approvals}"
SERVICE="${DEPLOY_SERVICE:-socail-media-approvals.service}"
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"
SKIP_PUSH="${DEPLOY_SKIP_PUSH:-0}"

if [[ -z "${HOST}" ]]; then
  echo "Usage: DEPLOY_HOST=<host> $0"
  echo "   or: $0 <host>"
  exit 1
fi

LOCAL_COMMIT="$(git rev-parse --short HEAD)"

if [[ "${SKIP_PUSH}" != "1" ]]; then
  git push "${REMOTE}" "${BRANCH}"
fi

ssh "${SSH_USER}@${HOST}" "
  set -euo pipefail
  cd '${APP_DIR}'
  git fetch '${REMOTE}' '${BRANCH}'
  git reset --hard '${REMOTE}/${BRANCH}'
  npm ci
  npm run db:generate
  npm run db:push
  npm run build
  systemctl restart '${SERVICE}'
  echo deployed_commit=\$(git rev-parse --short HEAD)
  systemctl is-active '${SERVICE}'
"

echo "local_commit=${LOCAL_COMMIT}"
echo "host=${HOST}"
echo "service=${SERVICE}"
