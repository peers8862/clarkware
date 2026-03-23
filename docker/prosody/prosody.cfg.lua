-- Prosody configuration for Clarkware development environment
-- https://prosody.im/doc/configure

-- Basic settings
daemonize = false
pidfile = "/var/run/prosody/prosody.pid"
log = { info = "*console" }

-- Admin
admins = { "admin@clark.local" }

-- Storage (file-based for dev)
storage = "internal"

-- Modules
modules_enabled = {
  -- Generally required
  "roster",
  "saslauth",
  "tls",
  "dialback",
  "disco",

  -- Nice to have
  "carbons",
  "pep",
  "private",
  "blocklist",

  -- HTTP modules
  "bosh",
  "websocket",
  "http_files",

  -- Other
  "version",
  "uptime",
  "time",
  "ping",
  "register",
  "posix",

  -- Archiving
  "mam",

  -- Stream management (XEP-0198)
  "smacks",
}

-- Allow plain auth over unencrypted connections in dev
allow_unencrypted_plain_auth = true
c2s_require_encryption = false
s2s_require_encryption = false

-- Virtual host for clark.local
VirtualHost "clark.local"
  authentication = "internal_plain"
  ssl = {
    key = "/etc/prosody/certs/clark.local.key",
    certificate = "/etc/prosody/certs/clark.local.crt",
  }

-- MUC component — job conversation rooms
Component "conference.clark.local" "muc"
  modules_enabled = { "muc_mam" }
  muc_room_locking = false
  muc_room_default_public = true
  muc_room_default_persistent = true
  muc_log_all_rooms = true

-- External component — API server connects via XEP-0114
Component "clark-api.clark.local"
  component_secret = "clark_component_secret_dev"
