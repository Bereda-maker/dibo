import { AppError } from "../../utils/errors";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export interface AIProvider { complete(messages: ChatMessage[], opts?: { maxTokens?: number; temperature?: number }): Promise<{ text: string; tokens?: number }>; }
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/** Works with OpenAI-compatible chat-completions endpoints (configured via env). */
export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    private cfg: { baseUrl: string; apiKey: string; model: string },
    private fetcher: Fetcher = (input, init) => globalThis.fetch(input, init),
  ) {}

  async complete(messages: ChatMessage[], opts: { maxTokens?: number; temperature?: number } = {}) {
    const reasoningModel = /^(?:gpt-(?:5|6)|o[1-4])(?:[.-]|$)/i.test(this.cfg.model);
    const params = reasoningModel
      ? { max_completion_tokens: opts.maxTokens ?? 900, reasoning_effort: "low" }
      : { max_tokens: opts.maxTokens ?? 700, temperature: opts.temperature ?? 0.3 };
    const isOfficialOpenAI = new URL(this.cfg.baseUrl).hostname === "api.openai.com";
    let res: Response;

    try {
      res = await this.fetcher(`${this.cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
        body: JSON.stringify({ model: this.cfg.model, messages, ...params, ...(isOfficialOpenAI ? { store: false } : {}) }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new AppError(503, "AI_PROVIDER_UNAVAILABLE", "The Study Assistant is temporarily unavailable. Please try again shortly.");
    }

    if (!res.ok) {
      throw new AppError(503, "AI_PROVIDER_ERROR", "The Study Assistant is temporarily unavailable. Please try again shortly.");
    }

    let result: { choices?: { message?: { content?: unknown } }[]; usage?: { total_tokens?: number } };
    try {
      result = await res.json() as typeof result;
    } catch {
      throw new AppError(503, "AI_PROVIDER_ERROR", "The Study Assistant is temporarily unavailable. Please try again shortly.");
    }

    const text = result.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      throw new AppError(503, "AI_PROVIDER_ERROR", "The Study Assistant is temporarily unavailable. Please try again shortly.");
    }
    return { text, tokens: result.usage?.total_tokens };
  }
}
