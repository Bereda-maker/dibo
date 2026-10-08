export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export interface AIProvider { complete(messages: ChatMessage[], opts?: { maxTokens?: number; temperature?: number }): Promise<{ text: string; tokens?: number }>; }

/** Works with any OpenAI-compatible chat-completions endpoint (configured via env). */
export class OpenAICompatibleProvider implements AIProvider {
  constructor(private cfg: { baseUrl: string; apiKey: string; model: string }) {}
  async complete(messages: ChatMessage[], opts: { maxTokens?: number; temperature?: number } = {}) {
    const res = await fetch(`${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({ model: this.cfg.model, messages, max_tokens: opts.maxTokens ?? 700, temperature: opts.temperature ?? 0.3 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`AI provider error ${res.status}`); // body intentionally not forwarded
    const j = (await res.json()) as { choices: { message: { content: string } }[]; usage?: { total_tokens?: number } };
    return { text: j.choices[0]?.message.content ?? "", tokens: j.usage?.total_tokens };
  }
}
