"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight, BookOpen, Check, Copy, Lightbulb, Loader2, MessageCircleQuestion,
  RotateCcw, Sparkles, ThumbsDown, ThumbsUp, Bookmark, BookmarkCheck,
} from "lucide-react";
import { ChatMessageContent } from "../../components/ChatMessageContent";
import { Skeleton, cx } from "../../components/ui";
import { useT } from "../../lib/i18n";
import type { AssistantMessage } from "./types";

type Props = {
  messages: AssistantMessage[];
  loading?: boolean;
  sending?: boolean;
  displayName: string;
  grade: number | null;
  subjectLabel?: string | null;
  topicLabel?: string | null;
  demoMode?: boolean;
  onUsePrompt: (prompt: string) => void;
  onCopy: (content: string) => Promise<void>;
  onFeedback: (id: string, feedback: "HELPFUL" | "NOT_HELPFUL") => Promise<void>;
  onSave: (id: string, saved: boolean) => Promise<void>;
  onRegenerate: () => void;
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase() || "S";
}

export function AssistantTranscript(props: Props) {
  const t = useT();
  const messages = props.messages.filter((message) => !(message.role === "user" && message.isRegeneration));
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const sourceItems = (message: AssistantMessage) => message.sourceDetails ?? (message.sources ?? []).map((id, index) => ({ id, title: `Study note ${index + 1}` }));
  const focus = props.topicLabel || props.subjectLabel || (props.grade ? `Grade ${props.grade}` : "your studies");
  const target = props.topicLabel || props.subjectLabel || "this topic";
  const suggestions = [
    { title: "Explain a concept", icon: Lightbulb, prompt: `Explain ${target} in simple words, then give me a short example.` },
    { title: "Teach me step by step", icon: Sparkles, prompt: `Teach me ${target} step by step. Pause after each step and check that I understand.` },
    { title: "Give me a hint", icon: MessageCircleQuestion, prompt: `Give me one useful hint for studying ${target}, then explain why it helps.` },
    { title: "Quiz me", icon: BookOpen, prompt: `Quiz me on ${target} with one question at a time. Wait for my answer before explaining.` },
  ];
  const quickPrompts = [
    { title: "Check my understanding", prompt: `Ask me one short question to check my understanding of ${target}. Wait for my answer before giving feedback.` },
    { title: "Exam-style practice", prompt: `Give me one exam-style practice question about ${target}. Wait for my answer, then explain the solution.` },
    { title: "Summarize key ideas", prompt: `Summarize the most important ideas about ${target} in a short revision list, with one example.` },
    { title: "Explain a wrong answer", prompt: `I got a question about ${target} wrong. Help me find my misconception and explain how to reach the correct answer. I will paste the question and my answer next.` },
    ...(props.grade === 12 ? [{ title: "Grade 12 entrance prep", prompt: `Help me prepare for the Grade 12 entrance exam. Give me one focused practice question about ${target} and wait for my answer.` }] : []),
  ];

  if (props.loading && !messages.length) return <div aria-busy="true" aria-label={t("Loading conversation")} className="mx-auto max-w-3xl space-y-6 px-3 py-8"><Skeleton className="h-24 w-4/5" /><Skeleton className="ml-auto h-16 w-2/3" /><Skeleton className="h-32 w-5/6" /></div>;

  if (!messages.length) return <div className="mx-auto flex w-full max-w-3xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
    <div className="mb-7 flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent/30 bg-white p-1.5 shadow-sm"><Image src="/images/dibora-logo.png" alt="" aria-hidden width={48} height={48} className="h-full w-full object-contain" /></span>
      <div><p className="text-sm font-semibold text-primary">{t("Deborah Study Assistant")}</p><p className="text-xs text-muted">{props.grade ? `${t("Grade")} ${props.grade}` : t("Personal study workspace")} · {focus}</p></div>
    </div>
    <h1 className="max-w-2xl text-balance text-3xl font-bold tracking-tight text-text sm:text-4xl">{t("What would you like to understand today?")}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{t("Ask for a clear explanation, a worked example, or a small practice check. Deborah can use published study notes when they match your selected subject and topic.")}</p>
    {props.demoMode && <p className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-text"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden />{t("Demo mode uses sample study notes; live AI responses are not enabled.")}</p>}
    <div className="mt-8 grid gap-3 sm:grid-cols-2">{suggestions.map(({ title, icon: Icon, prompt }) => <button key={title} type="button" onClick={() => props.onUsePrompt(prompt)} className="group flex min-h-[76px] items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={17} aria-hidden /></span><span className="min-w-0"><span className="block font-semibold text-text">{t(title)}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{t("Tap to start a new question")}</span></span><ArrowUpRight size={15} aria-hidden className="ml-auto mt-1 shrink-0 text-muted transition group-hover:text-primary" /></button>)}</div>
    <div className="mt-4 flex flex-wrap gap-2" aria-label={t("More study prompts")}>{quickPrompts.map(({ title, prompt }) => <button key={title} type="button" onClick={() => props.onUsePrompt(prompt)} className="min-h-10 rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t(title)}</button>)}</div>
    <div className="mt-8 flex flex-wrap gap-2 text-xs text-muted">
      <Link href="/notes" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 transition hover:border-primary/30 hover:text-primary"><BookOpen size={14} aria-hidden />{t("Browse short notes")}</Link>
      <Link href="/practice" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 transition hover:border-primary/30 hover:text-primary"><Sparkles size={14} aria-hidden />{t("Practice questions")}</Link>
      <Link href="/exams" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 transition hover:border-primary/30 hover:text-primary"><ArrowUpRight size={14} aria-hidden />{t("Exam practice")}</Link>
    </div>
  </div>;

  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-3 py-6 sm:gap-9 sm:px-6 sm:py-8" aria-live="polite">
    {messages.map((message) => <article key={message.id} className={cx("flex min-w-0 gap-3", message.role === "user" && "justify-end")}>
      {message.role === "assistant" && <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/25 bg-white p-1"><Image src="/images/dibora-logo.png" alt="" aria-hidden width={36} height={36} className="h-full w-full object-contain" /></span>}
      <div className={cx("min-w-0", message.role === "user" ? "max-w-[88%] sm:max-w-[80%]" : "max-w-[calc(100%-3rem)] flex-1")}>
        {message.role === "assistant" && <div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-primary">{t("Deborah")}</span>{message.isRegeneration && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-text">{t("Alternative response")}</span>}</div>}
        <div className={cx("min-w-0 break-words", message.role === "user" ? "rounded-3xl rounded-br-md bg-primary px-4 py-3 text-white shadow-sm" : "rounded-2xl border border-border bg-surface px-4 py-3 text-text shadow-sm sm:px-5")}>
          {message.role === "assistant" ? <ChatMessageContent content={message.content} /> : <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>}
        </div>
        {message.role === "assistant" && <>
          {sourceItems(message).length ? <div className="mt-3 rounded-2xl border border-border/80 bg-surface/80 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-text"><BookOpen size={14} aria-hidden className="text-primary" />{t("Relevant Deborah notes")}</div>
            <div className="flex flex-wrap gap-2">{sourceItems(message).map((source) => <Link key={`${message.id}-${source.id}`} href={`/notes/${encodeURIComponent(source.id)}`} className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-border px-3 text-xs text-primary transition hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="truncate">{source.title}</span><ArrowUpRight size={12} aria-hidden /></Link>)}</div>
          </div> : <p className="mt-2 text-[11px] text-muted">{t("General explanation — no published Deborah note was retrieved for this answer.")}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1 text-muted">
            <button type="button" onClick={() => void props.onCopy(message.content)} aria-label={t("Copy answer")} title={t("Copy answer")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs transition hover:bg-border/50 hover:text-text focus-visible:ring-2 focus-visible:ring-primary"><Copy size={14} aria-hidden /><span className="sr-only">{t("Copy")}</span></button>
            <button type="button" onClick={() => void props.onSave(message.id, !message.isSaved)} aria-label={message.isSaved ? t("Remove saved answer") : t("Save answer")} aria-pressed={!!message.isSaved} title={message.isSaved ? t("Saved") : t("Save answer")} className={cx("inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs transition hover:bg-border/50 hover:text-text focus-visible:ring-2 focus-visible:ring-primary", message.isSaved && "text-primary")}>
              {message.isSaved ? <BookmarkCheck size={14} aria-hidden /> : <Bookmark size={14} aria-hidden />}<span className="sr-only">{message.isSaved ? t("Saved") : t("Save answer")}</span>
            </button>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <button type="button" onClick={() => void props.onFeedback(message.id, "HELPFUL")} aria-label={t("Mark answer helpful")} aria-pressed={message.feedback === "HELPFUL"} title={t("Helpful")} className={cx("grid min-h-9 min-w-9 place-items-center rounded-lg transition hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary", message.feedback === "HELPFUL" && "bg-primary/10 text-primary")}><ThumbsUp size={14} aria-hidden /></button>
            <button type="button" onClick={() => void props.onFeedback(message.id, "NOT_HELPFUL")} aria-label={t("Mark answer not helpful")} aria-pressed={message.feedback === "NOT_HELPFUL"} title={t("Not helpful")} className={cx("grid min-h-9 min-w-9 place-items-center rounded-lg transition hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary", message.feedback === "NOT_HELPFUL" && "bg-error/10 text-error")}><ThumbsDown size={14} aria-hidden /></button>
            {message.id === lastAssistantId && <button type="button" onClick={props.onRegenerate} disabled={props.sending} aria-label={t("Generate another answer")} title={t("Generate another answer")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs transition hover:bg-border/50 hover:text-text focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><RotateCcw size={14} aria-hidden /><span className="hidden sm:inline">{t("Try another answer")}</span></button>}
          </div>
        </>}
      </div>
      {message.role === "user" && <span aria-label={t("You")} className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{initials(props.displayName)}</span>}
    </article>)}
    {props.sending && <div role="status" aria-live="polite" className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/25 bg-white p-1"><Image src="/images/dibora-logo.png" alt="" aria-hidden width={36} height={36} className="h-full w-full object-contain" /></span><div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted"><span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden />{t("Thinking through your question…")}</span></div></div>}
  </div>;
}
