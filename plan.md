# Deborah AI Assistant Workspace — Implementation Plan

## Existing application findings

- The product is an established monorepo, not a new prototype: `apps/web` is a Next.js App Router client, `apps/api` is a Hono API, and `packages/database`, `packages/validation`, and `packages/core` own Drizzle/PostgreSQL schema, request validation, and shared business rules.
- `/assistant` currently renders separate live and demo chat implementations. The live page calls owner-scoped `/ai/conversations` and `/ai/messages` endpoints; the demo page stores sample conversations in local storage. Both already use the Deborah logo, shared theme tokens, safe Markdown/KaTeX rendering, and real note/question data for their respective modes.
- The student `AppShell` adds its own sidebar, top bar, and mobile bottom navigation. A chat page inside that shell creates duplicate navigation and limits the conversation reading area.
- Live chat persistence, rename/delete, the free-message limit, authorization, Markdown rendering, and note-source IDs already exist. The provider uses a non-streaming completion call; there is no file-upload or generation-cancellation endpoint. The existing API does not persist chat feedback, saved-chat state, or a distinct regenerate turn, and does not expose saved source metadata on message history.
- The existing visual tokens already provide deep green, gold, warm neutral, light/dark theme support, and an Ethiopic-aware sans-serif stack. The assistant refresh will reuse these tokens and the supplied/committed Deborah mark rather than introducing a new brand or dependencies.

## Implementation approach

1. Turn `/assistant` into a route-specific, full-height focus workspace so the shared student navigation is not duplicated there. Keep all other student routes and the authentication guard unchanged. Compose the workspace from a responsive conversation rail with subject shortcuts, a readable transcript, an educational welcome surface, and a touch-friendly composer.
2. Share the presentation layer between live and demo modes. Keep API/store state in thin mode-specific adapters; keep filtering, mobile drawer state, rename/delete dialogs, prompt suggestions, transcript presentation, keyboard behavior, and accessible control labels in reusable assistant UI components.
3. Reuse the authenticated curriculum APIs for available subjects and topics. Persist the selected subject/topic context with the conversation and pass it to the existing retrieval/prompt path; retrieve and link only published, student-accessible source notes. Show verified source links only when the backend provides them, and distinguish unsourced general explanations without claiming unsupported curriculum alignment.
4. Preserve real owner-scoped conversation operations. Add only the small additive API/schema support needed to make requested feedback, regeneration, and saved conversations functional and persistent. Keep the existing message send contract backward-compatible, enforce the same student ownership and daily limits, and use a forward-only migration with safe defaults. Do not touch authentication, payments, unrelated routes, or external provider credentials.
5. Keep the current non-streaming provider behavior honest: show a pending state and recoverable retry on errors, but do not render a fake streaming indicator, stop button, or attachment control where those capabilities are absent. Retain the transparent local-demo behavior and identify demo sample material as such.

## Project structure and responsibilities

- `apps/web/app/(student)/assistant/page.tsx`: `/assistant` route entry and mode selection.
- `apps/web/components/AppShell.tsx`: authenticated student shell; route-specific focus mode belongs here without changing other student routes.
- `apps/web/features/live/Social.tsx`: live social/notification features; re-export the extracted assistant without changing unrelated exports.
- `apps/web/features/assistant/AssistantWorkspace.tsx`, `AssistantSidebar.tsx`, `AssistantTranscript.tsx`, and `types.ts`: shared, accessible chat presentation, navigation, transcript actions, and typed contracts.
- `apps/web/features/assistant/LiveAssistant.tsx` and `DemoAssistant.tsx`: mode-specific API/store adapters for authenticated production chat and clearly disclosed local demo material.
- `apps/web/lib/session.tsx`, `apps/web/lib/store.tsx`, `apps/web/lib/api.ts`: existing student identity, local demo persistence, and authenticated HTTP client.
- `apps/web/components/ChatMessageContent.tsx`, `components/Logo.tsx`, `components/Controls.tsx`, and `styles/globals.css`: existing safe Markdown/LaTeX renderer, Deborah mark, theme/locale controls, and reusable design tokens.
- `apps/api/src/routes/student.ts`, `services/ai-chat.service.ts`, and `services/ai/ai.service.ts`: student-protected chat endpoints, persistence/ownership, and note retrieval/prompt context.
- `packages/database/src/schema.ts`, `packages/database/migrations`, and `packages/validation/src/index.ts`: the existing Drizzle schema, forward migration, and validated additive request bodies.
- `apps/api/tests/api.e2e.test.ts` and `tests/e2e`: current PGlite integration and Playwright smoke-test locations.

## Design direction

- **Design Movement:** Quiet Academic Modernism expressed through a familiar conversational workspace: calm, focused, and distinctly educational rather than a generic chatbot clone.
- **Core Principles:** Conversation first; trustworthy curriculum context; low-friction keyboard and touch use; functional honesty with no dead or invented controls.
- **Color Philosophy:** Reuse the existing deep forest green for focus and trust, gold for small learning cues, warm cream/neutral surfaces for long reading, and the current dark-theme tokens for comfortable night study. Do not scatter raw color literals through components.
- **Layout Paradigm:** A full-height study studio with a compact collapsible conversation rail and one spacious transcript canvas; on narrow screens the rail becomes a drawer and the composer remains anchored without covering messages.
- **Signature Elements:** The existing Deborah book/star mark; a restrained gold study-context accent; quiet, linked source-note chips beneath sourced answers.
- **Interaction Philosophy:** Clear active states, direct conversation selection, keyboard-first message entry, touch-sized controls, confirmation for destructive deletion, and visible retry/status feedback.
- **Animation:** Subtle 120–180 ms state transitions only; no decorative motion; honor `prefers-reduced-motion` and avoid scroll/resize work beyond the active transcript.
- **Typography System:** Reuse the app's Noto Sans Ethiopic / Inter / system stack. Keep message text comfortably readable, constrain long-form line length, and let code, tables, and equations scroll within their own bounds.
- **Brand Essence:** Deborah is the evidence-aware study partner for Ethiopian secondary students: calm, capable, encouraging. Personality: **clear, grounded, supportive**.
- **Brand Voice:** Speak like a patient tutor, not a marketing bot. Examples: “What would you like to understand today?” and “Here are the notes I used, so you can keep learning.”
- **Wordmark & Logo:** Reuse the existing Deborah wordmark and book/star logo; do not redraw or replace the official mark.
- **Signature Brand Color:** The existing forest green token (`--primary`), supported by the existing gold accent token.

## Goal planner addition

- **Purpose:** Give a student who clicks the social poster a short, honest starting-point planner for an Ethiopian Grade 12 National Examination goal.
- **Route:** Add a public `/goal-planner` App Router page with a four-step client-side flow; the poster remains a static preview, while the page provides the interaction.
- **Steps:** collect stream (Natural or Social); city, region, and exam year; school and school type (Boarding, Private, or Government school); and intended study hours per day.
- **Estimate:** Calculate a transparent, heuristic percentage and projected score range from the supplied inputs. Label it as an estimate rather than a guaranteed result, and show a simple “with Deborah” improvement path for 1, 3, and 6 months.
- **Conversion:** Finish with a prominent “Start free today” link to `/login`, preserving the existing authentication flow. Keep inputs local to the page and do not add a backend or claim official predictive validity.
- **Design:** Use the existing warm cream, deep green, gold, rounded-card language and student photo treatment from the poster; keep one question per view, clear progress, touch-sized choices, and accessible labels/error messages.
