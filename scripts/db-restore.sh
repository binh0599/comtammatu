#!/usr/bin/env bash
# =============================================================================
# db-restore.sh -- Database restoration for Com tam Ma Tu F&B CRM
# =============================================================================
#
# Usage:
#   ./scripts/db-restore.sh <backup-file>              # Restore from backup
#   ./scripts/db-restore.sh --dry-run <backup-file>    # Validate only, no restore
#
# Prerequisites:
#   - psql (PostgreSQL client) installed
#   - SUPABASE_DB_URL env var set (full connection string)
#     Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
#   - Or individual vars: SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD
#
# The backup file can be a .sql or .sql.gz file.
#
# WARNING: This will overwrite data in the target database.
#          Always verify you are pointing at the correct environment.
# =============================================================================

set -euo pipefail

# --- Configuration ---
PROJECT_REF="zrlriuednoaqrsvnjjyo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DRY_RUN=false
BACKUP_FILE=""

# --- Parse arguments ---
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    --help|-h)
      head -20 "$0" | tail -16
      exit 0
      ;;
    -*)
      echo "Error: Unknown flag '$arg'"
      echo "Usage: $0 [--dry-run] <backup-file>"
      exit 1
      ;;
    *)
      BACKUP_FILE="$arg"
      ;;
  esac
done

# --- Validate arguments ---
if [ -z "$BACKUP_FILE" ]; then
  echo "Error: No backup file specified."
  echo "Usage: $0 [--dry-run] <backup-file>"
  exit 1
fi

# Resolve to absolute path
if [[ "$BACKUP_FILE" != /* ]]; then
  BACKUP_FILE="$(pwd)/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

echo "=== Com tam Ma Tu DB Restore ==="
echo ""

# --- Preflight checks ---
for cmd in psql; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is not installed or not in PATH."
    exit 1
  fi
done

if [[ "$BACKUP_FILE" == *.gz ]]; then
  if ! command -v gunzip &>/dev/null; then
    echo "Error: 'gunzip' is not installed or not in PATH."
    exit 1
  fi
fi

# --- Determine file type and validate ---
IS_GZIPPED=false
if [[ "$BACKUP_FILE" == *.gz ]]; then
  IS_GZIPPED=true
fi

echo "Backup file: $BACKUP_FILE"
FILE_SIZE=$(wc -c < "$BACKUP_FILE")
echo "File size:   $(numfmt --to=iec "$FILE_SIZE" 2>/dev/null || echo "${FILE_SIZE} bytes")"

# Validate the file content
echo ""
echo "Validating backup file..."

if [ "$IS_GZIPPED" = true ]; then
  # Check gzip integrity
  if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "Error: File is not a valid gzip archive."
    exit 1
  fi
  echo "  Gzip integrity: OK"

  # Check SQL content
  SQL_PREVIEW=$(gunzip -c "$BACKUP_FILE" | head -20)
  TOTAL_LINES=$(gunzip -c "$BACKUP_FILE" | wc -l)
else
  SQL_PREVIEW=$(head -20 "$BACKUP_FILE")
  TOTAL_LINES=$(wc -l < "$BACKUP_FILE")
fi

# Basic SQL validation: check for common SQL keywords
if echo "$SQL_PREVIEW" | grep -qiE '(CREATE|INSERT|SET|BEGIN|ALTER|--.*migration|--.*schema)'; then
  echo "  SQL content:    OK (looks like valid SQL)"
else
  echo "  Warning: File may not contain valid SQL. First lines:"
  echo "$SQL_PREVIEW" | head -5
  echo ""
  read -rp "Continue anyway? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "  Total lines:    $TOTAL_LINES"

# Check for schema type
if echo "$SQL_PREVIEW" | grep -qi "schema.only\|--.*schema"; then
  echo "  Type:           Likely schema-only"
else
  echo "  Type:           Likely full backup (schema + data)"
fi

# --- Dry run stops here ---
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "=== DRY RUN COMPLETE ==="
  echo "Backup file is valid and ready for restore."
  echo "Run without --dry-run to perform the actual restore."
  exit 0
fi

# --- Build connection string ---
if [ -n "${SUPABASE_DB_URL:-}" ]; then
  DB_URL="$SUPABASE_DB_URL"
elif [ -n "${SUPABASE_DB_HOST:-}" ] && [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
  DB_URL="postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@${SUPABASE_DB_HOST}:5432/postgres"
else
  echo ""
  echo "Error: No database connection configured."
  echo "Set one of:"
  echo "  - SUPABASE_DB_URL (full connection string)"
  echo "  - SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD"
  exit 1
fi

# --- Safety confirmation ---
echo ""
echo "============================================"
echo "  WARNING: DESTRUCTIVE OPERATION"
echo "============================================"
echo ""
echo "This will restore the backup to:"
echo "  $DB_URL" | sed 's/:[^:@]*@/:****@/'
echo ""
echo "Existing data may be overwritten or dropped."
echo ""
read -rp "Type 'RESTORE' to confirm: " confirm
if [ "$confirm" != "RESTORE" ]; then
  echo "Aborted. You must type exactly 'RESTORE' to proceed."
  exit 1
fi

echo ""
echo "Starting restore..."

# --- Execute restore ---
RESTORE_START=$(date +%s)

if [ "$IS_GZIPPED" = true ]; then
  gunzip -c "$BACKUP_FILE" | psql "$DB_URL" --single-transaction --set ON_ERROR_STOP=on 2>&1
else
  psql "$DB_URL" --single-transaction --set ON_ERROR_STOP=on -f "$BACKUP_FILE" 2>&1
fi

RESTORE_STATUS=$?
RESTORE_END=$(date +%s)
RESTORE_DURATION=$((RESTORE_END - RESTORE_START))

echo ""
if [ $RESTORE_STATUS -eq 0 ]; then
  echo "Restore completed successfully in ${RESTORE_DURATION}s."
else
  echo "Error: Restore failed with exit code $RESTORE_STATUS."
  echo "The transaction was rolled back (--single-transaction)."
  echo "Check the output above for details."
  exit $RESTORE_STATUS
fi

echo ""
echo "Post-restore checklist:"
echo "  1. Verify application connectivity"
echo "  2. Check RLS policies are intact: SELECT tablename, policyname FROM pg_policies;"
echo "  3. Verify row counts on critical tables (orders, payments, customers)"
echo "  4. Test a login flow end-to-end"
echo "Done."
