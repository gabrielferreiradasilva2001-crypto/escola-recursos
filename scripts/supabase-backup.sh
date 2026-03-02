#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is required."
  exit 1
fi

mkdir -p backups
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="backups/supabase-${timestamp}.dump"
sha_file="${dump_file}.sha256"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --dbname="${SUPABASE_DB_URL}" \
  --file="${dump_file}"

sha256sum "${dump_file}" > "${sha_file}"
echo "Backup generated: ${dump_file}"
echo "Checksum generated: ${sha_file}"
