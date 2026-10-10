import { describe, expect, test } from "bun:test";
import { OpenAICompatibleProvider } from "../src/services/ai/provider";

describe("OpenAI-compatible AI provider", () => {
  test("uses GPT-6 Chat Completions parameters and disables OpenAI storage", async () => {
    let requestUrl = "";
    let request: RequestInit | undefined;
    const provider = new OpenAICompatibleProvider(
      { baseUrl: "https://api.openai.com/v1/", apiKey: "test-key", model: "gpt-6-luna" },
      async (url, init) => {
        requestUrl = String(url);
        request = init;
        return new Response(JSON.stringify({ choices: [{ message: { content: "Let's review Newton's second law." } }], usage: { total_tokens: 42 } }), { status: 200, headers: { "content-type": "application/json" } });
      },
    );

    const result = await provider.complete([{ role: "user", content: "Explain F = ma" }]);
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(requestUrl).toBe("https://api.openai.com/v1/chat/completions");
    expect((request?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(body).toMatchObject({ model: "gpt-6-luna", max_completion_tokens: 900, reasoning_effort: "low", store: false });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("max_tokens");
    expect(result).toEqual({ text: "Let's review Newton's second law.", tokens: 42 });
  });

  test("hides the provider response body when the upstream API rejects a request", async () => {
    const provider = new OpenAICompatibleProvider(
      { baseUrl: "https://api.openai.com/v1", apiKey: "test-key", model: "gpt-6-luna" },
      async () => new Response("sensitive provider details", { status: 401 }),
    );
    let failure: unknown;
    try {
      await provider.complete([]);
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ status: 503, code: "AI_PROVIDER_ERROR" });
    expect((failure as Error).message).not.toContain("sensitive provider details");
  });

  test("keeps sampling parameters for a non-reasoning OpenAI model", async () => {
    let request: RequestInit | undefined;
    const provider = new OpenAICompatibleProvider(
      { baseUrl: "https://api.openai.com/v1", apiKey: "test-key", model: "gpt-4o-mini" },
      async (_url, init) => {
        request = init;
        return new Response(JSON.stringify({ choices: [{ message: { content: "Answer" } }] }), { status: 200 });
      },
    );
    await provider.complete([{ role: "user", content: "Hello" }]);
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ max_tokens: 700, temperature: 0.3, store: false });
    expect(body).not.toHaveProperty("reasoning_effort");
  });
});
