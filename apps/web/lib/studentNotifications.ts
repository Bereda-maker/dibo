import type { State } from "./store";
import { unlocked } from "./analytics";
import { ACHIEVEMENTS } from "./mock";

export type DemoNotification = { id: string; title: string; body: string };

/** Keep demo notification rendering and unread badges derived from the same local records. */
export function demoNotifications(state: State): DemoNotification[] {
  const user = state.user;
  if (!user) return [];

  const hasDiagnostic = state.attempts.some((attempt) => attempt.type === "DIAGNOSTIC");
  return [
    ...(!hasDiagnostic ? [{ id: "diag", title: "Diagnostic assessment available", body: "Find your strong and weak topics." }] : []),
    ...state.attempts.slice(-3).map((attempt) => ({
      id: `res-${attempt.id}`,
      title: "Exam result available",
      body: `${attempt.title}: ${Math.round(attempt.result.percentage)}%`,
    })),
    ...[...unlocked(state)].map((code) => ({
      id: `ach-${code}`,
      title: "Achievement unlocked",
      body: ACHIEVEMENTS.find((achievement) => achievement.code === code)?.name ?? code,
    })),
    { id: "remind", title: "Study reminder", body: "A short 15-minute session today keeps your momentum." },
    {
      id: "sub",
      title: user.plan === "PREMIUM" ? "Premium is active" : "Unlock Premium",
      body: user.plan === "PREMIUM" ? "Thanks for supporting your learning." : "Get the full question bank and mock exams.",
    },
  ];
}

export function demoUnreadNotificationCount(state: State): number {
  const read = new Set(state.readNotifs);
  return demoNotifications(state).filter((notification) => !read.has(notification.id)).length;
}
