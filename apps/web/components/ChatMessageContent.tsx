import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import katex from "katex";

/** Convert supported TeX delimiters, omit unfinished trailing math during streamed updates,
 * and replace malformed closed equations rather than exposing raw parser syntax. */
export function prepareChatMarkdown(source: string): string {
  let text = source
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, body: string) => `\n\n$$\n${body}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, body: string) => `$${body}$`);

  // A stream can end between the opening and closing delimiter. Drop only the
  // unfinished tail; already completed prose and equations remain renderable.
  let lastOpen = -1;
  const unmatched = (open: string, close: string) => {
    let from = 0;
    let pending = -1;
    while (true) {
      const start = text.indexOf(open, from);
      if (start < 0) break;
      const end = text.indexOf(close, start + open.length);
      if (end < 0) { pending = start; break; }
      pending = -1;
      from = end + close.length;
    }
    return pending;
  };
  for (const [open, close] of [["$$", "$$"], ["\\[", "\\]"], ["\\(", "\\)"]] as const) {
    lastOpen = Math.max(lastOpen, unmatched(open, close));
  }
  // Find unpaired inline dollars without matching the two characters of $$.
  const inlineTokens = [...text.matchAll(/\$\$|\$/g)].filter((m) => m[0] === "$");
  if (inlineTokens.length % 2 === 1) lastOpen = Math.max(lastOpen, inlineTokens.at(-1)!.index!);
  if (lastOpen >= 0) text = text.slice(0, lastOpen).trimEnd();

  // Validate each closed math expression with KaTeX first. Invalid fragments
  // are replaced with a neutral notice so KaTeX never emits raw TeX as error text.
  text = text.replace(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, (match, block: string | undefined, inline: string | undefined) => {
    const expression = block ?? inline ?? "";
    try {
      katex.renderToString(expression, { throwOnError: true, output: "html" });
      return match;
    } catch {
      return block === undefined ? "equation" : "\n\nEquation unavailable.\n\n";
    }
  });
  return text;
}

/** react-markdown does not enable raw HTML, so generated HTML is rendered as text, never executed. */
export function ChatMessageContent({ content }: { content: string }) {
  return (
    <div className="chat-markdown min-w-0 max-w-full break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={{
          h1: ({ children }) => <h1 className="mb-3 mt-4 text-xl font-bold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
          a: ({ href, children }) => <a href={href} className="break-all text-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto"><table className="min-w-full border-collapse text-left text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border border-border px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-2 align-top">{children}</td>,
          pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-lg bg-black/5 p-3 text-xs">{children}</pre>,
          code: ({ children, className }) => <code className={className ?? "rounded bg-black/5 px-1 py-0.5 font-mono text-[0.95em]"}>{children}</code>,
        }}
      >
        {prepareChatMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}
