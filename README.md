# Clarkware — P1 V1

**Clark Industrial Process Environment** (IPE) is a manufacturing facility operations platform. It gives technicians, supervisors, and integrated tools a unified interface for tracking jobs, managing notes and communications, flagging issues, and running AI-assisted workflows — all in real time across a connected facility floor.

---

## Architecture

Clarkware is structured as a **pnpm + Turborepo monorepo** with two applications and eight shared packages.

```
clark/
├── apps/
│   ├── api/          — REST + WebSocket backend (Fastify)
│   └── ipe/          — Browser-based operator shell (Eclipse Theia)
└── packages/
    ├── core/         — Domain model: types, enums, events, identity
    ├── db/           — PostgreSQL connection pool and query helpers
    ├── identity/     — Auth: JWT signing/verification, password hashing, RBAC
    ├── events/       — Append-only domain event store
    ├── ai/           — Anthropic Claude integration: summarisation, note drafting, alert routing
    ├── storage/      — MinIO object storage client and presigned URL helpers
    ├── messaging/    — XMPP client, room manager, sync engine
    └── reporting/    — Job summary queries (foundation for reporting views)
```

### Data flow

```
Browser (IPE shell)
    │  HTTP/REST     WebSocket
    ▼                   ▼
apps/api  ─────────────────────────
    │        │         │          │
  @clark/  @clark/  @clark/   @clark/
    db     identity  events    storage
    │
PostgreSQL (Docker)    MinIO (Docker)
```

External services (all containerised):

| Service | Purpose | Port |
|---------|---------|------|
| PostgreSQL 16 | Primary database | 5432 |
| MinIO | Object / artifact storage | 9000 (API), 9001 (console) |
| Prosody | XMPP messaging server | 5222 |
| OpenSearch | Full-text search and log indexing | 9200 |
| OpenSearch Dashboards | Search analytics UI | 5601 |

---

## Primary Technologies

### Runtime and Tooling

| Tool | Version | Role |
|------|---------|------|
| Node.js | 18.x | JavaScript runtime |
| pnpm | 10.x | Package manager with workspace support |
| Turborepo | 2.x | Monorepo build orchestration and caching |
| TypeScript | ~5.4 | Primary language across all packages |
| tsx | ^4 | TypeScript execution for the API dev server (no compile step needed) |
| webpack | 5 | Frontend bundle compilation for the IPE shell |

### Backend — `apps/api`

| Package | Role |
|---------|------|
| **Fastify 5** | HTTP server, plugin system, request/response schema validation |
| `@fastify/cors` | Cross-origin request handling |
| `@fastify/helmet` | HTTP security headers |
| `@fastify/websocket` | WebSocket upgrade and connection management |
| `@fastify/env` | Environment variable validation on startup |
| `@fastify/jwt` | JWT utility (token logic lives in `@clark/identity`) |
| `fastify-plugin` | Plugin encapsulation utility |
| `uuid` | ID generation (v4 random, v7 time-ordered) |

### Packages

| Package | Key dependencies | Role |
|---------|-----------------|------|
| `@clark/core` | — | Pure TypeScript domain model. All branded ID types, enums, object shapes, event envelope types, and RBAC definitions. Zero runtime dependencies. |
| `@clark/db` | `pg` | PostgreSQL pool singleton and typed `query` / `queryOne` helpers. |
| `@clark/identity` | `jose`, `argon2` | Password hashing (Argon2id), JWT access and refresh token sign and verify, RBAC `can()` permission checker. |
| `@clark/events` | `@clark/core`, `@clark/db` | Append-only event store with optimistic concurrency (sequence number check). Immutability enforced by a DB trigger. |
| `@clark/ai` | `@anthropic-ai/sdk` | Claude Sonnet integration — job and issue summarisation, note drafting, alert routing, AI review state management. Lazy-initialised client (API key loaded at first call). |
| `@clark/storage` | `minio` | MinIO client wrapper — object upload, presigned PUT/GET URL generation, SHA-256 checksum verification, bucket bootstrapping. |
| `@clark/messaging` | `@xmpp/client`, `@xmpp/debug` | XMPP client, MUC room manager, stanza builders, and an event-driven sync engine for offline-first messaging. |
| `@clark/sync` | `@clark/core`, `@clark/db`, `@clark/events` | Conflict handler and sync queue for offline-first event reconciliation. |
| `@clark/reporting` | `@clark/core`, `@clark/db` | Job summary read-model queries (foundation for reporting dashboards). |

### Frontend — `apps/ipe`

| Package | Role |
|---------|------|
| **Eclipse Theia 1.69** | IDE-style browser shell — multi-panel layout, widget system, contribution points |
| `@theia/core` | Shell, widget manager, dependency injection (InversifyJS), messaging |
| `@theia/messages` | Status bar and notification integration |
| **React 18** | Widget rendering inside Theia's `ReactWidget` base class |
| `reflect-metadata` | Required by InversifyJS decorators |

**IPE extensions** (local Theia extensions in `apps/ipe/src/extensions/`):

| Extension | Widgets | Description |
|-----------|---------|-------------|
| `clark-core-extension` | Clark IPE (main panel), Job Context, Notes | Job list, create/manage jobs, job details, inline edit, notes |
| `clark-messaging-extension` | Messages | Real-time WebSocket event stream per job |

---

## API Endpoints

All routes below `/v1/*` (except auth) require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/login` | Username + password → access token + refresh token |
| POST | `/v1/auth/refresh` | Refresh token → new access token |
| POST | `/v1/auth/logout` | Invalidate session |

### Jobs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/jobs` | List all jobs |
| GET | `/v1/jobs/:id` | Get job detail |
| POST | `/v1/jobs` | Create job (starts in `draft` status) |
| POST | `/v1/jobs/:id/start` | `draft` → `active`; writes `job.started` event |
| POST | `/v1/jobs/:id/resume` | `paused` → `active`; writes `job.resumed` event |
| POST | `/v1/jobs/:id/reopen` | `completed\|voided` → `draft`; writes `job.reopened` event |
| PATCH | `/v1/jobs/:id` | Update status (`paused`/`completed`/`voided`) and/or `title`, `description`, `priority` |

### Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/notes?jobId=X` | List notes for a job |
| POST | `/v1/notes` | Create note |
| POST | `/v1/notes/:id/revise` | Append a revision to a note chain |

### Facilities and Workstations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/facilities` | List facilities |
| GET | `/v1/facilities/:id` | Get facility detail |
| POST | `/v1/facilities` | Create facility |
| GET | `/v1/workstations` | List all active workstations |

### AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/ai/summarize-job` | Generate AI summary of a job |
| POST | `/v1/ai/summarize-issue` | Generate AI summary of an issue |
| POST | `/v1/ai/draft-note` | AI-draft a note for a given context |
| POST | `/v1/ai/route-alert` | Route an alert to the correct actor or channel |
| POST | `/v1/ai/review` | Update AI review state on a note or message |

### Artifacts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/artifacts/upload-url` | Get a presigned MinIO PUT URL (15-minute window) |
| GET | `/v1/artifacts/*` | Get a presigned MinIO GET URL for a stored object |

### Other registered routes (scaffolded, minimal implementation)
`/v1/events`, `/v1/issues`, `/v1/conversations`, `/v1/presence`, `/v1/shifts`, `/v1/permissions`

### Real-time
| Protocol | Path | Description |
|----------|------|-------------|
| WebSocket | `/ws?stream=job:<id>` | Subscribe to domain events for a job stream. Receives JSON-serialised `DomainEvent` objects as they are written by any route handler. |

---

## Database Schema

PostgreSQL 16 with an append-only event store. Key tables:

| Table | Description |
|-------|-------------|
| `actors` | Unified identity — all humans, AI agents, and automation services share one row |
| `persons` | Human user profile, Argon2id password hash, facility assignment |
| `agents` | AI agent actor specialisation |
| `facilities`, `zones`, `workstations` | Physical location hierarchy |
| `jobs` | Primary work unit — belongs to facility / zone / workstation |
| `tasks` | Sub-steps within a job |
| `issues` | Problems flagged against a job or workstation |
| `notes` | Append-only notes with revision chains (`revision_chain_id` + `supersedes_note_id`) |
| `conversations`, `messages` | XMPP-backed threaded conversations |
| `events` | Append-only domain event store — immutability enforced by a DB trigger |
| `artifacts` | Metadata for files stored in MinIO (presigned URL pattern) |
| `shifts` | Technician clock-in/out records |
| `presence_states` | Live actor presence (at-workstation, idle, offline, etc.) |
| `machine_sessions` | Tool/instrument connection sessions |
| `permission_grants` | Explicit RBAC grants with scope hierarchy (`facility > zone > workstation > job`) and expiry |
| `refresh_tokens` | Active JWT refresh token records |

---

## Existing Functionality

### Fully working
- **Authentication** — login, token refresh, logout; sessions persist in `localStorage`
- **Job list** — load all jobs, display with type / priority / status badge
- **Job creation** — inline form: title, work order #, type, priority, workstation, description
- **Job lifecycle** — Start → Pause → Resume → Complete / Void → Reopen, all with domain events appended to the event store and broadcast over WebSocket
- **Job editing** — inline edit of title, description, priority for non-terminal jobs
- **Job context panel** — live detail view, refreshes after every action
- **Notes** — view and post notes per job; append-only with author ID and timestamp
- **Real-time events** — WebSocket stream per job; Messages panel shows all `DomainEvent` payloads as they arrive
- **AI routes** — all five `/v1/ai/*` endpoints registered and reachable (require `ANTHROPIC_API_KEY` in `.env`)
- **Artifact routes** — presigned upload and download URL generation via MinIO
- **RBAC enforcement** — `can()` checks on all protected routes

### Scaffolded but no UI yet
- **Issues** — route registered, DB table exists
- **Conversations** — route registered, DB table exists
- **Shifts** — route registered, DB table exists (clock-in/out)
- **Presence** — route registered, DB table exists
- **Permissions** — route registered (explicit grant management)

### Packages implemented but not yet wired to the UI
- `@clark/messaging` — XMPP client and room manager are complete; the Messages panel currently shows WebSocket `DomainEvent` payloads rather than true XMPP chat
- `@clark/sync` — Conflict handler and sync queue are implemented; offline-first mode not yet activated
- `@clark/reporting` — Job summary read-model queries exist; no reporting dashboard

---

## Known Patches and Workarounds

### 1. `src-gen/frontend/index.js` — manually patched `start()` function

**What:** Eclipse Theia generates this file when you run `theia build`. The standard `FrontendApplicationContribution.initializeLayout()` hook did not fire reliably, so the generated `start()` function has been extended by hand to explicitly open and position the four Clark panels (main, job context, notes, messages) after `FrontendApplication.start()` resolves.

**Risk:** Running `theia build` again will regenerate this file and wipe the patch. After any Theia rebuild you must re-patch the `start()` function manually before running webpack.

**Location:** `apps/ipe/src-gen/frontend/index.js`, the `start()` function at the bottom of the file.

### 2. Auto-login is hardcoded

**What:** On load the IPE shell automatically logs in as `admin` / `admin_dev_password`. There is no login screen yet.

**Location:** `apps/ipe/src/extensions/clark-core-extension/src/clark-widget.tsx`, `doLogin()` method.

### 3. Compiled frontend bundle committed to git

**What:** `apps/ipe/lib/frontend/bundle.js` (and `.gz` / `.map` variants) are checked into the repository. This allows the IPE to be launched without a full webpack build from scratch, but it means the bundle must be manually rebuilt and re-committed after any source change to the Theia extensions.

### 4. API runs via `tsx` in development (no compile step)

**What:** The API dev server runs TypeScript directly with `tsx watch` rather than compiling to `dist/` first. `pnpm --filter @clark/api start` (the compiled path) is not regularly tested and `dist/` may be stale.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| **Node.js** | 18.x LTS | Use `nvm install 18` or https://nodejs.org |
| **pnpm** | 10.x | `npm install -g pnpm@10` |
| **Docker** | 20.x | https://docs.docker.com/get-docker/ |
| **Docker Compose** | v2 | Bundled with Docker Desktop; on Linux: `apt install docker-compose-plugin` |

No global `tsx`, `webpack`, or `typescript` installation is required — all tooling is resolved from workspace `node_modules`.

> **Linux note:** If you see Docker API version errors, prefix compose commands with `DOCKER_API_VERSION=1.41`.

---

## Build and Launch

### First-time setup

**1. Install all dependencies**
```bash
pnpm install
```

**2. Start infrastructure**
```bash
DOCKER_API_VERSION=1.41 docker compose -f docker/compose.yml up -d
```
Wait a few seconds for Postgres to pass its healthcheck before continuing.

**3. Build all shared packages**
```bash
pnpm build
```

**4. Compile the IPE Theia extensions**
```bash
cd apps/ipe/src/extensions/clark-core-extension && npx tsc && cd -
cd apps/ipe/src/extensions/clark-messaging-extension && npx tsc && cd -
```

**5. Bundle the IPE frontend**
```bash
cd apps/ipe && ./node_modules/.bin/webpack --config webpack.config.js && cd -
```
This takes 2–3 minutes. Output lands in `apps/ipe/lib/frontend/bundle.js`.

**6. (Optional) Set your Anthropic API key for AI routes**
```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> apps/api/.env
```

---

### Launching (every session)

**Terminal 1 — API**
```bash
export PATH="$HOME/.local/bin:$PATH"
pnpm --filter @clark/api dev
```
Runs on `http://localhost:3000`. Auto-reloads on source changes.

**Terminal 2 — IPE**
```bash
cd apps/ipe && node lib/backend/main.js --port 3001
```
Open `http://localhost:3001` in any modern browser.

> Only re-run steps 4–5 if you changed files under `apps/ipe/src/extensions/`.

---

### Resetting the database

```bash
DOCKER_API_VERSION=1.41 docker compose -f docker/compose.yml down -v
DOCKER_API_VERSION=1.41 docker compose -f docker/compose.yml up -d
```
The `-v` flag removes named volumes, triggering a fresh `init.sql` run on next start.

---

## Dev Seed Data

| Resource | ID | Credentials / Value |
|----------|----|---------------------|
| Admin actor | `actor_admin_01` | username: `admin`, password: `admin_dev_password` |
| Facility | `facility_dev_01` | Development Facility |
| Zone | `zone_dev_01` | Dev Zone |
| Workstation | `ws_dev_01` | Dev Workstation |
| Job | `job_dev_01` | Hydraulic Pump Rebuild (active) |
| Job | `job_dev_02` | PCB Calibration (draft) |

---

## Port Reference

| Port | Service |
|------|---------|
| 3000 | Clark API (REST + WebSocket) |
| 3001 | Clark IPE browser shell |
| 5432 | PostgreSQL |
| 9000 | MinIO S3 API |
| 9001 | MinIO web console |
| 5222 | XMPP — Prosody client connections |
| 5280 | XMPP HTTP — Prosody HTTP API |
| 9200 | OpenSearch |
| 5601 | OpenSearch Dashboards |
