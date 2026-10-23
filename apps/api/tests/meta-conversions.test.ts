import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { sendMetaLeadEvent } from "../src/services/meta-conversions";

describe("Meta Conversions API Lead sender", () => {
  test("sends only opted-in, hashed contact data with the Lead event shape", async () => {
    let requestUrl = "";
    let requestBody: Record<string, unknown> | undefined;
    const fetchImpl = (async (input: URL | RequestInfo, init?: RequestInit) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
    }) as unknown as typeof fetch;

    const sent = await sendMetaLeadEvent({
      config: { pixelId: "12345", accessToken: "secret-token", graphApiVersion: "v26.0", leadEventSource: "Test contact form" },
      contactId: "contact-uuid",
      email: " Test@Example.com ",
      consent: true,
      fetchImpl,
    });

    expect(sent).toBe(true);
    expect(requestUrl).toContain("/v26.0/12345/events");
    expect(requestUrl).toContain("access_token=secret-token");
    const event = (requestBody?.data as Record<string, unknown>[])[0]!;
    expect(event).toMatchObject({
      event_name: "Lead",
      event_id: "contact-uuid",
      action_source: "system_generated",
      custom_data: { event_source: "crm", lead_event_source: "Test contact form" },
    });
    const userData = event.user_data as { em: string[] };
    expect(userData.em).toEqual([
      createHash("sha256").update("test@example.com", "utf8").digest("hex"),
    ]);
    expect(JSON.stringify(requestBody)).not.toContain("Test@Example.com");
  });

  test("does not send an event without explicit consent or complete credentials", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const base = { contactId: "c1", email: "a@example.com", consent: true, fetchImpl };
    expect(await sendMetaLeadEvent({ ...base, config: { pixelId: "123" } })).toBe(false);
    expect(await sendMetaLeadEvent({ ...base, config: { pixelId: "123", accessToken: "token" }, consent: false })).toBe(false);
    expect(calls).toBe(0);
  });

  test("returns false for Meta API failures without throwing", async () => {
    const result = await sendMetaLeadEvent({
      config: { pixelId: "123", accessToken: "token" },
      contactId: "c1",
      email: "a@example.com",
      consent: true,
      fetchImpl: (async () => new Response("{}", { status: 400 })) as unknown as typeof fetch,
    });
    expect(result).toBe(false);
  });
});
