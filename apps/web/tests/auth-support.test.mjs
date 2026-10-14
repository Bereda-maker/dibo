import { describe, expect, test } from "bun:test";
import { ApiError } from "../lib/api";
import { authFailureMessage, isIOSBrowser, isProviderCancellation, isTelegramWebView, providerDiscoveryError } from "../features/live/auth-support";

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

  test("gates Google behind Safari confirmation on iOS when Telegram uses a Safari-like user agent", () => {
    const iosSafariLike = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(isTelegramWebView(iosSafariLike)).toBe(false);
    expect(isIOSBrowser(iosSafariLike)).toBe(true);
    expect(isIOSBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15")).toBe(false);
  });

  test("recognizes iPadOS desktop-mode Safari using touch points", () => {
    expect(isIOSBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5)).toBe(true);
  });
});
