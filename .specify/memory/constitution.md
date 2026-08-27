# BizzBills (Billinvoice) Constitution

## Core Principles

### I. Production Readiness is the Definition of Done
A feature is "done" only when it builds cleanly, passes type-check and lint, has tests for its business logic, is secured against unauthorized access, and is verified end-to-end. "It runs on my machine" is not done. Every change must leave the app in a state that could ship to production.

### II. Security is Non-Negotiable (Financial Data)
This is a billing/invoicing/finance platform handling invoices, GST, bank data, and customer PII.
- All API routes that read/write data MUST authenticate the session and authorize the actor against the targeted resource (organization/tenant scoping). No route may ever return another tenant's data.
- All user input is untrusted. Validate at the boundary with a schema (zod) before use. Parameterize every DB query (Prisma does this; never bypass with raw SQL strings built from input).
- Secrets (API keys, `NEXTAUTH_SECRET`, `CRON_SECRET`, DB URL) live only in environment variables, never in source or logs.
- Cron/health/payment-webhook routes must use `CRON_SECRET` or signed verification — never be open.
- Errors must never leak stack traces or secrets to clients.

### III. Test-First for Business Logic
The financial engine (invoice totals, tax/GST computation, anomaly detection, currency rates, rounding, diff/versioning) is the riskiest code. Any change to it requires a failing test first, then the minimal implementation to pass (Red-Green-Refactor). `npx vitest run` must be green in CI and locally before merge.

### IV. Money is Exact
All monetary values use integer minor units (paise/cents) or a decimal type with explicit rounding rules — never binary floating point for arithmetic. Currency and locale are explicit. Rounding rules for tax are documented and tested.

### V. Observability & Operability
- A real health check exists (`/api/health`) and reports DB connectivity, not just "ok".
- Structured, leveled logging (no secrets) for auth failures, payment events, and 5xxs.
- The app must boot and self-heal: migrations run on deploy (`prisma migrate deploy` / `db push`), not manually.

### VI. Simplicity & YAGNI
No speculative features, no premature abstraction. Match existing Tailwind/Next.js App Router conventions. A 50-line solution beats a 200-line "flexible" one. Each change traces to a requirement in the spec below.

## Technology Constraints

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict).
- **Styling:** Tailwind CSS 4.
- **Database:** PostgreSQL via Prisma. Single `DATABASE_URL`; migrations are the source of truth (`prisma migrate deploy` in prod).
- **Auth:** NextAuth v4, JWT credentials session. Session + tenant validation on every protected route.
- **AI:** Rule-based engine must work with no API key; LLM features are opt-in and require a user-provided key.
- **Deploy:** Dockerfile (standalone) on Coolify. Health check `/api/health`.

## Development Workflow & Quality Gates

1. Spec-driven: constitution → spec → plan → tasks → implement → converge (Spec Kit).
2. Quality gates before any "done": `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` green, `npm run build` succeeds.
3. Security review on every PR touching auth, money, or multi-tenant data.
4. Conventional commits; PR summary includes test plan and verification evidence.

## Governance

This constitution supersedes ad-hoc habits. Amendments require a documented change, version bump, and a note in the spec. All downstream Spec Kit commands (specify/plan/tasks/implement/converge) read this file and must comply.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28
