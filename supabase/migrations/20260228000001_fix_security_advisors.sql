-- ============================================================
-- Fix security advisor warnings from initial schema
-- Migration: 20260228000001_fix_security_advisors.sql
-- ============================================================

-- FIX 1: Add SET search_path = public to trigger functions
-- (prevents search_path injection attacks)

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_cashier_station_session()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pos_terminals
    WHERE id = NEW.terminal_id AND type = 'cashier_station'
  ) THEN
    RAISE EXCEPTION 'Only cashier_station terminals can open POS sessions';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_cashier_station_payment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pos_terminals
    WHERE id = NEW.terminal_id AND type = 'cashier_station'
  ) THEN
    RAISE EXCEPTION 'Only cashier_station terminals can process payments';
  END IF;
  RETURN NEW;
END;
$$;

-- FIX 2: Tighten security_events INSERT policy
-- (was WITH CHECK (true) — restrict to authenticated users)
-- Note: service_role (Edge Functions) bypasses RLS entirely, so unauthenticated
-- security events (e.g. failed logins) must be written via service_role.

DROP POLICY IF EXISTS "security_events_insert_any" ON security_events;

CREATE POLICY "security_events_insert_authenticated" ON security_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- FIX 3: Move pg_trgm to extensions schema (avoid public schema pollution)
-- Drop and recreate in extensions schema (we have no trgm-based indexes yet)

DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
