#!/usr/bin/env sh
set -eu

# Local development reset path only. Never run against production.
# Usage from repo root:
#   docker compose run --rm -e RESET_LOCAL_DEV_DB=true -e APP_ENV=development backend

if [ "${APP_ENV:-development}" = "production" ]; then
  echo "Refusing to reset database in production" >&2
  exit 1
fi

export RESET_LOCAL_DEV_DB=true
exec /app/morfoschools-api
