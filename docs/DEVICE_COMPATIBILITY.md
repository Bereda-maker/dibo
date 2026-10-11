# Dibora Device and Browser Compatibility Matrix

**Repository:** `Bereda-maker/dibo`  
**Rule:** A viewport profile is browser emulation, not proof of a physical device or operating-system/browser combination. Update this matrix only from recorded test runs.

## Executed in the current QA pass

| Coverage | Environment | Evidence | Result |
|---|---|---|---|
| Chromium | Local system Chromium launched by Playwright | `bun run test:e2e` | 15/15 smoke tests passed (route/navigation and responsive suite) |
| Responsive widths | Chromium viewport emulation at 320, 360, 390, 414, 600, 768, 820, 1024, 1280, 1440, 1920 px | Document/body scroll-width assertions on Dibora homepage; mobile admin drawer navigation at 375 px | Passed in the executed suite; emulation only |
| Public routes | Chromium against local Next.js with `NEXT_PUBLIC_DEMO_MODE=true` | Direct navigation of existing pages and legacy auth URLs | Passed; does not exercise live provider sign-in or backend persistence |
| Admin route navigation | Chromium at 375 × 812 with a browser-local demo `ADMIN` fixture | Open drawer → Question bank | Passed; fixture is local demo data, not a real admin session |

Record exact Chromium/Playwright versions from the final run if version-level compatibility is required. No physical-device claims are made by these tests.

## Not tested in this environment

| Device/browser class | Status | Additional requirement |
|---|---|---|
| iPhone/iOS Safari, keyboard, orientation, real cookies | **NOT TESTED** | Physical iPhone or authorized device cloud; live API origin and approved test account for session tests |
| iPhone Chrome | **NOT TESTED** | Physical iPhone/device cloud; iOS Chrome still uses WebKit |
| iPad Safari/Chrome, portrait/landscape | **NOT TESTED** | Physical iPad or device cloud |
| Android Chrome and Samsung Internet | **NOT TESTED** | Physical Android device or device cloud |
| Telegram in-app browser and external-browser handoff | **NOT TESTED** | Real Telegram client/device and a configured test bot/domain; Playwright does not prove native handoff |
| Windows 10/11: Chrome, Edge, Firefox, varied DPI/zoom | **NOT TESTED** | Windows machines or device cloud |
| macOS Safari/Chrome/Firefox | **NOT TESTED** | macOS machines or device cloud |
| Linux Firefox | **NOT TESTED** | Installed Firefox engine; run the optional cross-browser project |
| Firefox and WebKit browser automation | **NOT TESTED** | Install Playwright Firefox and WebKit browser binaries, then run `PLAYWRIGHT_CROSS_BROWSER=1 bun run test:e2e` |
| Screen-reader and assistive-technology scenarios | **NOT TESTED** | Manual assistive technology testing; automated browser smoke does not substitute |

## Interpretation

- Chromium viewport resizing detects some overflow/layout regressions; it does not reproduce mobile browser chrome, soft keyboards, safe-area behavior, device pixels, OS fonts, or native share/auth handoff.
- The executed E2E server intentionally uses demo mode to avoid mutating a live backend. Real social sign-in, live API cookies, student database records, payment submissions, provider webhooks, and live AI behavior require a separate authorized staging setup.
- Do not change `NOT TESTED` to `PASS` because a CI job passed on Chromium or because screenshots appear similar.
