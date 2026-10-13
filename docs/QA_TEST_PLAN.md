# Deborah QA Test Plan

**Target:** `Bereda-maker/dibo`  
**Last execution:** 2026-10-11  
**Source of truth:** current source, schemas, shared Zod rules, routes, and tests. See [`QA_MASTER_PROMPT_DIBORA.md`](./QA_MASTER_PROMPT_DIBORA.md) for the reusable execution prompt.

## Test layers

| Layer | Location | Purpose | Command |
|---|---|---|---|
| Pure logic/unit | `packages/core`, `apps/api/tests/logic.test.ts`, scoring/entitlement suites | Exam scoring, timing rules, recommendations, readiness, entitlements | `bun test` |
| API/service integration | `apps/api/tests/*integration.test.ts`, `apps/api/tests/api.e2e.test.ts` | PGlite schema, service behavior, Hono routes, auth, validation, role checks, student ownership, payments, AI/social provider mocks | `bun test` |
| Web rendering helpers | `apps/web/tests/*.test.mjs` | Safe markdown/math rendering and assistant content | `bun test` |
| Browser smoke | `tests/e2e/*.pw.ts` | Public route delivery, legacy auth URL behavior, home navigation, responsive overflow, demo admin mobile navigation | `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e` |
| Static/build | app TypeScript configs and Next production build | API/web type integrity and production compilation | Commands below |

## Prioritized Deborah journeys

| Journey | Automated coverage | Remaining coverage |
|---|---|---|
| Public marketing routes and navigation | Chromium direct-route smoke and desktop/mobile viewport overflow | Full link graph, metadata, screenshot baselines, non-Chromium engines |
| Provider sign-in status | API social-auth tests cover Google/Telegram validation; demo web shows honest disabled-provider state | Staging login through approved test provider accounts; live cookie/session flows |
| Legacy `/register`, `/forgot-password`, `/reset-password` | Browser smoke confirms navigation to `/login` | Password recovery is not implemented; do not create a success expectation |
| Student practice/progress/recommendations | PGlite service tests and API E2E routes | Live browser journey on staging across devices |
| Server-scored exams | Core scoring/timer and HTTP route tests | Live browser resume/offline/autosave journey; staging load tests |
| AI study assistant | Service/provider mock tests, sanitization and ownership coverage | Approved provider sandbox/live key, cost/latency/failure instrumentation |
| Verify.et payments | Provider/service/webhook tests with controlled fixtures | Provider sandbox calls and delivery; never real payment in QA |
| Admin workflows | API role/CRUD/publication tests plus demo admin navigation smoke | Live browser forms as real admin/super-admin; broader edit/version/import actions are not implemented |
| Notifications | API broadcast/list integration tests | External email, SMS, push are not implied or tested |
| Responsive layout | Chromium viewport emulation: 320–1920 px | Physical iOS/Android/tablet/desktop, keyboard/OS behavior |
| Accessibility | Basic semantic assertions in route smoke | axe scan, manual keyboard/screen-reader/high-contrast review |

## Commands

```bash
bun install --frozen-lockfile
bun test
bunx tsc --noEmit -p apps/api/tsconfig.json
bunx tsc --noEmit -p apps/web/tsconfig.json
bunx tsc --noEmit --target ES2022 --module node16 --moduleResolution node16 --esModuleInterop --skipLibCheck --types node playwright.config.ts tests/e2e/smoke.pw.ts
bun run --cwd apps/web build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
```

For optional Firefox/WebKit execution, install their Playwright browsers and run `PLAYWRIGHT_CROSS_BROWSER=1 bun run test:e2e`. These browser engines were not part of the current run.
If a bundled browser is not already available, install it first with `bunx playwright install chromium ffmpeg`; `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` can use a compatible system Chromium instead.

## Test-data and safety requirements

- Keep E2E local and demo mode by default; its `ADMIN` fixture is stored only in browser localStorage and has no backend privileges.
- Use test-only PGlite or a dedicated staging database for API mutation tests. Never point fixture cleanup, migrations, or destructive tests at production.
- Google/Telegram, Verify.et, AI, webhook, and mail delivery tests must use approved mocks or sandbox credentials. Do not perform purchases or send real broadcast messages during automated QA.
- Do not use production student records, credentials, provider tokens, or email addresses in reports or fixtures.
- Distinguish test-fixture defects from application defects and rerun affected tests after a fix.
