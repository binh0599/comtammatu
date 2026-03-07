# Backup Strategy -- Com tam Ma Tu F&B CRM

> Project: `zrlriuednoaqrsvnjjyo` | Database: Supabase PostgreSQL 17

---

## Table of Contents

1. [Overview](#overview)
2. [Supabase Built-in Backups](#supabase-built-in-backups)
3. [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
4. [Manual Backup Procedures](#manual-backup-procedures)
5. [Disaster Recovery Runbook](#disaster-recovery-runbook)
6. [Critical Tables](#critical-tables)
7. [Testing Schedule](#testing-schedule)
8. [Backup Matrix](#backup-matrix)

---

## Overview

The backup strategy follows a defense-in-depth approach with three layers:

| Layer | Method | RPO | RTO | Plan Required |
|-------|--------|-----|-----|---------------|
| 1 | Supabase daily automatic backups | 24 hours | ~1 hour | Pro |
| 2 | Point-in-Time Recovery (PITR) | ~seconds | ~30 min | Pro (add-on) |
| 3 | Manual SQL dumps via scripts | On-demand | Variable | Any |

**RPO** = Recovery Point Objective (max data loss).
**RTO** = Recovery Time Objective (max downtime).

---

## Supabase Built-in Backups

Supabase provides automatic daily backups on the Pro plan and above.

**What is included:**
- Full logical backup of all schemas (public, auth, storage)
- Taken once per day during low-traffic hours
- Retained for 7 days (Pro) or 30 days (Team/Enterprise)
- Accessible via Supabase Dashboard > Settings > Database > Backups

**What is NOT included:**
- Storage bucket files (backed up separately)
- Edge Function code (stored in git)
- Realtime subscriptions state

**How to restore from dashboard:**
1. Go to https://supabase.com/dashboard/project/zrlriuednoaqrsvnjjyo/settings/database
2. Navigate to "Backups" section
3. Select the desired backup date
4. Click "Restore" -- this replaces the entire database

**Limitations:**
- Restores are all-or-nothing (no table-level granularity)
- Restoration causes ~10-30 minutes of downtime
- Cannot restore to a different project directly

---

## Point-in-Time Recovery (PITR)

PITR uses WAL (Write-Ahead Logging) to enable recovery to any point in time, down to the second.

**How it works:**
- PostgreSQL continuously streams WAL records to Supabase's backup storage
- You can recover to any timestamp within the retention window
- Much lower RPO than daily backups (seconds vs. 24 hours)

**When to use PITR:**
- Accidental mass deletion or UPDATE without WHERE clause
- Corrupt data from a bad migration
- Need to recover to a specific moment before an incident

**How to initiate PITR:**
1. Go to Supabase Dashboard > Settings > Database > Backups > Point in Time
2. Select the target timestamp
3. Confirm the restoration
4. Wait for the recovery to complete (~15-30 minutes)

**Important notes:**
- PITR is a Pro plan add-on -- verify it is enabled for this project
- Restoration replaces the entire database state at that point in time
- Auth sessions will be invalidated; users must re-login
- Cron jobs (process-deletions, upgrade-tiers, inventory-alerts) resume automatically after Vercel reconnects

---

## Manual Backup Procedures

Two helper scripts are provided in `scripts/` for manual backup and restore operations.

### Creating a Backup

```bash
# Full backup (schema + data)
./scripts/db-backup.sh

# Schema-only backup (no row data)
./scripts/db-backup.sh --schema-only
```

**Required environment:**
```bash
export SUPABASE_DB_PASSWORD="your-db-password"
```

**What happens:**
1. Runs `supabase db dump` against the remote project
2. Saves SQL to `backups/comtammatu_full_YYYYMMDD_HHMMSS.sql`
3. Compresses with gzip
4. Removes backups beyond the last 30

**Recommended schedule for manual backups:**
- Before every migration deployment
- Before any bulk data operation
- Weekly as a supplemental off-site backup
- Before major releases

### Restoring from a Backup

```bash
# Validate a backup file without restoring
./scripts/db-restore.sh --dry-run backups/comtammatu_full_20260306_120000.sql.gz

# Restore (requires typing 'RESTORE' to confirm)
./scripts/db-restore.sh backups/comtammatu_full_20260306_120000.sql.gz
```

**Required environment:**
```bash
# Option A: full connection string
export SUPABASE_DB_URL="postgresql://postgres.zrlriuednoaqrsvnjjyo:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

# Option B: individual variables
export SUPABASE_DB_HOST="aws-0-REGION.pooler.supabase.com"
export SUPABASE_DB_PASSWORD="your-db-password"
```

**Safety features:**
- Requires explicit `RESTORE` confirmation
- Uses `--single-transaction` (rolls back on any error)
- `--dry-run` validates file integrity without touching the database
- Prints post-restore verification checklist

---

## Disaster Recovery Runbook

### Scenario 1: Accidental Data Deletion

**Severity:** High | **Target RTO:** < 1 hour

Steps:
1. **Immediately** disable the application (Vercel > Project > Pause Deployments) or set maintenance mode
2. Assess the scope: which tables, how many rows, what time did it happen?
3. **If PITR is enabled:**
   - Use PITR to restore to the moment before deletion
   - Go to Dashboard > Backups > Point in Time > select timestamp
4. **If PITR is not enabled:**
   - Restore from the most recent daily backup via Dashboard
   - Accept potential data loss since the last daily backup
5. **If you have a recent manual backup:**
   - Use `scripts/db-restore.sh` to restore specific tables
6. Verify data integrity (see post-restore checks below)
7. Re-enable the application
8. Notify affected users if customer data was impacted

### Scenario 2: Bad Migration / Schema Corruption

**Severity:** High | **Target RTO:** < 2 hours

Steps:
1. Stop all deployments; do not apply further migrations
2. Check `supabase/migrations/` for the problematic migration
3. **If the migration just ran:**
   - Write and apply a rollback migration to reverse the changes
   - Test on a branch database first: `supabase db reset` locally
4. **If rollback is not feasible:**
   - Restore from backup (PITR preferred for minimal data loss)
   - Re-apply all migrations up to (but not including) the bad one
5. Fix the migration, test locally, then re-deploy

### Scenario 3: Complete Database Loss

**Severity:** Critical | **Target RTO:** < 4 hours

Steps:
1. Contact Supabase support immediately (support@supabase.com)
2. Check if the project can be restored from Supabase's infrastructure
3. If project is unrecoverable:
   - Create a new Supabase project
   - Apply all migrations: `supabase db push`
   - Restore data from the most recent backup file
   - Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel env vars
   - Update `supabase/config.toml` project reference
   - Re-deploy the application
4. Verify all RLS policies are intact
5. Verify cron jobs resume (process-deletions, upgrade-tiers, inventory-alerts)

### Scenario 4: Security Breach / Unauthorized Access

**Severity:** Critical | **Target RTO:** Immediate containment

Steps:
1. Rotate all database passwords and API keys immediately
2. Rotate Supabase `service_role` key
3. Rotate JWT secret if auth is compromised
4. Review `audit_logs` and `security_events` tables (append-only, should be intact)
5. Assess what data was accessed or modified
6. If data was tampered with, restore from a pre-breach backup
7. Update all secrets in Vercel environment variables
8. Re-deploy the application
9. Notify affected users per GDPR requirements (72-hour window)

### Post-Restore Verification Checklist

Run these checks after any restore operation:

```sql
-- 1. Verify RLS policies exist on all critical tables
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 2. Check row counts on critical tables
SELECT 'tenants' as tbl, COUNT(*) FROM tenants
UNION ALL SELECT 'branches', COUNT(*) FROM branches
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'menu_items', COUNT(*) FROM menu_items;

-- 3. Verify auth helper functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('auth_tenant_id', 'auth_branch_id', 'auth_role');

-- 4. Verify triggers are intact
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- 5. Check for orphaned foreign keys
SELECT tc.table_name, tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
```

After SQL checks:
- [ ] Login as owner -- verify auth works
- [ ] Login as cashier -- verify POS terminal loads
- [ ] Open KDS board -- verify realtime connection
- [ ] Place a test order -- verify full order flow
- [ ] Check Vercel cron logs -- verify crons execute

---

## Critical Tables

Priority order for backup verification and recovery. These tables represent the core business data that would be hardest to reconstruct.

| Priority | Table | Why Critical | Estimated Size |
|----------|-------|-------------|----------------|
| P0 | `orders` | Revenue records, legal/tax requirement | High |
| P0 | `payments` | Financial transactions, reconciliation | High |
| P0 | `customers` | Customer PII, loyalty data, GDPR subject | Medium |
| P0 | `profiles` | User accounts, roles, branch assignment | Low |
| P0 | `audit_logs` | Compliance trail, append-only, irreplaceable | High |
| P0 | `security_events` | Security audit trail, append-only | Medium |
| P1 | `order_items` | Line items for each order | High |
| P1 | `order_status_history` | Order lifecycle tracking | High |
| P1 | `tenants` | Multi-tenant root records | Low |
| P1 | `branches` | Location configuration | Low |
| P2 | `menu_items` | Menu catalog (can be re-entered) | Low |
| P2 | `stock_levels` | Inventory state | Medium |
| P2 | `employees` | Staff records | Low |
| P2 | `loyalty_transactions` | Points history | Medium |
| P3 | `vouchers` | Promotion codes | Low |
| P3 | `campaigns` | Marketing campaigns | Low |
| P3 | `kds_tickets` | Ephemeral kitchen display data | Medium |
| P3 | `notifications` | Ephemeral, can be regenerated | Medium |

**Never deletable:** `audit_logs`, `security_events` (append-only policy, see CLAUDE.md rule #8).

---

## Testing Schedule

Backup restore tests must be performed quarterly to ensure the recovery process works.

### Quarterly Restore Test Procedure

**Schedule:** First Monday of January, April, July, October

**Steps:**
1. Create a fresh manual backup using `scripts/db-backup.sh`
2. Create a temporary Supabase branch: `supabase branches create backup-test`
3. Restore the backup to the branch database
4. Run the post-restore verification checklist (SQL queries above)
5. Verify application connectivity against the branch
6. Document results in a test report
7. Delete the branch: `supabase branches delete backup-test`

**Test report template:**

```
## Backup Restore Test -- YYYY-MM-DD

Tester: [name]
Backup file: [filename]
Backup date: [date]
Restore target: [branch name]

Results:
- [ ] Backup file valid (--dry-run passed)
- [ ] Restore completed without errors
- [ ] RLS policies intact (count: __)
- [ ] Row counts match expectations
- [ ] Auth functions present
- [ ] Login flow works
- [ ] Order flow works
- [ ] Cron jobs executable

Duration: __ minutes
Issues found: [none / describe]
```

### Annual Disaster Recovery Drill

**Schedule:** Once per year, coordinated with the team

Full simulation of Scenario 3 (complete database loss):
1. Create a new temporary Supabase project
2. Apply all migrations from `supabase/migrations/`
3. Restore data from backup
4. Verify full application functionality
5. Document total recovery time (target: < 4 hours)
6. Tear down the temporary project

---

## Backup Matrix

Summary of all backup mechanisms and their characteristics:

| Mechanism | Frequency | Retention | Granularity | Off-site | Automated |
|-----------|-----------|-----------|-------------|----------|-----------|
| Supabase daily | Daily | 7-30 days | Full DB | Yes | Yes |
| PITR (if enabled) | Continuous | 7 days | Full DB to any second | Yes | Yes |
| Manual dump (full) | On-demand | Last 30 files | Full DB | No* | No |
| Manual dump (schema) | On-demand | Last 30 files | Schema only | No* | No |
| Git migrations | Every commit | Unlimited | Schema only | Yes (GitHub) | Yes |

*Manual dumps are stored locally in `backups/`. For off-site storage, copy to a secure external location (S3, GCS, etc.).

### Recommended: Automate Off-site Backups

For production, consider adding a CI/CD step or cron to:
1. Run `scripts/db-backup.sh` on a schedule
2. Upload the compressed dump to cloud storage (S3/GCS with versioning)
3. Send a notification on failure

This can be implemented as a GitHub Action or a separate scheduled task.

---

*Last updated: 2026-03-06*
