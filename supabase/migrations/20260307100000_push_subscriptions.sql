-- ============================================================
-- Migration: Push Notification Subscriptions
-- Date: 2026-03-07
-- Description: Add push_subscriptions table for Web Push API
-- ============================================================

CREATE TABLE push_subscriptions (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint          TEXT NOT NULL,
  p256dh            TEXT NOT NULL,
  auth              TEXT NOT NULL,
  notification_types TEXT[] NOT NULL DEFAULT ARRAY['order_status', 'low_stock', 'campaign', 'reservation', 'payment', 'system'],
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'unsubscribed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_user_status ON push_subscriptions (user_id, status);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "push_subscriptions_own_select" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_own_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_own_update" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_own_delete" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role (cron jobs, server actions) can read all subscriptions
CREATE POLICY "push_subscriptions_service_select" ON push_subscriptions
  FOR SELECT TO service_role USING (true);

CREATE POLICY "push_subscriptions_service_update" ON push_subscriptions
  FOR UPDATE TO service_role USING (true);
