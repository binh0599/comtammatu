-- ============================================================
-- RLS Policy Audit Script
-- Run via: supabase db execute or Supabase MCP execute_sql
--
-- Validates that all tables with RLS enabled have the expected
-- policies and that no table is missing RLS entirely.
-- ============================================================

-- 1. List all user tables and their RLS status
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. All RLS policies with their details
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Tables with RLS enabled but NO policies (dangerous - blocks all access)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- 4. Tables WITHOUT RLS (should be empty for this project)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 5. Policy count per table (helps spot tables with too few policies)
SELECT
  tablename,
  COUNT(*) AS policy_count,
  array_agg(DISTINCT cmd) AS operations_covered
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
