-- JalalAI identity/entitlements schema
-- Maps 1:1 to src/identity/types.ts (IdentityStoreData).
-- Replaces the single-process JSON file store for multi-instance deployment.

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  password_salt  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('user','admin')),
  account_status TEXT NOT NULL CHECK (account_status IN ('active','suspended')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,          -- SHA-256 digest only; raw token never stored
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS plans (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan_id    TEXT NOT NULL CHECK (plan_id IN ('free','pro','ultra')),
  status     TEXT NOT NULL CHECK (status IN ('active','trialing','past_due','cancelled','expired')),
  platform   TEXT CHECK (platform IN ('web','android','manual-admin')),
  renews_at  TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_counters (
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_utc            DATE NOT NULL,
  prompts_used_today INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day_utc)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id        TEXT PRIMARY KEY,
  ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  type      TEXT NOT NULL,
  user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_id  TEXT,
  detail    JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(type);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);

CREATE TABLE IF NOT EXISTS orders (
  order_ref      TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id        TEXT NOT NULL CHECK (plan_id IN ('free','pro','ultra')),
  amount_pkr     INTEGER NOT NULL,
  gateway        TEXT NOT NULL CHECK (gateway IN ('jazzcash','easypaisa','manual-admin')),
  status         TEXT NOT NULL CHECK (status IN ('pending','fulfilled','failed','expired')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  fulfilled_at   TIMESTAMPTZ,
  gateway_txn_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Idempotent webhook replay protection (JazzCash/Easypaisa can resend callbacks).
CREATE TABLE IF NOT EXISTS webhook_receipts (
  gateway       TEXT NOT NULL,
  gateway_txn_id TEXT NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (gateway, gateway_txn_id)
);
