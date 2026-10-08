/** Single source of truth for feature gating. Plans store their entitlements as JSON (admin-configurable). */
export type Entitlements = Partial<{
  questionsPerDay: number; mockExams: boolean; advancedAnalytics: boolean; personalizedRecommendations: boolean;
  aiMessagesPerDay: number; fullQuestionBank: boolean; premiumNotes: boolean;
}>;
export type Feature = keyof Entitlements;

export const DEFAULT_FREE: Entitlements = { questionsPerDay: 20, mockExams: false, advancedAnalytics: false, personalizedRecommendations: false, aiMessagesPerDay: 5, fullQuestionBank: false, premiumNotes: false };

export type SubscriptionView = { status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING"; endsAt: Date | null; entitlements: Entitlements } | null;

export function resolveEntitlements(sub: SubscriptionView, now = new Date(), free: Entitlements = DEFAULT_FREE): Entitlements {
  if (sub && sub.status === "ACTIVE" && (!sub.endsAt || sub.endsAt > now)) return sub.entitlements;
  return free;
}
export const can = (e: Entitlements, f: Feature) => Boolean(e[f]);
export const limitFor = (e: Entitlements, f: Feature) => (typeof e[f] === "number" ? (e[f] as number) : null);
export function withinDailyLimit(e: Entitlements, f: "questionsPerDay" | "aiMessagesPerDay", usedToday: number) {
  const l = limitFor(e, f);
  return l === null ? true : usedToday < l;
}
