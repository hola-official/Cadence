-- ================================================================
-- Merchant Checkout Example — Supabase Setup
-- Run this once in the Supabase SQL Editor for your project.
-- ================================================================

-- Subscriber table: tracks each subscription linked to a Supabase user
CREATE TABLE IF NOT EXISTS merchant_subscribers (
  id              BIGSERIAL PRIMARY KEY,
  policy_id       TEXT        UNIQUE NOT NULL,
  payer_address   TEXT        NOT NULL DEFAULT '',
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id         TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  access_granted  BOOLEAN     NOT NULL DEFAULT true,
  charge_amount   TEXT        NOT NULL DEFAULT '0',
  interval_seconds INTEGER    NOT NULL DEFAULT 0,
  total_charges   INTEGER     NOT NULL DEFAULT 0,
  total_paid      TEXT        NOT NULL DEFAULT '0',
  last_charge_at          TIMESTAMPTZ,
  next_charge_expected_at TIMESTAMPTZ,
  consecutive_failures    INTEGER     NOT NULL DEFAULT 0,
  last_failure_reason     TEXT,
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_merchant_subscribers_user_id
  ON merchant_subscribers (user_id);

-- Index for fast lookup by payer address
CREATE INDEX IF NOT EXISTS idx_merchant_subscribers_payer
  ON merchant_subscribers (payer_address);

-- RLS: enable so the service-role key (server) bypasses, anon key (client) is restricted
ALTER TABLE merchant_subscribers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read only their own subscription
CREATE POLICY "Users can read own subscription"
  ON merchant_subscribers FOR SELECT
  USING (user_id = auth.uid());
