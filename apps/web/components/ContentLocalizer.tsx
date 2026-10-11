"use client";

import { useEffect } from "react";
import { useStore } from "../lib/store";
import { useT } from "../lib/i18n";

function localize(root: ParentNode, translate: (key: string) => string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && !parent.closest("script,style,textarea,input,[contenteditable='true']")) nodes.push(node as Text);
  }
  for (const text of nodes) {
    const raw = text.nodeValue ?? "";
    const key = raw.replace(/\s+/g, " ").trim();
    if (!key) continue;
    const translated = translate(key);
    if (translated === key) continue;
    const leading = raw.match(/^\s*/)?.[0] ?? "";
    const trailing = raw.match(/\s*$/)?.[0] ?? "";
    text.nodeValue = `${leading}${translated}${trailing}`;
  }
  root.querySelectorAll<HTMLElement>("[aria-label],[title],input[placeholder],textarea[placeholder]").forEach((element) => {
    for (const attribute of ["aria-label", "title", "placeholder"] as const) {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, translate(value));
    }
  });
}

export function ContentLocalizer() {
  const { state } = useStore();
  const translate = useT();
  useEffect(() => {
    const run = () => localize(document.body, translate);
    run();
    const observer = new MutationObserver(() => run());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [state.settings.locale]);
  return null;
}
