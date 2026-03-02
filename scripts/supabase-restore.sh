#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${TARGET_DB_URL:-}" ]]; then
  echo "TARGET_DB_URL is required."
  exit 1
fi

if [[ -z "${BACKUP_FILE:-}" ]]; then
  echo "BACKUP_FILE is required."
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="${TARGET_DB_URL}" \
  "${BACKUP_FILE}"

echo "Restore completed: ${BACKUP_FILE}"
