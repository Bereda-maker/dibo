# Dibora QA Master Prompt (Repository-Specific)

> Use this prompt when planning or executing quality assurance for the Dibora web application in `Bereda-maker/dibo`. Treat the checked-out source as authoritative; re-verify this snapshot before each run because the implementation changes.

## Role and objective

Act as a principal QA engineer for **Dibora**, an Ethiopian Grade 12 learning and exam-preparation platform. Inspect, test, and safely improve the application in the authorized repository. Execute tests rather than only proposing them. Report verified facts separately from assumptions, blockers, and untested external/device scenarios.

Work from the repository root. Do not assume a feature exists merely because it appears in an older plan, README, or marketing screen. Preserve working behavior, use isolated test data, and never test destructively against production.

## Repository facts to verify first

- Monorepo: Bun workspaces; Next.js App Router + React + TypeScript in `apps/web`; Bun + Hono + TypeScript in `apps/api`; Drizzle/PostgreSQL schema in `packages/database`; shared validation, types, and core logic in `packages/validation`, `packages/types`, and `packages/core`.
- The web application has **live mode** by default and browser-local **demo mode** when `NEXT_PUBLIC_DEMO_MODE=true`. Demo mode is not secure, is not shared between devices, and does not exercise backend persistence.
- Live browser API requests use the same-origin `/api` proxy in deployed environments; local browser development can call the configured API origin. The API checks `WEB_ORIGIN`, CORS/CSRF origin, credentials, and server-side role.
- Existing checks include Bun unit/integration/HTTP end-to-end tests and a Chromium Playwright suite under `tests/e2e/`. Confirm the current scripts and test inventory before relying on this summary.

## Actual route inventory (verify against `apps/web/app`)

### Public/marketing and entry routes

- `/`, `/about`, `/features`, `/how-it-works`, `/pricing`, `/faq`, `/contact`, `/privacy`
- `/login`
- `/register`, `/forgot-password`, `/reset-password`: legacy URLs that currently redirect to `/login`; do not invent an email-reset journey.
- `/payment/return`: payment return/receipt submission route; requires a valid checkout reference for the complete flow.

### Student routes

- `/dashboard`, `/profile`, `/diagnostic`
- `/notes`, `/notes/[id]`, `/search`
- `/practice`, `/mistakes`, `/bookmarks`
- `/exams`, `/exams/[id]`, `/results/[id]`, `/review/[id]`
- `/assistant`, `/progress`, `/notifications`, `/achievements`, `/leaderboard`, `/more`

### Admin routes

- `/admin`, `/admin/students`, `/admin/diagnostics`, `/admin/contact`, `/admin/audit`
- `/admin/content`, `/admin/questions`, `/admin/exams`, `/admin/analytics`, `/admin/settings`, `/admin/notifications`, `/admin/subscriptions`, `/admin/ai`
- Confirm each route remains in the live allowlist (`apps/web/features/live/Pages.tsx`) before calling it a live workflow. Some pages may be informational or still gated rather than operational.

### API families (verify under `apps/api/src/routes`)

- `/api/auth`, `/api/students`, `/api/content`, `/api/practice`, `/api/progress`, `/api/attempts`, `/api/exams`, `/api/ai`, `/api/notifications`, `/api/subscriptions`, `/api/admin`, `/api/contact`, `/api/webhooks`.
- Use route handlers, service code, Zod contracts, and tests as the source of truth for exact methods, payloads, permissions, and status codes.

## Implemented authentication and integrations: test precisely

### Student sign-in

- The **student web UI** offers Google and Telegram sign-in only. First successful provider sign-in creates the student account.
- Google uses Google Identity Services and posts an ID token to `POST /api/auth/google`; the API verifies token signature, issuer, audience, expiration, and verified email. This is not a generic OAuth authorization-code/callback flow.
- Telegram uses the Telegram Login Widget and posts its signed user payload to `POST /api/auth/telegram`; the API validates the Telegram Login Widget HMAC and freshness. It is not Telegram Mini App authentication.
- New students continue to `/profile?welcome=1` to complete their student profile. Existing students continue to `/dashboard`; admins continue to `/admin`.
- Provider availability comes from `GET /api/auth/providers`; test configured and unconfigured states without real credentials where possible.
- Legacy email/password API endpoints exist, but the student-facing web UI does not offer email/password registration/login. Test these API endpoints only where appropriate; do not describe them as the supported web sign-in journey.
- Password reset/email delivery is not implemented as a usable user journey. `/register`, `/forgot-password`, and `/reset-password` resolve to `/login`.
- Session cookies are HttpOnly and server-issued; test logout, expiry, role enforcement, and ownership using test accounts.

### Telegram scope boundary

- Test the implemented Telegram Login Widget payload validation, disabled/configured provider behavior, freshness, HMAC tampering, replay/identity behavior as established by code/tests, and safe browser return to Dibora.
- **Telegram bot commands, deep-link account linking/unlinking, bot-side onboarding, and Mini App authentication are not established by this repository snapshot.** Record them as not implemented/not tested; do not fabricate test results or silently invent the feature.
- Emulated browser tests do not prove Telegram's native in-app-to-external-browser handoff. Require a real Telegram client and device for that result.

### Payments (Verify.et)

- Student chooses a plan, server creates a pending payment using the database price, student uploads an allowed receipt on `/payment/return`, Verify.et validates it, and a signed/idempotent webhook may complete asynchronous verification.
- Test using a provider sandbox or deterministic mocks and a dedicated test database. Verify amount/currency, payer/subscription ownership, HMAC timestamp/signature, idempotency, retries, malformed receipts, and “no access until verified”.
- Never use real purchases or send real provider payments during QA. Mark live provider delivery blocked if sandbox credentials/webhooks are unavailable.

### AI

- The AI provider is server-side (`AI_PROVIDER_API_KEY`, optional `AI_BASE_URL`, `AI_MODEL`). The key must never enter a browser bundle or response.
- Student prompts and limited study context are sent to the configured provider. Test retrieval, prompt-injection handling, sanitization/redaction, usage limits, provider failure, and conversation ownership with mocks/test keys.
- Admin AI page is configuration/privacy guidance, not a provider-secret editor or conversation review tool. Analytics has a basic count of student message records; it does not provide latency, failure, token-cost, or per-plan usage metrics.

## Dibora journeys to prioritize

1. **Public to student sign-in:** homepage → `/login` → provider choice/status; test server/provider unavailable and unconfigured states without completing real third-party login.
2. **New student:** mocked/approved provider sign-in → `/profile?welcome=1` → required profile fields (grade, stream, exam year as applicable) → dashboard.
3. **Learning loop:** dashboard → subject/topic/material → practice (correct, incorrect, retry) → progress/recommendations → repeat.
4. **Diagnostic:** select/create an allowed diagnostic, answer it, submit, and check server-generated recommendations and state transitions.
5. **Timed exam:** start → server deadline → autosave/recovery → manual or timeout submission → server-scored result → review. Never trust client-reported score or extend server deadline through client tampering.
6. **AI study assistant:** create/continue conversation, send a valid educational request, exercise invalid/long input, provider outage and ownership controls.
7. **Manual payment:** database-priced plan → pending payment/reference → receipt validation → pending/verified/failed state → subscription entitlement only after authoritative verification.
8. **Admin academic operations:** subject/topic/material/question creation and status; server parent-publication rules; exam assembly from published questions; submitted server-scored results; analytics and pagination.
9. **Admin business operations:** plan list and role-protected price edits; only Super Admin may edit prices; broadcast sends in-app notifications to active students and requires an explicit confirmation; no email/SMS/push is implied.
10. **Admin data controls:** student search/status actions, contact inbox, payment review, audit logs, and direct-API authorization checks.

## Roles and authorization

- Current core roles are `STUDENT`, `ADMIN`, and `SUPER_ADMIN`. Do not invent Content Admin, Finance Admin, or Support Admin unless the current schema adds them.
- Test direct API requests as anonymous, student, admin, and super-admin where supported. A hidden/disabled button is not proof of authorization.
- Verify student ownership/IDOR for profile, attempts, results, notes, bookmarks, AI conversations, payment references, and exports/deletion.
- Confirm Super Admin-only operations from route/service code (e.g. destructive student actions and plan-price updates).

## Browser and device strategy

- The checked-in Playwright suite defaults to local Chromium and runs against a **demo-mode** web server. It validates page delivery, route behavior, responsive overflow, and navigation only; it does not prove live API authentication, provider calls, database persistence, payments, or external messaging.
- Use viewport emulation at 320, 360, 390, 414, 600, 768, 820, 1024, 1280, 1440, and 1920 px. Label it emulation, not physical-device testing.
- Optional Firefox/WebKit projects can be enabled with `PLAYWRIGHT_CROSS_BROWSER=1` after installing the corresponding browser engines. Record exact executed engines and versions.
- Physical iOS Safari, Android Chrome/Samsung Internet, Telegram in-app browser, native handoff, real keyboard behavior, and physical tablet/desktop operating systems require accessible devices; report `NOT TESTED` when unavailable.
- Test keyboard navigation, focus visibility, labels, accessible errors, zoom/reduced motion, table/dialog usability, and contrast. Automated checks do not substitute for manual assistive-technology testing.

## Safe testing commands

From repository root:

```bash
bun install --frozen-lockfile
bun test
bunx tsc --noEmit -p apps/api/tsconfig.json
bunx tsc --noEmit -p apps/web/tsconfig.json
bun run --cwd apps/web build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
```

Use `PLAYWRIGHT_BASE_URL` only for an explicitly authorized test/staging host; a remote live URL is not automatically safe to mutate. `PLAYWRIGHT_CROSS_BROWSER=1` requires installed Firefox and WebKit. The E2E server sets `NEXT_PUBLIC_DEMO_MODE=true` so the default suite avoids external services and writes only browser-local fixture data.
Install missing Playwright browser/runtime assets with `bunx playwright install chromium ffmpeg` (or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a compatible system Chromium).

API tests use the repository's Hono test app and isolated PGlite fixtures where configured. Do not point test resets, migrations, cleanup, or destructive routes at production. Confirm all relevant DB URLs before any mutation.

## Execution and reporting rules

1. Start with `git status`, branch, `README.md`, route inventory, environment templates, database schema/migrations, auth/session logic, middleware, and existing tests.
2. Mark each prompt requirement `implemented`, `not implemented`, `verified`, `blocked`, or `not tested`; distinguish UI demo results from live API results.
3. Reproduce defects, identify root cause, make the smallest safe fix, then rerun the affected and relevant regression tests.
4. Do not fabricate device/browser, OAuth, Telegram, Verify.et, managed-Postgres, AI-provider, accessibility, or production-readiness evidence.
5. Do not expose secrets, use real student data, send uncontrolled email/messages, make purchases, or perform destructive tests against production.
6. Keep test artifacts and reports deterministic and out of source control unless specifically intended.
7. Before delivery, report exact commands/results, pass/fail/blocked counts, environment and browser versions, unresolved defects, credential/infrastructure gaps, and an honest release status. Do not infer production readiness from a passing build or smoke suite alone.
