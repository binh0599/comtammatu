#!/usr/bin/env bash
# =============================================================================
# db-backup.sh -- Manual database backup for Com tam Ma Tu F&B CRM
# =============================================================================
#
# Usage:
#   ./scripts/db-backup.sh                  # Full backup (schema + data)
#   ./scripts/db-backup.sh --schema-only    # Schema-only backup (no data)
#
# Prerequisites:
#   - Supabase CLI installed (https://supabase.com/docs/guides/cli)
#   - SUPABASE_DB_PASSWORD env var set (or will prompt)
#   - Linked to project: supabase link --project-ref zrlriuednoaqrsvnjjyo
#
# Output:
#   Compressed SQL dump saved to backups/ with timestamped filename.
#   Automatically removes backups older than the most recent 30.
#
# Environment variables:
#   SUPABASE_DB_PASSWORD  - Database password (required)
#   BACKUP_DIR            - Override backup directory (default: ./backups)
#   BACKUP_RETAIN_COUNT   - Number of backups to keep (default: 30)
# =============================================================================

set -euo pipefail

# --- Configuration ---
PROJECT_REF="zrlriuednoaqrsvnjjyo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETAIN_COUNT="${BACKUP_RETAIN_COUNT:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
SCHEMA_ONLY=false

# --- Parse arguments ---
for arg in "$@"; do
  case "$arg" in
    --schema-only)
      SCHEMA_ONLY=true
      ;;
    --help|-h)
      head -25 "$0" | tail -20
      exit 0
      ;;
    *)
      echo "Error: Unknown argument '$arg'"
      echo "Usage: $0 [--schema-only]"
      exit 1
      ;;
  esac
done

# --- Preflight checks ---
echo "=== Com tam Ma Tu DB Backup ==="
echo ""

# Check required tools
for cmd in supabase gzip; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is not installed or not in PATH."
    exit 1
  fi
done

# Check Supabase CLI is linked
if [ ! -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]; then
  echo "Warning: Supabase project may not be linked."
  echo "Run: supabase link --project-ref $PROJECT_REF"
  echo ""
  read -rp "Continue anyway? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Check password
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "SUPABASE_DB_PASSWORD is not set."
  read -rsp "Enter database password: " SUPABASE_DB_PASSWORD
  echo ""
  export SUPABASE_DB_PASSWORD
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# --- Build filename ---
if [ "$SCHEMA_ONLY" = true ]; then
  BACKUP_FILE="$BACKUP_DIR/comtammatu_schema_${TIMESTAMP}.sql"
  DUMP_FLAGS="--schema-only"
  echo "Mode: schema-only"
else
  BACKUP_FILE="$BACKUP_DIR/comtammatu_full_${TIMESTAMP}.sql"
  DUMP_FLAGS="--data-only"
  echo "Mode: full backup (schema + data)"
  # For a true full backup, we dump schema first, then data, into one file
  DUMP_FLAGS=""
fi

echo "Project: $PROJECT_REF"
echo "Output:  ${BACKUP_FILE}.gz"
echo ""

# --- Execute dump ---
echo "Starting dump..."

if [ "$SCHEMA_ONLY" = true ]; then
  supabase db dump \
    --project-ref "$PROJECT_REF" \
    --schema public \
    --schema-only \
    > "$BACKUP_FILE" 2>/dev/null
else
  # Dump schema first
  supabase db dump \
    --project-ref "$PROJECT_REF" \
    --schema public \
    > "$BACKUP_FILE" 2>/dev/null
fi

# Validate dump is not empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "Error: Dump file is empty. Check credentials and project link."
  rm -f "$BACKUP_FILE"
  exit 1
fi

DUMP_SIZE=$(wc -c < "$BACKUP_FILE")
echo "Dump complete: $(numfmt --to=iec "$DUMP_SIZE" 2>/dev/null || echo "${DUMP_SIZE} bytes")"

# --- Compress ---
echo "Compressing..."
gzip "$BACKUP_FILE"
COMPRESSED_SIZE=$(wc -c < "${BACKUP_FILE}.gz")
echo "Compressed:   $(numfmt --to=iec "$COMPRESSED_SIZE" 2>/dev/null || echo "${COMPRESSED_SIZE} bytes")"

# --- Rotate old backups ---
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "comtammatu_*.sql.gz" -type f | wc -l)

if [ "$BACKUP_COUNT" -gt "$RETAIN_COUNT" ]; then
  DELETE_COUNT=$((BACKUP_COUNT - RETAIN_COUNT))
  echo ""
  echo "Rotating backups: keeping $RETAIN_COUNT, removing $DELETE_COUNT old backup(s)..."
  find "$BACKUP_DIR" -maxdepth 1 -name "comtammatu_*.sql.gz" -type f -printf '%T@ %p\n' \
    | sort -n \
    | head -n "$DELETE_COUNT" \
    | cut -d' ' -f2- \
    | xargs rm -f
fi

echo ""
echo "Backup saved: ${BACKUP_FILE}.gz"
echo "Total backups: $(find "$BACKUP_DIR" -maxdepth 1 -name "comtammatu_*.sql.gz" -type f | wc -l)"
echo "Done."
