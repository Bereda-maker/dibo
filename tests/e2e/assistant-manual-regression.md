# Deborah AI Assistant — Manual Regression Checklist

Run this checklist against the latest deployed frontend and a test student account before release. Use real published curriculum material and a non-sensitive question; never paste credentials or private student details into the chat.

## Viewports and devices

- [ ] Desktop: Windows or macOS browser at 1440×900; repeat at 1280×720.
- [ ] Tablet: iPad/Android tablet at 768×1024; repeat in landscape at 1024×768.
- [ ] Phone: iPhone/Android at 390×844; repeat at 320×700 and in landscape.
- [ ] Desktop browser zoom: 200%; verify the composer and navigation remain operable.

## Workspace and navigation

- [ ] Sign in as a student and open **AI Assistant** from the existing student navigation.
- [ ] Confirm the assistant fills the available viewport without a duplicate student sidebar/header or bottom tab bar; verify the Deborah logo and title.
- [ ] On desktop, collapse and expand the sidebar. Confirm active conversation states, New Conversation, title search, date groups, subject-study links, Short Notes, Exam Practice, Saved Conversations, profile/settings, subscription, and sign-out are accessible.
- [ ] Create several conversations and verify selecting, renaming, saving, searching, and deleting work; deletion asks for confirmation.
- [ ] Confirm saved conversation filters show saved chats and regular history can be restored afterward.
- [ ] On phone/tablet, open the navigation drawer, dismiss it with the close button and Escape, select a conversation, and confirm the drawer closes. Check focus visibility and that the drawer does not cover the app name or overflow horizontally.

## Context, transcript, and learning actions

- [ ] Confirm grade/stream shown in the header match the signed-in student's profile.
- [ ] Switch between **All available subjects**, a subject, and a published topic. Verify topic choices update, and a new chat can start without losing its context.
- [ ] Open a conversation linked from a topic/notes page and confirm the topic context is retained.
- [ ] Ask a short relevant curriculum question. Confirm the real reply renders safely, with readable headings, lists, equations, tables, and code when present.
- [ ] Verify source links appear only when the API returns actual sources; open a source and return to the chat.
- [ ] Check copy, save/unsave answer, helpful/not-helpful feedback, and regenerate. Confirm regeneration adds an alternate response rather than erasing prior messages.
- [ ] Submit a question, then simulate an unavailable provider/network failure. Confirm the draft is preserved, a useful message appears, and retry is possible.
- [ ] Verify daily-limit handling and plan links when applicable. Do not attempt to bypass limits.
- [ ] Confirm privacy notice is visible; user prompt, feedback, saved answers, and conversations remain scoped to the signed-in owner.

## Accessibility, responsive layout, and regression

- [ ] Navigate with keyboard only: Tab/Shift+Tab, Enter, Space, and Escape. Confirm focus is visible and dialogs/menus can be dismissed.
- [ ] Use a screen reader or accessibility tree to verify page landmarks, labels, composer instructions, button names, loading/status announcements, and dialog labels.
- [ ] Confirm reduced-motion preference disables decorative motion while retaining usable state changes.
- [ ] Check long messages, mobile code/equations/tables, dropdowns, menus, modals, and safe-area insets for clipping; `documentElement.scrollWidth` must not exceed the viewport width.
- [ ] Toggle light and dark themes and available locales; confirm the conversation remains readable.
- [ ] In demo mode, verify the sample-data disclosure is visible and the assistant never presents a canned sample note as a live AI answer.
- [ ] Revisit dashboard, exams, practice, notes, bookmarks, notifications, profile, pricing/payment return, and admin routes to confirm the assistant focus mode did not alter them.

## Intentional capability boundaries

- Live provider calls are non-streaming; a pending/thinking state is expected, but no streaming or Stop control should be implied.
- File attachments are not implemented; no upload control should appear.
- A demo-mode explanation is derived only from the local published sample notes/questions, is labelled as demo content, and must say when no matching sample material exists.
