-- ============================================================
-- Clarkware v1 — PostgreSQL schema
-- Append-only event store + relational read model
-- ============================================================

-- ============================================================
-- SECTION 1: Event store
-- ============================================================

-- Global ordering sequence for cross-stream event ordering
CREATE SEQUENCE IF NOT EXISTS events_global_seq;

CREATE TABLE IF NOT EXISTS events (
  id               TEXT        PRIMARY KEY,
  stream_id        TEXT        NOT NULL,
  sequence_number  BIGINT      NOT NULL,
  global_seq       BIGINT      NOT NULL DEFAULT nextval('events_global_seq'),
  type             TEXT        NOT NULL,
  -- Context denormalization — enables efficient partitioned queries
  facility_id      TEXT,
  workstation_id   TEXT,
  job_id           TEXT,
  issue_id         TEXT,
  conversation_id  TEXT,
  -- Actor attribution
  actor_id         TEXT        NOT NULL,
  actor_type       TEXT        NOT NULL
                   CHECK (actor_type IN ('human_user', 'ai_agent', 'automation_service')),
  source_type      TEXT        NOT NULL
                   CHECK (source_type IN ('human_ui', 'ai_agent', 'automation_service', 'tool_adapter', 'system')),
  -- Causality chain
  correlation_id   TEXT,
  causation_id     TEXT,
  -- Timestamps (occurredAt = logical time, recorded_at = storage time)
  occurred_at      TIMESTAMPTZ NOT NULL,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Payload and attachment refs
  payload          JSONB       NOT NULL,
  artifact_refs    TEXT[]      NOT NULL DEFAULT '{}',
  -- Retention classification
  retention_class  TEXT        NOT NULL DEFAULT 'operational'
                   CHECK (retention_class IN ('operational', 'evidence', 'transient', 'compliance')),
  metadata         JSONB       NOT NULL DEFAULT '{}',
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

CREATE INDEX IF NOT EXISTS events_stream_seq_idx      ON events (stream_id, sequence_number ASC);
CREATE INDEX IF NOT EXISTS events_global_seq_idx      ON events (global_seq ASC);
CREATE INDEX IF NOT EXISTS events_type_idx            ON events (type);
CREATE INDEX IF NOT EXISTS events_occurred_at_idx     ON events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS events_facility_idx        ON events (facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_workstation_idx     ON events (workstation_id) WHERE workstation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_job_idx             ON events (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_issue_idx           ON events (issue_id) WHERE issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_conversation_idx    ON events (conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_actor_idx           ON events (actor_id);
CREATE INDEX IF NOT EXISTS events_retention_idx       ON events (retention_class);

-- ============================================================
-- SECTION 2: Offline event queue (local-first sync)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_queue (
  id               TEXT        PRIMARY KEY,
  stream_id        TEXT        NOT NULL,
  -- Monotonic local counter — resolved to global sequence_number on sync
  local_sequence   BIGINT      NOT NULL,
  type             TEXT        NOT NULL,
  payload          JSONB       NOT NULL,
  artifact_refs    TEXT[]      NOT NULL DEFAULT '{}',
  retention_class  TEXT        NOT NULL DEFAULT 'operational',
  metadata         JSONB       NOT NULL DEFAULT '{}',
  occurred_at      TIMESTAMPTZ NOT NULL,
  actor_id         TEXT        NOT NULL,
  actor_type       TEXT        NOT NULL,
  source_type      TEXT        NOT NULL,
  correlation_id   TEXT,
  causation_id     TEXT,
  -- Sync lifecycle
  status           TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'syncing', 'synced', 'conflict', 'failed')),
  sync_attempts    INTEGER     NOT NULL DEFAULT 0,
  last_sync_at     TIMESTAMPTZ,
  synced_event_id  TEXT        REFERENCES events(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT event_queue_stream_local_unique UNIQUE (stream_id, local_sequence)
);

CREATE INDEX IF NOT EXISTS event_queue_status_idx     ON event_queue (status, created_at ASC);
CREATE INDEX IF NOT EXISTS event_queue_stream_idx     ON event_queue (stream_id, local_sequence ASC);

-- ============================================================
-- SECTION 3: Sync conflict log
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id                TEXT        PRIMARY KEY,
  queued_event_id   TEXT        NOT NULL REFERENCES event_queue(id),
  conflicting_event_id TEXT     NOT NULL REFERENCES events(id),
  conflict_type     TEXT        NOT NULL
                    CHECK (conflict_type IN ('sequence_gap', 'concurrent_write', 'version_mismatch', 'schema_mismatch')),
  resolution        TEXT
                    CHECK (resolution IN ('server_wins', 'client_wins', 'merged', 'deferred', 'manual')),
  resolved_by       TEXT,
  detail            JSONB       NOT NULL DEFAULT '{}',
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sync_conflicts_unresolved_idx ON sync_conflicts (occurred_at DESC) WHERE resolution IS NULL;

-- ============================================================
-- SECTION 4: Unified actors table + specialisation tables
-- ============================================================

-- Single actors table — all identity types resolve here
CREATE TABLE IF NOT EXISTS actors (
  id           TEXT        PRIMARY KEY,
  actor_type   TEXT        NOT NULL
               CHECK (actor_type IN ('human_user', 'ai_agent', 'automation_service')),
  xmpp_jid     TEXT        UNIQUE,
  facility_id  TEXT,       -- nullable; system-level actors may be cross-facility
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS actors_type_idx       ON actors (actor_type);
CREATE INDEX IF NOT EXISTS actors_facility_idx   ON actors (facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS actors_jid_idx        ON actors (xmpp_jid) WHERE xmpp_jid IS NOT NULL;

-- Persons (human specialisation)
CREATE TABLE IF NOT EXISTS persons (
  id               TEXT        PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  username         TEXT        NOT NULL UNIQUE,
  email            TEXT        NOT NULL UNIQUE,
  display_name     TEXT        NOT NULL,
  password_hash    TEXT        NOT NULL,
  employment_type  TEXT        NOT NULL DEFAULT 'employee'
                   CHECK (employment_type IN ('employee', 'contractor', 'remote_expert', 'auditor')),
  -- Soft facility affiliation (persons can operate at multiple facilities)
  primary_facility_id TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at    TIMESTAMPTZ,
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS persons_email_idx     ON persons (email);
CREATE INDEX IF NOT EXISTS persons_username_idx  ON persons (username);
CREATE INDEX IF NOT EXISTS persons_status_idx    ON persons (status) WHERE deleted_at IS NULL;

-- AI Agents (agent specialisation)
CREATE TABLE IF NOT EXISTS ai_agents (
  id                    TEXT        PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL UNIQUE,
  agent_type            TEXT        NOT NULL
                        CHECK (agent_type IN ('summarizer', 'router', 'retrieval_assistant', 'drafting_assistant', 'triage_assistant')),
  operator_org          TEXT,
  allowed_action_classes TEXT[]     NOT NULL DEFAULT '{}',
  model_id              TEXT        NOT NULL DEFAULT 'claude-sonnet-4-6',
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  metadata              JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation Services (service specialisation)
CREATE TABLE IF NOT EXISTS automation_services (
  id              TEXT        PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL UNIQUE,
  service_type    TEXT        NOT NULL
                  CHECK (service_type IN ('tool_adapter', 'file_watcher', 'data_exporter', 'alert_router', 'sync_worker', 'backup_service')),
  -- Facilities this service is authorised to act within (empty = all)
  facility_scope  TEXT[]      NOT NULL DEFAULT '{}',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_heartbeat_at TIMESTAMPTZ,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens (persons only — agents use API keys)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT        PRIMARY KEY,
  person_id   TEXT        NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS refresh_tokens_person_idx ON refresh_tokens (person_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_hash_idx   ON refresh_tokens (token_hash);

-- ============================================================
-- SECTION 5: Permission grants
-- ============================================================

CREATE TABLE IF NOT EXISTS permission_grants (
  id                    TEXT        PRIMARY KEY,
  actor_id              TEXT        NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  actor_type            TEXT        NOT NULL,
  role                  TEXT        NOT NULL,
  -- Scope discriminator + scoped FK (one populated per level)
  scope_level           TEXT        NOT NULL
                        CHECK (scope_level IN ('facility', 'zone', 'workstation', 'job', 'issue', 'conversation')),
  scope_facility_id     TEXT,
  scope_zone_id         TEXT,
  scope_workstation_id  TEXT,
  scope_job_id          TEXT,
  scope_issue_id        TEXT,
  scope_conversation_id TEXT,
  -- Permission set
  permissions           TEXT[]      NOT NULL DEFAULT '{}',
  allowed_action_classes TEXT[]     NOT NULL DEFAULT '{}',  -- AI agents only
  -- Audit trail
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by            TEXT        NOT NULL REFERENCES actors(id),
  expires_at            TIMESTAMPTZ,
  granted_for_reason    TEXT,
  revoked_at            TIMESTAMPTZ,
  revoked_by            TEXT        REFERENCES actors(id)
);

CREATE INDEX IF NOT EXISTS perm_grants_actor_idx     ON permission_grants (actor_id);
CREATE INDEX IF NOT EXISTS perm_grants_scope_idx     ON permission_grants (scope_level, scope_facility_id, scope_zone_id, scope_workstation_id, scope_job_id);
CREATE INDEX IF NOT EXISTS perm_grants_active_idx    ON permission_grants (actor_id, expires_at) WHERE revoked_at IS NULL;

-- ============================================================
-- SECTION 6: Facilities and spatial hierarchy
-- ============================================================

CREATE TABLE IF NOT EXISTS facilities (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  code          TEXT        NOT NULL UNIQUE,  -- short uppercase code e.g. "NIAGARA"
  timezone      TEXT        NOT NULL DEFAULT 'UTC',
  jurisdiction  TEXT        NOT NULL DEFAULT 'ON-CA',
  status        TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'decommissioned')),
  owner_org     TEXT,
  xmpp_domain   TEXT        NOT NULL UNIQUE,  -- e.g. "niagara.clark"
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS zones (
  id           TEXT        PRIMARY KEY,
  facility_id  TEXT        NOT NULL REFERENCES facilities(id),
  name         TEXT        NOT NULL,
  zone_type    TEXT        NOT NULL DEFAULT 'general'
               CHECK (zone_type IN ('assembly', 'test', 'calibration', 'diagnostics', 'receiving', 'shipping', 'qa', 'storage', 'general')),
  status       TEXT        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive', 'decommissioned')),
  description  TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS zones_facility_idx ON zones (facility_id);

CREATE TABLE IF NOT EXISTS workstations (
  id                     TEXT        PRIMARY KEY,
  facility_id            TEXT        NOT NULL REFERENCES facilities(id),
  zone_id                TEXT        NOT NULL REFERENCES zones(id),
  name                   TEXT        NOT NULL,
  station_type           TEXT        NOT NULL DEFAULT 'general'
                         CHECK (station_type IN ('assembly', 'test', 'calibration', 'inspection', 'diagnostics', 'general')),
  status                 TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
  -- Physical/network identity
  ip_address             TEXT,
  -- Device capability profile (JSONB for flexibility across workstation types)
  device_profile         JSONB       NOT NULL DEFAULT '{}',
  -- Tool integration configuration
  integration_profile    JSONB       NOT NULL DEFAULT '{}',
  -- Live adapter state (denormalised from latest presence/adapter events)
  current_adapter_status TEXT        DEFAULT 'offline'
                         CHECK (current_adapter_status IN ('connected', 'idle', 'importing', 'error', 'offline')),
  metadata               JSONB       NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS workstations_facility_idx ON workstations (facility_id);
CREATE INDEX IF NOT EXISTS workstations_zone_idx     ON workstations (zone_id);

-- ============================================================
-- SECTION 7: Jobs, tasks, and the work lifecycle
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
  id                    TEXT        PRIMARY KEY,
  facility_id           TEXT        NOT NULL REFERENCES facilities(id),
  zone_id               TEXT        NOT NULL REFERENCES zones(id),
  workstation_id        TEXT        NOT NULL REFERENCES workstations(id),
  title                 TEXT        NOT NULL,
  description           TEXT,
  job_type              TEXT        NOT NULL DEFAULT 'general'
                        CHECK (job_type IN ('board_diagnostics', 'functional_test', 'calibration', 'assembly', 'quality_review', 'firmware_flash', 'rework', 'general')),
  priority              TEXT        NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status                TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'paused', 'completed', 'voided')),
  -- Human-readable reference (e.g. work order number, serial number)
  human_ref             TEXT,
  -- External references
  customer_ref          TEXT,
  product_ref           TEXT,
  -- Current owner (resolves to actors table for any actor type)
  current_owner_actor_id TEXT       REFERENCES actors(id),
  opened_at             TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  metadata              JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS jobs_facility_idx      ON jobs (facility_id);
CREATE INDEX IF NOT EXISTS jobs_workstation_idx   ON jobs (workstation_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx        ON jobs (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS jobs_owner_idx         ON jobs (current_owner_actor_id) WHERE current_owner_actor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tasks (
  id                  TEXT        PRIMARY KEY,
  job_id              TEXT        NOT NULL REFERENCES jobs(id),
  title               TEXT        NOT NULL,
  description         TEXT,
  task_type           TEXT        NOT NULL DEFAULT 'procedure_step'
                      CHECK (task_type IN ('procedure_step', 'inspection', 'calibration_check', 'data_entry', 'evidence_capture', 'ai_review', 'approval')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked')),
  ordinal             INTEGER     NOT NULL DEFAULT 0,
  -- Assigned actor (any actor type)
  assigned_actor_id   TEXT        REFERENCES actors(id),
  due_at              TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tasks_job_idx    ON tasks (job_id, ordinal ASC);
CREATE INDEX IF NOT EXISTS tasks_actor_idx  ON tasks (assigned_actor_id) WHERE assigned_actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status) WHERE deleted_at IS NULL;

-- ============================================================
-- SECTION 8: Issues
-- ============================================================

CREATE TABLE IF NOT EXISTS issues (
  id                   TEXT        PRIMARY KEY,
  facility_id          TEXT        NOT NULL REFERENCES facilities(id),
  workstation_id       TEXT        REFERENCES workstations(id),
  job_id               TEXT        REFERENCES jobs(id),
  task_id              TEXT        REFERENCES tasks(id),
  title                TEXT        NOT NULL,
  description          TEXT        NOT NULL,
  issue_type           TEXT        NOT NULL DEFAULT 'general'
                       CHECK (issue_type IN ('equipment_fault', 'calibration_failure', 'process_deviation', 'quality_hold', 'safety_concern', 'data_anomaly', 'general')),
  severity             TEXT        NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status               TEXT        NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'investigating', 'escalated', 'resolved', 'closed')),
  resolution           TEXT,
  opened_by_actor_id   TEXT        NOT NULL REFERENCES actors(id),
  escalated_to_actor_id TEXT       REFERENCES actors(id),
  resolved_at          TIMESTAMPTZ,
  metadata             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS issues_facility_idx   ON issues (facility_id);
CREATE INDEX IF NOT EXISTS issues_job_idx        ON issues (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS issues_status_idx     ON issues (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS issues_severity_idx   ON issues (severity, status);

-- ============================================================
-- SECTION 9: Notes (append-only revision chain)
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id                  TEXT        PRIMARY KEY,
  -- Revision chain: all revisions of a logical note share this ID
  revision_chain_id   TEXT        NOT NULL,
  -- Points to the note this supersedes (NULL for first version)
  supersedes_note_id  TEXT        REFERENCES notes(id),
  -- Context refs
  job_id              TEXT        REFERENCES jobs(id),
  task_id             TEXT        REFERENCES tasks(id),
  issue_id            TEXT        REFERENCES issues(id),
  workstation_id      TEXT        REFERENCES workstations(id),
  -- Content
  body                TEXT        NOT NULL,
  note_type           TEXT        NOT NULL DEFAULT 'observation'
                      CHECK (note_type IN ('observation', 'operator_log', 'quality_note', 'test_note', 'shift_handoff', 'ai_draft', 'resolution_note')),
  -- Authoring (actor ref — any type)
  author_actor_id     TEXT        NOT NULL REFERENCES actors(id),
  author_type         TEXT        NOT NULL
                      CHECK (author_type IN ('human_user', 'ai_agent', 'automation_service')),
  -- AI content governance
  review_state        TEXT        NOT NULL DEFAULT 'not_required'
                      CHECK (review_state IN ('not_required', 'pending_review', 'accepted', 'rejected', 'edited')),
  reviewed_by         TEXT        REFERENCES actors(id),
  reviewed_at         TIMESTAMPTZ,
  -- Visibility
  visibility_scope    TEXT        NOT NULL DEFAULT 'job'
                      CHECK (visibility_scope IN ('workstation', 'zone', 'job', 'facility', 'private')),
  artifact_refs       TEXT[]      NOT NULL DEFAULT '{}',
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at — notes are immutable; supersede via new record
);

CREATE INDEX IF NOT EXISTS notes_chain_idx        ON notes (revision_chain_id, created_at ASC);
CREATE INDEX IF NOT EXISTS notes_job_idx          ON notes (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_issue_idx        ON notes (issue_id) WHERE issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_workstation_idx  ON notes (workstation_id) WHERE workstation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_author_idx       ON notes (author_actor_id);
CREATE INDEX IF NOT EXISTS notes_review_idx       ON notes (review_state) WHERE review_state IN ('pending_review');

-- View: current (latest) note per revision chain
CREATE OR REPLACE VIEW notes_current AS
  SELECT DISTINCT ON (revision_chain_id) *
  FROM notes
  ORDER BY revision_chain_id, created_at DESC;

-- ============================================================
-- SECTION 10: Conversations and messages
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id               TEXT        PRIMARY KEY,
  conversation_type TEXT       NOT NULL
                   CHECK (conversation_type IN ('direct', 'workspace', 'job', 'issue', 'system', 'ai_assist')),
  -- Context refs (nullable depending on type)
  facility_id      TEXT        REFERENCES facilities(id),
  zone_id          TEXT        REFERENCES zones(id),
  workstation_id   TEXT        REFERENCES workstations(id),
  job_id           TEXT        REFERENCES jobs(id),
  issue_id         TEXT        REFERENCES issues(id),
  -- Room identity
  xmpp_room_jid    TEXT        UNIQUE,  -- NULL for direct/AI-assist convos
  title            TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'archived', 'closed')),
  metadata         JSONB       NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS convos_job_idx          ON conversations (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS convos_issue_idx        ON conversations (issue_id) WHERE issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS convos_facility_idx     ON conversations (facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS convos_workstation_idx  ON conversations (workstation_id) WHERE workstation_id IS NOT NULL;

-- Conversation participants (many-to-many)
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id  TEXT        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  actor_id         TEXT        NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at          TIMESTAMPTZ,
  role_in_convo    TEXT        DEFAULT 'participant'
                   CHECK (role_in_convo IN ('owner', 'participant', 'observer', 'ai_assistant')),
  PRIMARY KEY (conversation_id, actor_id)
);

CREATE INDEX IF NOT EXISTS convo_participants_actor_idx ON conversation_participants (actor_id);

-- Messages (immutable — edits produce new records)
CREATE TABLE IF NOT EXISTS messages (
  id                      TEXT        PRIMARY KEY,
  conversation_id         TEXT        NOT NULL REFERENCES conversations(id),
  sender_actor_id         TEXT        NOT NULL REFERENCES actors(id),
  sender_type             TEXT        NOT NULL
                          CHECK (sender_type IN ('human_user', 'ai_agent', 'automation_service')),
  body                    TEXT        NOT NULL,
  message_class           TEXT        NOT NULL DEFAULT 'chat'
                          CHECK (message_class IN ('chat', 'question', 'alert', 'handoff', 'recommendation', 'resolution', 'status_update', 'system_notice')),
  -- AI governance
  review_state            TEXT        NOT NULL DEFAULT 'not_required'
                          CHECK (review_state IN ('not_required', 'pending_review', 'accepted', 'rejected', 'edited')),
  -- Threading / edit chain
  reply_to_message_id     TEXT        REFERENCES messages(id),
  superseded_by_message_id TEXT       REFERENCES messages(id),
  -- Context refs (denormalised for query efficiency)
  job_id                  TEXT        REFERENCES jobs(id),
  issue_id                TEXT        REFERENCES issues(id),
  -- XMPP delivery metadata
  xmpp_stanza_id          TEXT        UNIQUE,
  artifact_refs           TEXT[]      NOT NULL DEFAULT '{}',
  metadata                JSONB       NOT NULL DEFAULT '{}',
  sent_at                 TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at — messages are immutable; supersede via new record
);

CREATE INDEX IF NOT EXISTS messages_convo_idx      ON messages (conversation_id, sent_at ASC);
CREATE INDEX IF NOT EXISTS messages_sender_idx     ON messages (sender_actor_id);
CREATE INDEX IF NOT EXISTS messages_job_idx        ON messages (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_issue_idx      ON messages (issue_id) WHERE issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_superseded_idx ON messages (superseded_by_message_id) WHERE superseded_by_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_review_idx     ON messages (review_state) WHERE review_state IN ('pending_review');

-- ============================================================
-- SECTION 11: Artifacts
-- ============================================================

CREATE TABLE IF NOT EXISTS artifacts (
  id                 TEXT        PRIMARY KEY,
  -- Context refs
  job_id             TEXT        REFERENCES jobs(id),
  task_id            TEXT        REFERENCES tasks(id),
  issue_id           TEXT        REFERENCES issues(id),
  note_id            TEXT        REFERENCES notes(id),
  -- Source event that created this artifact
  source_event_id    TEXT        REFERENCES events(id),
  -- Classification
  artifact_type      TEXT        NOT NULL DEFAULT 'file'
                     CHECK (artifact_type IN ('image', 'file', 'test_output', 'calibration_output', 'firmware_build', 'log_export', 'report')),
  -- Storage
  storage_uri        TEXT        NOT NULL UNIQUE,
  original_filename  TEXT        NOT NULL,
  mime_type          TEXT        NOT NULL,
  size_bytes         BIGINT      NOT NULL,
  -- Integrity
  checksum           TEXT        NOT NULL,
  checksum_algorithm TEXT        NOT NULL DEFAULT 'sha256'
                     CHECK (checksum_algorithm IN ('sha256', 'sha512', 'md5')),
  -- Attribution
  created_by_actor_id TEXT       NOT NULL REFERENCES actors(id),
  -- Retention
  retention_class    TEXT        NOT NULL DEFAULT 'operational'
                     CHECK (retention_class IN ('operational', 'evidence', 'transient', 'compliance')),
  metadata           JSONB       NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifacts_job_idx      ON artifacts (job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS artifacts_issue_idx    ON artifacts (issue_id) WHERE issue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS artifacts_note_idx     ON artifacts (note_id) WHERE note_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS artifacts_type_idx     ON artifacts (artifact_type);
CREATE INDEX IF NOT EXISTS artifacts_retention_idx ON artifacts (retention_class);

-- ============================================================
-- SECTION 12: Tools and integrations
-- ============================================================

CREATE TABLE IF NOT EXISTS tools (
  id                TEXT        PRIMARY KEY,
  workstation_id    TEXT        REFERENCES workstations(id),
  facility_id       TEXT        NOT NULL REFERENCES facilities(id),
  name              TEXT        NOT NULL,
  tool_type         TEXT        NOT NULL DEFAULT 'general'
                    CHECK (tool_type IN ('multimeter', 'oscilloscope', 'spectrum_analyser', 'ict', 'flying_probe', 'aoi', 'xray', 'solder_station', 'torque_driver', 'programming_fixture', 'custom', 'general')),
  vendor            TEXT,
  model             TEXT,
  serial_number     TEXT,
  integration_mode  TEXT        NOT NULL DEFAULT 'manual_attach'
                    CHECK (integration_mode IN ('manual_attach', 'file_import', 'watched_folder', 'api_adapter', 'serial_adapter', 'network_adapter')),
  adapter_status    TEXT        NOT NULL DEFAULT 'offline'
                    CHECK (adapter_status IN ('connected', 'idle', 'importing', 'error', 'offline')),
  adapter_config    JSONB       NOT NULL DEFAULT '{}',
  last_import_at    TIMESTAMPTZ,
  last_error_message TEXT,
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tools_workstation_idx ON tools (workstation_id) WHERE workstation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tools_facility_idx    ON tools (facility_id);

-- ============================================================
-- SECTION 13: Machine sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS machine_sessions (
  id                  TEXT        PRIMARY KEY,
  workstation_id      TEXT        NOT NULL REFERENCES workstations(id),
  job_id              TEXT        NOT NULL REFERENCES jobs(id),
  operator_actor_id   TEXT        NOT NULL REFERENCES actors(id),
  session_label       TEXT,
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_workstation_idx ON machine_sessions (workstation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sessions_job_idx         ON machine_sessions (job_id);
CREATE INDEX IF NOT EXISTS sessions_operator_idx    ON machine_sessions (operator_actor_id);

-- ============================================================
-- SECTION 14: Shifts
-- ============================================================

CREATE TABLE IF NOT EXISTS shifts (
  id                  TEXT        PRIMARY KEY,
  facility_id         TEXT        NOT NULL REFERENCES facilities(id),
  workstation_id      TEXT        NOT NULL REFERENCES workstations(id),
  operator_actor_id   TEXT        NOT NULL REFERENCES actors(id),
  -- Handoff chain
  handoff_to_actor_id TEXT        REFERENCES actors(id),
  handoff_note_id     TEXT        REFERENCES notes(id),
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,
  metadata            JSONB       NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shifts_workstation_idx ON shifts (workstation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS shifts_operator_idx    ON shifts (operator_actor_id);

-- ============================================================
-- SECTION 15: Presence states
-- ============================================================

CREATE TABLE IF NOT EXISTS presence_states (
  -- Compound PK: one state record per (actor, workstation) pair
  actor_id         TEXT        NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  workstation_id   TEXT        NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  state            TEXT        NOT NULL DEFAULT 'unavailable'
                   CHECK (state IN ('available', 'heads_down', 'on_station', 'in_review', 'awaiting_response', 'unavailable', 'automation_active')),
  status_message   TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, workstation_id)
);

CREATE INDEX IF NOT EXISTS presence_workstation_idx ON presence_states (workstation_id);
CREATE INDEX IF NOT EXISTS presence_state_idx       ON presence_states (state);

-- ============================================================
-- SECTION 16: Seed data
-- ============================================================

-- Seed: system actor (used for system-generated events)
INSERT INTO actors (id, actor_type, is_active)
VALUES ('actor_system', 'automation_service', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO automation_services (id, name, service_type, facility_scope)
VALUES ('actor_system', 'system', 'sync_worker', '{}')
ON CONFLICT DO NOTHING;

-- Seed: default admin actor + person (password: 'admin_dev_password' — change in production)
INSERT INTO actors (id, actor_type, xmpp_jid, is_active)
VALUES ('actor_admin_01', 'human_user', 'person.admin@system.clark', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO persons (id, username, email, display_name, password_hash, employment_type, status)
VALUES (
  'actor_admin_01',
  'admin',
  'admin@clark.local',
  'Administrator',
  -- argon2id hash of 'admin_dev_password' — REPLACE before production
  '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
  'employee',
  'active'
) ON CONFLICT DO NOTHING;

-- Seed: default facility
INSERT INTO facilities (id, name, code, timezone, jurisdiction, status, xmpp_domain)
VALUES ('facility_dev_01', 'Development Facility', 'DEVFAC', 'UTC', 'ON-CA', 'active', 'devfac.clark')
ON CONFLICT DO NOTHING;

-- Seed: facility-level owner grant for admin
INSERT INTO permission_grants (
  id, actor_id, actor_type, role,
  scope_level, scope_facility_id,
  permissions, granted_by, granted_for_reason
)
VALUES (
  'grant_admin_facility_01',
  'actor_admin_01', 'human_user', 'owner',
  'facility', 'facility_dev_01',
  ARRAY['view','comment','create_note','attach_artifact','initiate_conversation',
        'participate_remotely','review_ai_output','approve_disposition',
        'administer_integrations','export_records','manage_retention_and_backup'],
  'actor_system',
  'Bootstrap seed grant'
) ON CONFLICT DO NOTHING;
