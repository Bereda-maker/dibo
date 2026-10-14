import { ApiError } from "../../lib/api";

export type AuthProvider = "Google" | "Telegram";
export type AuthStage = "provider-discovery" | "provider-callback" | "session";

export function isTelegramWebView(userAgent: string): boolean {
  return /Telegram/i.test(userAgent);
}

/** Telegram on iOS can use the same user-agent as Safari, so detect iOS for an explicit browser-choice gate instead. */
export function isIOSBrowser(userAgent: string, platform = "", maxTouchPoints = 0): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function providerDiscoveryError(cause: unknown): string {
  if (cause instanceof ApiError && cause.status === 0) {
    return "Deborah’s sign-in service could not be reached. Check your connection and try again.";
  }
  return "Deborah could not load sign-in options from its server. Try again, or come back later.";
}

export function authFailureMessage(provider: AuthProvider, stage: AuthStage, cause: unknown): string {
  if (stage === "session") {
    return "Your provider sign-in succeeded, but Deborah could not restore your session. Please try signing in again.";
  }
  if (cause instanceof ApiError && cause.status === 429) {
    return "Too many attempts. Please wait a minute, then try again.";
  }
  if (cause instanceof ApiError && cause.status === 0) {
    return `Deborah’s server could not be reached to complete ${provider} sign-in. Check your connection and try again.`;
  }
  if (cause instanceof ApiError && (cause.status === 400 || cause.status === 401)) {
    return `${provider} could not verify this sign-in response. Please try again.`;
  }
  if (cause instanceof ApiError && cause.status >= 500) {
    return `${provider} sign-in is temporarily unavailable. Please try again later.`;
  }
  return `${provider} sign-in could not be completed. Please try again.`;
}

export function isProviderCancellation(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const error = (value as { error?: unknown }).error;
  return typeof error === "string" && /cancel|denied|closed/i.test(error);
}
