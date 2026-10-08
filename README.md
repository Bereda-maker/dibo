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
- **Payments**: `PaymentProvider` interface (Chapa implemented). Webhooks require a valid HMAC signature **and** a server-side re-verification of status, amount, currency and reference; activation is idempotent.
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
See `.env.example`. API: `DATABASE_URL`, `SESSION_SECRET`, `WEB_ORIGIN`, `AI_*`, `PAYMENT_*`. Web: `NEXT_PUBLIC_API_URL`.

## What exists
- **API foundation**: full Drizzle schema, Hono app (request IDs, security headers, CORS/CSRF origin check, central errors, rate limiting), auth (register/login/logout, argon2id, hashed sessions), AI service (guard, retrieval-first prompt, redaction), payment abstraction with Chapa and verified webhooks.
- **`packages/core`**: pure business logic shared by API and web: exam scoring + timer rule, recommendations, readiness score, entitlements. 30 passing tests (`bun test`).
- **Web app (complete UI, demo mode)**: every page in the spec.
  - Public: home, features, how-it-works, pricing (prices come from admin settings), FAQ, about, contact, privacy, login, register, forgot/reset password.
  - Student: dashboard, profile (edit, data export, delete), diagnostic, notes (read, search, bookmark, complete, review later), practice (topic, weak area, previously wrong, random), exams with autosave/recovery/timer/auto-submit/confirm, results, review, AI assistant (conversations), progress charts, bookmarks, "Questions I got wrong", global search, notifications, achievements, optional leaderboard.
  - Admin: dashboard, students (search, suspend, delete, audit), subjects/topics/notes lifecycle with bulk actions, question editor with validation and preview, exam builder, AI management, subscriptions/payments, notifications, analytics, audit log, pricing settings.
  - Responsive (bottom nav on phones, tables become cards), light/dark, English/Amharic/Afaan Oromo for navigation and key strings, accessible forms/modals.

## Demo mode vs real mode (read this before launch)
The **web app still runs on a local demo data layer** (`apps/web/lib/store.tsx`, `lib/mock.ts`, localStorage). Accounts, progress, exams and the admin panel are not shared between devices and are not secure. The **backend is real and tested but only partly built**, and the web is **not yet connected to it**. Do not launch to students until the checklist below is done.

### Backend status
Built and tested (44 tests, including integration tests that run the generated migration and the Drizzle code on a real PostgreSQL engine via PGlite):
- Auth (register/login/logout), role middleware, rate limiting, security headers, CSRF origin check, central errors, request IDs
- `/api/attempts` start/resume, autosave, submit (server deadline, owner scoping, idempotent, limits, premium gating)
- `/api/subscriptions/plans|checkout|verify`, `/api/payments/webhook/:provider` (signature + provider re-verification + amount match, transactional activation, idempotent)
- `/api/content/subjects|topics|notes` (published only)
- Env validation at boot, migrations (`packages/database/migrations`), seed script, Dockerfiles, `docker-compose.yml`, GitHub Actions CI (template in `docs/ci.yml.example`; copy to `.github/workflows/ci.yml`)

### Launch checklist (not done yet)
1. Remaining API modules: students/profile, questions + practice recording, progress/recommendations/readiness persistence, achievements, notifications, AI conversations + `/api/ai` (service exists), admin (students, content CRUD, questions, exams, analytics, audit, settings).
2. Replace the web demo store with API calls (`NEXT_PUBLIC_API_URL`) and add the `/payment/return` page that calls `/api/subscriptions/verify`.
3. Email delivery for verification and password reset (tokens table exists, sender does not).
4. Real content: reviewed Grade 12 questions, notes and explanations. Amharic/Afaan Oromo text needs native review.
5. Run against a real PostgreSQL in staging; load test the exam submit path; set up backups, monitoring and alerting.
6. Replace the in-memory rate limiter with a Redis store when running more than one API instance.
7. Legal: privacy policy and parental-consent approach for minors reviewed against Ethiopian law; implement data export/deletion endpoints.
8. Security review and a dependency audit before launch; rotate all secrets; set `SESSION_SECRET` (>= 32 chars).

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
