-- ============================================================
-- events table — append-only event store
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id       TEXT        NOT NULL,
  sequence_number BIGINT      NOT NULL,
  type            TEXT        NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL,
  actor_id        TEXT        NOT NULL,
  actor_type      TEXT        NOT NULL,
  correlation_id  TEXT,
  causation_id    TEXT,
  payload         JSONB       NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT events_stream_sequence_unique UNIQUE (stream_id, sequence_number)
);

-- Immutability enforcer: no UPDATE or DELETE allowed on events
CREATE OR REPLACE FUNCTION events_immutability_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Events are immutable: UPDATE and DELETE are prohibited on the events table';
END;
$$;

CREATE TRIGGER events_no_mutate
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION events_immutability_guard();

CREATE INDEX IF NOT EXISTS events_stream_id_idx    ON events (stream_id, sequence_number ASC);
CREATE INDEX IF NOT EXISTS events_type_idx         ON events (type);
CREATE INDEX IF NOT EXISTS events_occurred_at_idx  ON events (occurred_at DESC);

-- ============================================================
-- relational store — core domain tables
-- ============================================================
CREATE TABLE IF NOT EXISTS facilities (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  address     TEXT,
  timezone    TEXT        NOT NULL DEFAULT 'UTC',
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS zones (
  id          TEXT        PRIMARY KEY,
  facility_id TEXT        NOT NULL REFERENCES facilities(id),
  name        TEXT        NOT NULL,
  description TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workstations (
  id          TEXT        PRIMARY KEY,
  facility_id TEXT        NOT NULL REFERENCES facilities(id),
  zone_id     TEXT        NOT NULL REFERENCES zones(id),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('physical', 'virtual')),
  ip_address  TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS persons (
  id             TEXT        PRIMARY KEY,
  username       TEXT        NOT NULL UNIQUE,
  email          TEXT        NOT NULL UNIQUE,
  display_name   TEXT        NOT NULL,
  password_hash  TEXT        NOT NULL,
  roles          JSONB       NOT NULL DEFAULT '[]',
  xmpp_jid       TEXT,
  last_login_at  TIMESTAMPTZ,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT        PRIMARY KEY,
  person_id   TEXT        NOT NULL REFERENCES persons(id),
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jobs (
  id                TEXT        PRIMARY KEY,
  facility_id       TEXT        NOT NULL REFERENCES facilities(id),
  zone_id           TEXT        NOT NULL REFERENCES zones(id),
  workstation_id    TEXT        NOT NULL REFERENCES workstations(id),
  name              TEXT        NOT NULL,
  description       TEXT,
  status            TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'voided')),
  assigned_person_id TEXT       REFERENCES persons(id),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
  id                 TEXT        PRIMARY KEY,
  job_id             TEXT        NOT NULL REFERENCES jobs(id),
  name               TEXT        NOT NULL,
  description        TEXT,
  status             TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  ordinal            INTEGER     NOT NULL DEFAULT 0,
  assigned_person_id TEXT        REFERENCES persons(id),
  completed_at       TIMESTAMPTZ,
  metadata           JSONB       NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notes (
  id              TEXT        PRIMARY KEY,
  job_id          TEXT        NOT NULL REFERENCES jobs(id),
  task_id         TEXT        REFERENCES tasks(id),
  body            TEXT        NOT NULL,
  author_id       TEXT        NOT NULL REFERENCES persons(id),
  revision_number INTEGER     NOT NULL DEFAULT 1,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS issues (
  id           TEXT        PRIMARY KEY,
  job_id       TEXT        NOT NULL REFERENCES jobs(id),
  task_id      TEXT        REFERENCES tasks(id),
  description  TEXT        NOT NULL,
  severity     TEXT        NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status       TEXT        NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution   TEXT,
  reported_by  TEXT        NOT NULL REFERENCES persons(id),
  resolved_at  TIMESTAMPTZ,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT        PRIMARY KEY,
  type          TEXT        NOT NULL CHECK (type IN ('job_thread', 'direct')),
  job_id        TEXT        REFERENCES jobs(id),
  xmpp_room_jid TEXT        NOT NULL UNIQUE,
  subject       TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT        PRIMARY KEY,
  conversation_id TEXT        NOT NULL REFERENCES conversations(id),
  sender_jid      TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  xmpp_stanza_id  TEXT        NOT NULL UNIQUE,
  sent_at         TIMESTAMPTZ NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifacts (
  id           TEXT        PRIMARY KEY,
  job_id       TEXT        NOT NULL REFERENCES jobs(id),
  task_id      TEXT        REFERENCES tasks(id),
  filename     TEXT        NOT NULL,
  mime_type    TEXT        NOT NULL,
  size_bytes   BIGINT      NOT NULL,
  storage_key  TEXT        NOT NULL UNIQUE,
  uploaded_by  TEXT        NOT NULL REFERENCES persons(id),
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: default admin user (password: 'admin_dev_password' — change in production)
INSERT INTO persons (id, username, email, display_name, password_hash, roles)
VALUES (
  'person_admin_01',
  'admin',
  'admin@clark.local',
  'Administrator',
  -- argon2id hash of 'admin_dev_password' (placeholder — overwrite at startup)
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
  '["owner"]'
) ON CONFLICT DO NOTHING;
