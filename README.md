# Deborah — Ethiopian Grade 12 AI Learning & Exam Platform

The public-facing web brand is Deborah.

## Status
The web app supports both a browser-local demo mode and a live API-backed mode. Student workflows and the core admin console use the backend in live mode; see "Demo mode vs real mode" and the current verification limitations below.

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
- **AI**: calls are server-side through `AIService`. OpenAI defaults to `https://api.openai.com/v1` and `gpt-6-luna`; only `AI_PROVIDER_API_KEY` is required for that default. A custom OpenAI-compatible endpoint/model can override those defaults. Student prompts and limited study context are sent to the configured provider; the API key stays server-only.
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
See `.env.example`. API: `DATABASE_URL`, `SESSION_SECRET`, `WEB_ORIGIN`, `AI_PROVIDER_API_KEY` (required to enable the default OpenAI assistant), optional overrides `AI_BASE_URL` and `AI_MODEL`, `VERIFY_ET_*`, `RECEIPT_STORAGE_DIR`, `PAYMENT_ACCOUNTS`, social-login settings, and optional Meta CAPI settings (`META_PIXEL_ID`, `META_ACCESS_TOKEN`). Meta Lead events are sent only for contact submissions that explicitly opt in; the access token is API-only. Web: `NEXT_PUBLIC_API_URL` must be the API origin without `/api`; the production Next server proxies `/api/*` through the web origin so the session cookie remains first-party. Set it in the web deployment's Preview and Production environments. Never expose `TELEGRAM_BOT_TOKEN` or `META_ACCESS_TOKEN` through a `NEXT_PUBLIC_*` variable.

## What exists
- **API foundation**: full Drizzle schema, Hono app (request IDs, security headers, CORS/CSRF origin check, central errors, rate limiting), auth (register/login/logout, argon2id, hashed sessions), AI service (guard, retrieval-first prompt, redaction), payment abstraction with Verify.et and verified webhooks.
- **`packages/core`**: pure business logic shared by API and web: exam scoring + timer rule, recommendations, readiness score, entitlements. 30 passing tests (`bun test`).
- **Web app**: routes support live mode or browser-local demo mode as documented below.
  - Public: home, features, how-it-works, pricing (prices come from admin settings), FAQ, about, contact, privacy, and provider-based student sign-in. Live contact submissions are stored in the admin contact inbox; replies use the sender's email. Legacy `/register`, forgot-password and reset-password URLs redirect to `/login`.
  - Student: dashboard, profile (edit, data export, delete), diagnostic, notes (read, search, bookmark, complete, review later), practice (topic, weak area, previously wrong, random), exams with autosave/recovery/timer/auto-submit/confirm, results, review, AI assistant (conversations), progress charts, bookmarks, "Questions I got wrong", global search, notifications, achievements, optional leaderboard.
  - Admin: live dashboard, Diagnostic Builder, student management, contact inbox, audit log, curriculum subject/topic/material creation and status, question bank creation and publishing, exam builder and results, learning analytics, plan pricing, in-app notification broadcasts/history, subscription/payment review, and AI configuration/privacy guidance. Verify the relevant route and role before relying on a particular action; not every module provides full edit/version-history workflows.
  - Responsive (bottom nav on phones, tables become cards), light/dark, English/Amharic/Afaan Oromo for navigation and key strings, accessible forms/modals.

## Live mode vs demo mode
The web app has two modes, chosen at build time by `NEXT_PUBLIC_DEMO_MODE`:
- **Live (default, `false`)**: student sign-in uses Google or Telegram; a first provider sign-in creates an account. Student screens then talk to the Hono API with the session cookie: logout, profile (edit, export, delete), dashboard, practice, notes, exams (server-timed, autosaved), results and review, progress, bookmarks, "Questions I got wrong", AI assistant, notifications, achievements, leaderboard, search, pricing and manual payment (with a `/payment/return` page that submits the receipt and shows verification status). Admin: overview, Diagnostic Builder, students (suspend/activate, super-admin delete), contact inbox and audit log.
- **Demo (`true`)**: the original browser-only version with built-in sample content, stored in localStorage. It is for design review only: nothing is shared between devices and nothing is secure.

Live mode proxies browser API requests through the web origin in production. Set `NEXT_PUBLIC_API_URL` on the web deployment to the API origin without `/api`; Next forwards `/api/*` server-side, making the HttpOnly session cookie first-party for Safari, Telegram’s in-app browser, and desktop browsers. Set `WEB_ORIGIN` on the API to the exact public web origin, including scheme and no trailing slash. Direct API access remains protected by CORS and credentials checks.

### Verification so far
- 151 Bun unit/integration/API tests passed in the latest local run; 15 Chromium Playwright smoke tests passed against the web app in demo mode, including 11 emulated viewport widths; API/web and Playwright TypeScript checks passed; production web build passed.
- The real API entry point (`config` validation, postgres-js driver, `migrate`, `seed`) was run against a PostgreSQL wire-protocol server and exercised over HTTP: register, login, practice, progress, admin, and student-blocked-from-admin, with no server errors.
- **Not yet verified**: physical iOS/Android/Windows/macOS devices, Firefox/WebKit in this QA run, the live web UI in a browser against a staging API, managed PostgreSQL, Docker images, real Verify.et calls and webhook delivery, and a live OpenAI call. The Playwright suite uses demo mode and does not prove live sign-in, database persistence, or external provider behavior.

### Launch checklist (not done yet)
1. **Browser test the live web app against a staging API** (the screens were type-checked and built, but not clicked through). Fix whatever that finds.
2. Complete an authorized staging browser pass for live student/admin workflows. Current admin authoring supports core create/status operations, but comprehensive content editing/revision history and question-file import are not provided by the current console.
3. Telegram bot commands, deep-link account linking/unlinking, Telegram Mini App authentication, email delivery/password reset, and detailed AI operational metrics are not implemented by this repository snapshot; do not treat them as tested features.
4. Email delivery for verification and password reset is not connected (tokens table exists, sender does not); the old public password-reset URLs now return students to provider sign-in. Contact form messages are saved to the live admin inbox, where admins can reply using their email client.
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
Production: use managed PostgreSQL, TLS termination, secrets from your platform's secret store, and put the API and web behind HTTPS on the same site (or set `WEB_ORIGIN` precisely) so SameSite cookies and the CORS/CSRF checks work. The API Docker image applies all Drizzle migrations and idempotently ensures the contact inbox table exists before starting. If you use a custom release/start command, run `bun run --cwd packages/database migrate` before serving traffic and preserve the contact-inbox bootstrap step.

## Security notes
Argon2id hashing; HttpOnly + SameSite cookies; session tokens stored hashed; role resolved server-side from the DB; Zod on every request; Drizzle parameterised queries; signed+verified payment webhooks; AI keys server-only. The assistant sends student prompts and limited study context to the configured AI provider. Students may be minors: collect minimal data, keep leaderboard opt-in, and never expose contact, school, academic records or AI chats publicly.

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
- Production setup: set `VERIFY_ET_API_KEY`, `VERIFY_ET_WEBHOOK_SECRET`, `PAYMENT_ACCOUNTS`; register the webhook URL above in the Verify.et dashboard; run `bun run db:migrate` (additive migrations `0001`–`0003`, including the contact inbox table).


## Social login (Google and Telegram)
The student-facing `/login` page offers Google or Telegram only. A successful first sign-in creates the account; `/register` redirects to `/login`. Live social sign-in calls the API endpoints `GET /api/auth/providers`, `POST /api/auth/google`, and `POST /api/auth/telegram`; browser-only demo mode does not perform social authentication. Legacy email/password API routes remain in the backend but are not presented in the student web UI.
- **Google**: set `GOOGLE_CLIENT_ID` (OAuth client of type "Web application"; add your site origin under Authorized JavaScript origins). The API verifies the ID token itself (RS256 signature against Google's keys, issuer, audience, expiry, `email_verified`). No client secret is used.
- **Telegram**: configure the supplied bot [@DiboraStudentBot](https://t.me/DiboraStudentBot) with @BotFather, run `/setdomain` with your site's domain, and set `TELEGRAM_BOT_TOKEN` as an API-only secret. `TELEGRAM_BOT_USERNAME` is public and is prefilled as `DiboraStudentBot` in `.env.example`. A token added only to the Vercel web project is not available to the separately hosted API. Telegram sign-in creates or reuses an account; new students continue to `/profile?welcome=1` to complete their student profile. The API verifies the Login Widget HMAC and rejects payloads older than 24 hours.
- **Accounts**: identities are stored in `auth_identities` (unique per provider account). A Google sign-in whose verified email matches an existing account links to it; if that account's email was never verified, its password and sessions are cleared first (prevents pre-registration takeover). Telegram has no email, so it always creates its own account with a placeholder `tg_<id>@telegram.invalid` email (password reset is not possible for these accounts). Social accounts get an unusable random password.
- **Cookie**: browser calls use the web-origin proxy so Safari does not have to accept a third-party API cookie. The API still issues `HttpOnly; Secure` cookies; use `COOKIE_SAMESITE=Lax` when the public web origin and API share a registrable domain, otherwise leave production at `None` for direct/API-origin compatibility.
- **Migration**: `0002` adds `auth_identities` (additive).
