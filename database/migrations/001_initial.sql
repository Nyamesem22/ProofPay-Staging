BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(160) NOT NULL,
  phone_e164 varchar(20) NOT NULL UNIQUE,
  email varchar(254) UNIQUE,
  password_hash text NOT NULL,
  account_type varchar(24) NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual','business','staff','enterprise')),
  roles text[] NOT NULL DEFAULT ARRAY['customer']::text[],
  status varchar(24) NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','suspended','closed')),
  verification_status varchar(24) NOT NULL DEFAULT 'demo' CHECK (verification_status IN ('demo','pending','verified','rejected')),
  preferred_language varchar(12) NOT NULL DEFAULT 'en',
  is_demo boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL,
  country_code char(2) NOT NULL DEFAULT 'GH',
  wallet_phone_e164 varchar(20) NOT NULL,
  wallet_name varchar(160),
  status varchar(24) NOT NULL DEFAULT 'demo' CHECK (status IN ('demo','pending','active','blocked')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, wallet_phone_e164)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  ip_hash char(64),
  user_agent_hash char(64),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference varchar(40) NOT NULL UNIQUE,
  buyer_user_id uuid NOT NULL REFERENCES users(id),
  receiver_user_id uuid REFERENCES users(id),
  receiver_name varchar(160) NOT NULL,
  receiver_phone_e164 varchar(20) NOT NULL,
  receiver_provider varchar(40) NOT NULL,
  item_description varchar(500) NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  fee_minor bigint NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'GHS',
  delivery_due_at timestamptz NOT NULL,
  inspection_hours integer NOT NULL DEFAULT 24 CHECK (inspection_hours BETWEEN 1 AND 720),
  required_evidence varchar(100) NOT NULL,
  release_rule varchar(80) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','AWAITING_PAYMENT','PROTECTED','DELIVERED','READY_TO_RELEASE','RELEASE_PENDING','RELEASED','DISPUTED','REFUND_PENDING','REFUNDED','CANCELLED','FAILED')),
  is_demo boolean NOT NULL DEFAULT true,
  protected_at timestamptz,
  released_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_events (
  id bigserial PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  event_type varchar(64) NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  blob_url text NOT NULL,
  pathname text NOT NULL,
  content_type varchar(100) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  sha256 char(64),
  status varchar(24) NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_reference varchar(40) NOT NULL UNIQUE,
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  opened_by uuid NOT NULL REFERENCES users(id),
  reason varchar(80) NOT NULL,
  description text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','EVIDENCE_REQUIRED','UNDER_REVIEW','RESOLVED_RELEASE','RESOLVED_REFUND','RESOLVED_SPLIT','CLOSED')),
  resolution jsonb,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  command_type varchar(24) NOT NULL CHECK (command_type IN ('COLLECT','RELEASE','REFUND','PARTIAL_RELEASE')),
  idempotency_key varchar(100) NOT NULL UNIQUE,
  provider varchar(40) NOT NULL,
  provider_reference varchar(120),
  status varchar(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','ACKNOWLEDGED','SUCCEEDED','FAILED','RECONCILIATION_REQUIRED')),
  attempts integer NOT NULL DEFAULT 0,
  last_error_code varchar(80),
  next_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_receipts (
  id bigserial PRIMARY KEY,
  provider varchar(40) NOT NULL,
  provider_event_id varchar(160) NOT NULL,
  signature_valid boolean NOT NULL,
  payload_hash char(64) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'RECEIVED',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  request_id uuid,
  actor_user_id uuid REFERENCES users(id),
  action varchar(100) NOT NULL,
  entity_type varchar(60) NOT NULL,
  entity_id varchar(100),
  result varchar(24) NOT NULL,
  ip_hash char(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL REFERENCES users(id),
  department varchar(80) NOT NULL,
  report_date date NOT NULL,
  summary text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  incidents text,
  handover text,
  status varchar(24) NOT NULL DEFAULT 'DRAFT',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staff_user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(token_hash, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_created ON transactions(buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_created ON transactions(receiver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_transaction_events_transaction ON transaction_events(transaction_id, created_at);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_payment_commands_retry ON payment_commands(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);

COMMIT;
