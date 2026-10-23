import { createHash } from "node:crypto";

export interface MetaLeadConfig {
  pixelId?: string;
  accessToken?: string;
  graphApiVersion?: string;
  leadEventSource?: string;
  testEventCode?: string;
}

/** Send a privacy-minimized Lead event after a contact message is saved. */
export async function sendMetaLeadEvent(input: {
  config: MetaLeadConfig;
  contactId: string;
  email: string;
  consent: boolean;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const { config } = input;
  if (!input.consent || !config.pixelId || !config.accessToken) return false;

  const emailHash = createHash("sha256")
    .update(input.email.trim().toLowerCase(), "utf8")
    .digest("hex");
  const endpoint = new URL(
    `https://graph.facebook.com/${config.graphApiVersion ?? "v26.0"}/${encodeURIComponent(config.pixelId)}/events`,
  );
  endpoint.searchParams.set("access_token", config.accessToken);
  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.contactId,
    action_source: "system_generated",
    user_data: { em: [emailHash] },
    custom_data: {
      event_source: "crm",
      lead_event_source: config.leadEventSource ?? "Dibora contact form",
    },
  };

  try {
    const response = await (input.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: [event],
        ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      // Do not log the request URL, token, email, or Meta response body.
      console.error(JSON.stringify({ level: "warn", msg: "Meta CAPI lead event rejected", status: response.status }));
      return false;
    }
    return true;
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", msg: "Meta CAPI lead event failed", kind: error instanceof Error ? error.name : "UNKNOWN" }));
    return false;
  }
}
