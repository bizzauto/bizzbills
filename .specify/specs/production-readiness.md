# Feature Specification: BizzBills Production Readiness Hardening

**Feature Branch**: `001-production-readiness`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "check out my app use spec-kit all command and make my app perfect and production ready"

## Context

BizzBills is a Next.js 16 + Prisma billing/invoicing/GST/finance SaaS (114 API routes,
multi-tenant). Type-check (`tsc --noEmit`) is clean and the engine test suite passes (29/29).
The app is functionally rich but needs verified production readiness: closed security gaps,
hardened deployment/config, input validation, and end-to-end verification. This spec drives
that work. All changes obey `.specify/memory/constitution.md`.

## Audit Findings (evidence)

- `tsc --noEmit`: PASS (0 errors)
- `vitest run`: PASS (29/29 — invoicing, diff, anomaly, gst engines)
- Auth coverage: 103/114 routes call session/admin guards; remaining 11 are intentional
  (auth/register, password reset, nextauth, health, cron [CRON_SECRET], portal [HMAC token],
  admin users/audit [requireSuperAdmin]).
- **GAP-1 (Security)**: `src/app/api/portal/route.ts` returns raw error messages to clients
  (`Failed to load portal data: ${message}`) — info leak; must return generic message.
- **GAP-2 (Security/Validation)**: `src/app/api/admin/users/route.ts` POST accepts `email`,
  `password`, `orgId` with only presence checks — no email format validation, no password
  strength/min-length, no `orgId` existence check, role not enum-validated.
- **GAP-3 (Config)**: `.env` defines `CRON_SECRET` and `NEXTAUTH_*` but NOT `PORTAL_SECRET`;
  portal route warns and rejects all tokens when unset. `.env.example` likely missing it too.
- **GAP-4 (Deploy/Operability)**: Verify Dockerfile runs `prisma generate` + `prisma migrate
  deploy` (or `db push`) at build/start so the app self-heals without manual exec.
- **GAP-5 (Health)**: `/api/health` should return 200 only when DB is reachable, with a JSON
  body (status, db, timestamp) rather than a bare string — required by Coolify health check.
- **GAP-6 (Tests/Business logic)**: No tests for money rounding/currency conversion or the
  cron recurring-invoice generation; high-risk financial paths are unverified.
- **GAP-7 (Secrets hygiene)**: `.claude/` may hold credentials; ensure `.gitignore` covers
  `.env` and `.claude/` secrets. `next.config` output mode must be `standalone` for Docker.

## User Scenarios & Testing

### User Story 1 - Hardened public & admin boundaries (Priority: P1)

As the platform owner, I must guarantee that no route leaks data or errors to unauthorized
callers, so customer financial data stays private in production.

**Why this priority**: A finance app leaking data or stack traces is an instant production
blocker and legal/compliance risk.

**Independent Test**: Call `/api/portal?token=bad` and assert it returns 401 with a generic
body (no internal message). POST to `/api/admin/users` with an invalid email / short password
/ unknown orgId and assert 400/409 with no created user and no stack trace.

**Acceptance Scenarios**:

1. **Given** an invalid portal token, **When** GET `/api/portal`, **Then** 401 with body
   `{error:"Invalid or expired portal token"}` (no raw message appended).
2. **Given** a super-admin session, **When** POST `/api/admin/users` with malformed email,
   **Then** 400 and no user row created.
3. **Given** a super-admin session, **When** POST `/api/admin/users` with `orgId` of a
   non-existent org, **Then** 400 "Organization not found".
4. **Given** any caller, **When** a 500 occurs on a public route, **Then** response body
   contains no stack trace / no DB string.

---

### User Story 2 - Verified, self-healing deployment (Priority: P1)

As the operator, I must be able to deploy via Docker/Coolify and have the DB schema applied
automatically and the health check report real DB status, so the service is operable without
manual shell access.

**Why this priority**: Manual `prisma db push` in a container is fragile; health check must
reflect reality for orchestrator restarts.

**Independent Test**: `npm run build` succeeds with `output:"standalone"`; Dockerfile runs
prisma generate + migrate deploy; `GET /api/health` returns JSON `{status:"ok",db:"up"}` with
200 when DB is reachable and 503 when it is not.

**Acceptance Scenarios**:

1. **Given** a fresh DB, **When** the container starts, **Then** migrations are applied
   automatically (no manual exec needed).
2. **Given** the DB is up, **When** GET `/api/health`, **Then** 200 + JSON `{status:"ok",db:"up",timestamp}`.
3. **Given** the DB is down, **When** GET `/api/health`, **Then** 503 + JSON `{status:"error",db:"down"}`.

---

### User Story 3 - Financial correctness verified by tests (Priority: P2)

As the owner, I must trust that money math and recurring-invoice generation are correct, so
invoices never miscompute totals or duplicate numbers.

**Why this priority**: Silent financial errors erode customer trust and create legal exposure.

**Independent Test**: `npx vitest run` includes currency-rounding and cron recurring-invoice
tests; all green.

**Acceptance Scenarios**:

1. **Given** a multi-line invoice with tax, **When** totals are computed, **Then** subtotal/
   tax/total match expected integer-minor-unit values (no float drift).
2. **Given** a due recurring invoice, **When** cron runs, **Then** exactly one invoice is
   created with a unique invoice number and the next run date advances.

---

### Edge Cases

- What happens when `PORTAL_SECRET` is unset in prod? → All portal tokens rejected (warn logged);
  must be documented and set in `.env.example`.
- What happens when `CRON_SECRET` is unset? → cron returns 401 (already correct).
- What happens when two cron runs race on the same recurring invoice? → Transaction + collision
  check already handle it; covered by test.

## Requirements

### Functional Requirements

- **FR-001**: System MUST return generic error messages on public routes (no raw exception text
  or stack traces to clients).
- **FR-002**: System MUST validate `email` format, `password` min length (>=8), and `role`
  enum on admin user creation; reject with 400 otherwise.
- **FR-003**: System MUST verify `orgId` exists before creating a tenant user; return 400
  "Organization not found" if missing.
- **FR-004**: System MUST run DB migrations automatically on container start (no manual exec).
- **FR-005**: `/api/health` MUST return structured JSON and a non-2xx status when DB is down.
- **FR-006**: `.env.example` and deployed `.env` MUST declare `PORTAL_SECRET`, `CRON_SECRET`,
  `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`.
- **FR-007**: `next.config` MUST set `output:"standalone"` for Docker deployment.
- **FR-008**: Vitest suite MUST cover currency rounding and recurring-invoice cron generation.
- **FR-009**: `.gitignore` MUST ignore `.env` and any secret-holding `.claude/` artifacts.

### Key Entities

- **Organization (tenant)**: owns invoices, users, bank accounts; scoping boundary.
- **Invoice**: financial document; totals must be exact; versioned.
- **RecurringInvoice**: generates Invoices on a schedule via cron.

## Success Criteria

- **SC-001**: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build` all green.
- **SC-002**: All 114 routes either guard auth or are intentionally public with independent
  verification of their protection.
- **SC-003**: No raw error text leaks from any public/portal route (verified by request).
- **SC-004**: `GET /api/health` returns correct status for up/down DB.
- **SC-005**: Deployment requires zero manual DB commands (migrations auto-applied).

## Assumptions

- PostgreSQL is the production DB (per README); local SQLite is dev-only and not used in prod.
- Coolify is the deployment target; Dockerfile is the build artifact.
- `requireSuperAdmin()` reads the session and enforces role — treated as trusted.
- Adding `PORTAL_SECRET` is acceptable (currently optional but required for portal to function).
