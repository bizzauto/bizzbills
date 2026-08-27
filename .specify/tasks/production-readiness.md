# Tasks: BizzBills Production Readiness Hardening

**Input**: Design documents from `/specs/production-readiness/` (plan.md, spec.md)
**Prerequisites**: plan.md (✅), spec.md (✅)
**Tests**: Included — money rounding + cron recurring-invoice (per spec FR-008).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Create `.specify/memory/constitution.md` (constitution) — DONE
- [ ] T002 [P] Create spec `.specify/specs/production-readiness.md` — DONE
- [ ] T003 [P] Create plan `.specify/plans/production-readiness.md` — DONE

---

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T004 [P] Add `src/lib/validation.ts`: `isValidEmail`, `validatePassword` (min 8),
      `USER_ROLES` enum, `validateAdminUserInput(body)` returning typed errors. No new deps.

---

## Phase 3: User Story 1 — Hardened public & admin boundaries (P1) 🎯 MVP

**Goal**: No error-info leak on public routes; admin user creation is validated.

- [ ] T010 [US1] Fix GAP-1 in `src/app/api/portal/route.ts`: replace
      `Failed to load portal data: ${message}` with generic `Failed to load portal data`.
- [ ] T011 [US1] Fix GAP-2 in `src/app/api/admin/users/route.ts` POST: use
      `validateAdminUserInput` (email format, password >=8, role enum); return 400 on invalid.
- [ ] T012 [US1] In `admin/users/route.ts` POST: verify `orgId` exists via
      `prisma.organization.findUnique`; return 400 `Organization not found` when missing.
- [ ] T013 [US1] Audit remaining public routes (health, auth/register, password reset) for raw
      error leakage; ensure generic messages (no `error.message` in client JSON).

**Checkpoint**: `GET /api/portal?token=bad` → 401 generic; bad admin POST → 400; no user created.

---

## Phase 4: User Story 2 — Verified, self-healing deployment (P1)

**Goal**: Container applies schema on start; PORTAL_SECRET documented; health is structured.

- [ ] T020 [US2] Fix GAP-4 in `entrypoint.sh`: run `npx prisma generate && npx prisma db push
      --skip-generate` before `exec node server.js` (matches repo's no-migrations convention).
- [ ] T021 [US2] Fix GAP-3 in `.env.example`: add `PORTAL_SECRET` (commented, with generation note).
- [ ] T022 [US2] Verify GAP-5 in `src/app/api/health/route.ts`: returns JSON `{status,db,...}` and
      503 on DB-down. If it returns a bare string, convert to structured JSON. (Confirmed OK —
      keep; only harden if needed.)
- [ ] T023 [US2] Smoke-run `npm run build` to confirm `output:"standalone"` + Dockerfile COPY set
      is correct (no missing runtime modules).

**Checkpoint**: `GET /api/health` → 200 JSON when DB up, 503 JSON when down; build succeeds.

---

## Phase 5: User Story 3 — Financial correctness verified by tests (P2)

**Goal**: Money rounding + cron recurring-invoice generation covered by tests.

- [ ] T030 [US3] Add `src/lib/money.test.ts`: rounding to integer minor units, multi-line
      subtotal/tax/total, no float drift (test-first, then add helper if missing).
- [ ] T031 [US3] Add `src/lib/recurring-cron.test.ts` (or co-located): pure function extracting
      `calcNextRunDate` + invoice-number collision logic from `api/cron/route.ts` so it is
      unit-testable; assert unique numbers + correct next-run advance.

**Checkpoint**: `npx vitest run` green incl. new money + cron tests.

---

## Phase 6: Lint to Clean (Cross-Cutting — Quality Gate SC-001)

**Goal**: `npm run lint` exits 0 (85 errors → 0).

- [ ] T040 [P] Fix genuine `prefer-const` (5) and `no-unused-vars` real-dead-code errors across
      `src/lib/auth.ts`, `src/lib/email.ts`, `src/lib/razorpay.ts`, etc. (remove/rename, don't
      just disable).
- [ ] T041 [P] Fix `react/no-unescaped-entities` (2) and `no-img-element` (5) where trivial
      (use next/image or eslint-disable-line with reason).
- [ ] T042 [P] In `eslint.config.mjs`: scope/downgrade `react-hooks/set-state-in-effect` (37) and
      `react-hooks/exhaustive-deps` (4) + `immutability` (2) to **warn** with a documented comment
      (camera start is a side-effect, not state derivation). Keep `no-unused-vars`/`no-explicit-any`
      as-is unless warranted.
- [ ] T043 Run `npx eslint .` and confirm **0 errors** (warnings allowed but minimized).

**Checkpoint**: `npm run lint` exit code 0.

---

## Phase 7: Converge & Verify (Final)

- [ ] T050 Run full gate: `npx tsc --noEmit` (0) → `npm run lint` (0 err) → `npx vitest run`
      (green) → `npm run build` (success).
- [ ] T051 Run `/speckit-converge` to re-scan codebase for any remaining production-readiness gaps
      not covered above; append as tasks if found.

---

## Dependencies & Execution Order

- T001–T003: done (constitution/spec/plan).
- T004 (validation helper) BLOCKS T011/T012.
- US1 (T010–T013) independent of US2/US3.
- Lint phase (T040–T043) can run after any impl; must finish before T050 gate.
- T050 gate must pass before declaring done.

## Parallel Opportunities

- T010, T020, T021, T030, T040, T041, T042 are in different files → can run in parallel.
- T011 depends on T004.
