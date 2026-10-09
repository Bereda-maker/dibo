# Dibora — Ethiopian Grade 12 AI Learning & Exam Platform

The product name is configurable via `APP_NAME` / `NEXT_PUBLIC_APP_NAME`.

## Status
The web UI is complete in demo mode; the backend is a foundation. See "Demo mode vs real mode".

## Architecture
- `apps/api` — Bun + Hono REST API. Layers: routes → services → `@dibora/database`. Business logic lives in services; route files only validate and delegate.
- `apps/web` — Next.js App Router + Tailwind. Design tokens are CSS variables (light/dark) in `styles/globals.css`. Translation-ready via `i18n/*.json` (en, am, om).
- `packages/database` — Drizzle schema (PostgreSQL, UUID keys, FKs, indexes, soft-delete). No teacher/video tables.
- `packages/validation` — Zod schemas shared by API and web. `packages/types` — enums and API envelope types.

### Key design decisions
- **Learning status and subscription status are separate columns** on `student_profiles`.
- **Curriculum is data, not code**: education_level → grade → stream → subject → topic → subtopic → material → questions. Names are `{en, am, om}` JSON.
- **Server-authoritative exams**: `exam_attempts.deadline_at` is set by the server; scoring is a pure function (`exam-scoring.service.ts`) over stored answers. Client-reported correctness is never trusted.
- **Entitlements** are plan JSON (`subscription_plans.entitlements`) resolved by one function; no scattered premium checks. Prices are rows (`price_minor`), editable by admins.
- **Payments**: manual payment + receipt verification through Verify.et behind the `PaymentProvider` interface. See "Payments (Verify.et)". Access is granted only by a verified result whose amount/currency match the database price; webhooks are HMAC-signed and idempotent.
- **AI**: all calls server-side through `AIService` using any OpenAI-compatible endpoint (`AI_BASE_URL`, `AI_MODEL`, `AI_PROVIDER_API_KEY`). Retrieval-first prompt with "say you don't know" rule, injection screening, output sanitising and secret redaction, rate limiting.
- **Readiness score** is an internal metric with a built-in disclaimer and explainable change text.

## Requirements
Bun ≥ 1.1, PostgreSQL ≥ 15, Node ≥ 20 (for Next.js tooling).

## Setup
```bash
cp .env.example .env        # fill in values; never commit secrets
bun install
bun run db:generate && bun run db:migrate
bun run dev:api             # http://localhost:8787
bun run dev:web             # http://localhost:3000
bun test
```

## Environment variables
See `.env.example`. API: `DATABASE_URL`, `SESSION_SECRET`, `WEB_ORIGIN`, `AI_*`, `VERIFY_ET_*`, `RECEIPT_STORAGE_DIR`, `PAYMENT_ACCOUNTS`. Web: `NEXT_PUBLIC_API_URL`.

## What exists
- **API foundation**: full Drizzle schema, Hono app (request IDs, security headers, CORS/CSRF origin check, central errors, rate limiting), auth (register/login/logout, argon2id, hashed sessions), AI service (guard, retrieval-first prompt, redaction), payment abstraction with Verify.et and verified webhooks.
- **`packages/core`**: pure business logic shared by API and web: exam scoring + timer rule, recommendations, readiness score, entitlements. 30 passing tests (`bun test`).
- **Web app (complete UI, demo mode)**: every page in the spec.
  - Public: home, features, how-it-works, pricing (prices come from admin settings), FAQ, about, contact, privacy, login, register, forgot/reset password.
  - Student: dashboard, profile (edit, data export, delete), diagnostic, notes (read, search, bookmark, complete, review later), practice (topic, weak area, previously wrong, random), exams with autosave/recovery/timer/auto-submit/confirm, results, review, AI assistant (conversations), progress charts, bookmarks, "Questions I got wrong", global search, notifications, achievements, optional leaderboard.
  - Admin: dashboard, students (search, suspend, delete, audit), subjects/topics/notes lifecycle with bulk actions, question editor with validation and preview, exam builder, AI management, subscriptions/payments, notifications, analytics, audit log, pricing settings.
  - Responsive (bottom nav on phones, tables become cards), light/dark, English/Amharic/Afaan Oromo for navigation and key strings, accessible forms/modals.

## Live mode vs demo mode
The web app has two modes, chosen at build time by `NEXT_PUBLIC_DEMO_MODE`:
- **Live (default, `false`)**: every student screen talks to the Hono API with the session cookie: register/login/logout, profile (edit, export, delete), dashboard, practice, notes, exams (server-timed, autosaved), results and review, progress, bookmarks, "Questions I got wrong", AI assistant, notifications, achievements, leaderboard, search, pricing and manual payment (with a `/payment/return` page that submits the receipt and shows verification status). Admin: overview, students (suspend/activate, super-admin delete) and audit log.
- **Demo (`true`)**: the original browser-only version with built-in sample content, stored in localStorage. It is for design review only: nothing is shared between devices and nothing is secure.

Live mode needs the API on the same registrable site as the web app (for example `app.example.com` and `api.example.com`) so the session cookie is sent. Set `WEB_ORIGIN` on the API to the exact web origin.

### Verification so far
- 91 automated tests (unit, PostgreSQL integration, and HTTP end-to-end through the real Hono app), plus type checks for API and web, and a production web build.
- The real API entry point (`config` validation, postgres-js driver, `migrate`, `seed`) was run against a PostgreSQL wire-protocol server and exercised over HTTP: register, login, practice, progress, admin, and student-blocked-from-admin, with no server errors.
- **Not yet verified**: a real managed PostgreSQL server, the Docker images (no Docker daemon was available), the live web UI in a browser against the live API, real Verify.et calls and webhook delivery, and a real AI provider.

### Launch checklist (not done yet)
1. **Browser test the live web app against a staging API** (the screens were type-checked and built, but not clicked through). Fix whatever that finds.
2. Admin screens still demo-only (not available in live mode): subjects/topics/notes management, question editor, exam builder, analytics, settings and pricing editor. The admin **API** already supports question create/publish/archive, student management, plan price changes and audit; the missing piece is the UI plus admin endpoints for notes, exams and analytics.
3. Missing API: admin CRUD for subjects/topics/notes/exams, analytics queries, global notification broadcast.
4. Email delivery for verification and password reset (tokens table exists, sender does not). The forgot/reset password screens are placeholders.
5. Real content: reviewed Grade 12 questions, notes and explanations (note `content` JSON shape: `explanation`, `definitions`, `concepts`, `formulas`, `examples`, `keyPoints`, `commonMistakes`, `examTips`). Amharic/Afaan Oromo text needs native review.
6. Staging on managed PostgreSQL, load test of exam submit, backups, monitoring and alerting.
7. Redis-backed rate limiting if you run more than one API instance.
8. Legal: privacy policy and parental consent for minors reviewed against Ethiopian law.
9. Independent security review and dependency audit; rotate all secrets (`SESSION_SECRET` >= 32 chars).

## Deployment
```bash
cp .env.example .env            # fill in real values
docker compose up --build       # local stack (Postgres + API + web)
docker compose exec api bun run --cwd packages/database migrate
docker compose exec api bun run --cwd packages/database seed
```
Production: use managed PostgreSQL, TLS termination, secrets from your platform's secret store, run `migrate` as a release step, and put the API and web behind HTTPS on the same site (or set `WEB_ORIGIN` precisely) so SameSite cookies and the CORS/CSRF checks work.

## Security notes
Argon2id hashing; HttpOnly + SameSite cookies; session tokens stored hashed; role resolved server-side from the DB; Zod on every request; Drizzle parameterised queries; signed+verified payment webhooks; AI keys server-only. Students may be minors: collect minimal data, keep leaderboard opt-in, never expose contact/school/academic records or AI chats.

## Contributing
Keep logic in services, validate with shared Zod schemas, add tests for any scoring/entitlement/payment change.


## Payments (Verify.et)
Flow: student picks a plan -> `POST /api/subscriptions/checkout` creates a `PENDING` payment (amount = database plan price, never client-supplied) -> student pays manually and uploads a receipt on `/payment/return?ref=...` -> `POST /api/subscriptions/payments/:reference/submit` (multipart: `method`, optional `transactionReference`, `image`) -> the API validates the image (JPEG/PNG/WebP, max 8 MB, magic bytes) and calls `POST {VERIFY_ET_BASE_URL}/api/verify` with `x-api-key` and `Idempotency-Key: dibora-payment-{paymentId}-{attempt}`.
- HTTP 200: result applied immediately. HTTP 202: `requestId` stored, status `VERIFYING`, no access yet.
- Webhook `POST https://api.dibora.app/api/webhooks/verify-et` (event `verification.completed`) is the source of truth. Signature: HMAC-SHA256 with `VERIFY_ET_WEBHOOK_SECRET` over `{X-Webhook-Timestamp}.{raw body}` (hex), 5-minute timestamp tolerance. Events are de-duplicated by `X-Webhook-Event-Id` in `payment_webhook_events`; retries return 200 without re-granting.
- Statuses: `PENDING` (created / retryable), `VERIFYING` (submitted), `VERIFIED` (access granted through the existing subscription activation), `FAILED` (student may resubmit; new attempt = new idempotency key). Legacy `SUCCESS/CANCELLED/REFUNDED` rows remain readable.
- Verified requires `verified === true` AND amount/currency equal to the stored payment AND the subscription belonging to the payer; otherwise `FAILED`.
- Supported methods: cbe, boa, telebirr, mpesa, cbebirr, dashen, awash, siinqee, kaafiebirr, coopayebirr (`PAYMENT_METHODS` in `packages/types`).
- Receipts are stored privately under `RECEIPT_STORAGE_DIR` (files 0600, never served publicly). Use a persistent volume in production.
- Production setup: set `VERIFY_ET_API_KEY`, `VERIFY_ET_WEBHOOK_SECRET`, `PAYMENT_ACCOUNTS`; register the webhook URL above in the Verify.et dashboard; run `bun run db:migrate` (additive migration `0001`).
