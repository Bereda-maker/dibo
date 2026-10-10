import { describe, expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatMessageContent, prepareChatMarkdown } from "../components/ChatMessageContent";

const render = (content) => renderToStaticMarkup(React.createElement(ChatMessageContent, { content }));

describe("shared chat message renderer", () => {
  test("renders geography response headings, emphasis, lists, links, and responsive tables", () => {
    const html = render([
      "### Geography: Ethiopia",
      "Ethiopia is a **landlocked** country in the *Horn of Africa*.",
      "- It borders Eritrea.",
      "- It borders Kenya.",
      "Learn more at [Lake Tana](https://example.org/lake-tana).",
      "| River | Source |\n| --- | --- |\n| Blue Nile | Lake Tana |",
    ].join("\n\n"));
    expect(html).toContain("<h3");
    expect(html).toContain("<strong>landlocked</strong>");
    expect(html).toContain("<em>Horn of Africa</em>");
    expect(html).toContain("<ul");
    expect(html).toContain('href="https://example.org/lake-tana"');
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("<table");
    expect(html).not.toContain("### Geography");
  });

  test("renders inline and block LaTeX with KaTeX", () => {
    const html = render("For a quadratic, use $x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$.\n\n\\[x = \\frac{-b}{2a}\\]");
    expect(html).toContain("class=\"katex\"");
    expect(html).toContain("mfrac");
    expect(html).toContain("katex-display");
    const visibleHtml = html.replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/g, "");
    expect(visibleHtml).not.toContain("\\frac{");
    expect(visibleHtml).not.toContain("\\[");
  });

  test("renders Newton's second law explanation and inline equation", () => {
    const html = render("### Newton’s Second Law\n\nThe net force equals mass times acceleration: **$F=ma$**. If mass is constant, doubling force doubles acceleration.");
    expect(html).toContain("<h3");
    expect(html).toContain("Newton’s Second Law");
    expect(html).toContain("<strong>");
    expect(html).toContain("class=\"katex\"");
    expect(html).toContain("doubling force doubles acceleration");
  });

  test("safely handles incomplete streamed math and malformed equations", () => {
    expect(prepareChatMarkdown("A complete sentence.\\[x=\\frac{1}{2}")).toBe("A complete sentence.");
    const html = render("Before $\\frac{1 After it.");
    expect(html).toContain("Before");
    expect(html).not.toContain("\\frac");
    expect(html).not.toContain("$\\frac");
  });

  test("does not execute or render untrusted raw HTML", () => {
    const html = render('<img src=x onerror="alert(1)"> **safe text**');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror=\"");
    expect(html).toContain("&lt;img");
    expect(html).toContain("<strong>safe text</strong>");
  });
});
