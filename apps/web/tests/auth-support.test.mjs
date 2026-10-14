import { describe, expect, test } from "bun:test";
import { ApiError } from "../lib/api";
import { authFailureMessage, isProviderCancellation, isTelegramWebView, providerDiscoveryError } from "../features/live/auth-support";

describe("social auth recovery messaging", () => {
  test("explains a network-level provider-discovery outage and offers neutral API wording", () => {
    expect(providerDiscoveryError(new ApiError(0, "NETWORK", "offline"))).toContain("sign-in service could not be reached");
    expect(providerDiscoveryError(new ApiError(503, "UNAVAILABLE", "down"))).toContain("sign-in options from its server");
  });

  test("distinguishes unavailable APIs, invalid callbacks, and session failures for both providers", () => {
    for (const provider of ["Google", "Telegram"]) {
      expect(authFailureMessage(provider, "provider-callback", new ApiError(0, "NETWORK", "offline"))).toContain("server could not be reached");
      expect(authFailureMessage(provider, "provider-callback", new ApiError(401, "INVALID_SOCIAL_LOGIN", "invalid"))).toContain("could not verify this sign-in response");
      expect(authFailureMessage(provider, "session", new Error("session refresh failed"))).toContain("could not restore your session");
    }
  });

  test("treats explicit provider cancellation as cancellation rather than a network failure", () => {
    expect(isProviderCancellation({ error: "access_denied" })).toBe(true);
    expect(isProviderCancellation({ error: "popup closed by user" })).toBe(true);
    expect(isProviderCancellation({ id: 123, hash: "signed" })).toBe(false);
  });

  test("identifies Telegram's embedded browser to avoid starting Google sign-in there", () => {
    expect(isTelegramWebView("Mozilla/5.0 (iPhone) Telegram-iOS/11.0")).toBe(true);
    expect(isTelegramWebView("Mozilla/5.0 (iPhone) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
  });
});
