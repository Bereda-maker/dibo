"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, Menu, Plus, Send, Sparkles } from "lucide-react";
import { LocaleSwitch, ThemeToggle } from "../../components/Controls";
import { useT } from "../../lib/i18n";
import { Button, cx } from "../../components/ui";
import { AssistantSidebar } from "./AssistantSidebar";
import { AssistantTranscript } from "./AssistantTranscript";
import type { AssistantWorkspaceProps } from "./types";

export function AssistantWorkspace(props: AssistantWorkspaceProps) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeConversation = props.conversations.find((conversation) => conversation.id === props.activeConversationId);
  const subjectLabel = props.subjectOptions.find((subject) => subject.id === props.selectedSubjectId)?.label ?? null;
  const topicLabel = props.topicOptions.find((topic) => topic.id === props.selectedTopicId)?.label ?? props.initialTopicName ?? null;
  const isBusy = !!props.sending || !!props.messagesLoading;
  const canSend = draft.trim().length > 0 && !isBusy && !props.dailyLimitReached;
  const assistantHeaderTitle = activeConversation?.title || t("New conversation");

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [props.messages.length, props.sending, props.messagesLoading, props.activeConversationId]);

  useEffect(() => {
    if (drawerOpen) {
      const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawerOpen(false); };
      document.addEventListener("keydown", closeOnEscape);
      return () => document.removeEventListener("keydown", closeOnEscape);
    }
  }, [drawerOpen]);

  const topicsHint = useMemo(() => {
    if (props.selectedTopicId && topicLabel) return `${t("Topic")}: ${topicLabel}`;
    if (subjectLabel) return `${t("Subject")}: ${subjectLabel}`;
    if (props.initialTopicName) return `${t("Linked topic")}: ${props.initialTopicName}`;
    return props.grade ? `${t("Grade")} ${props.grade}` : t("Choose a subject to focus your study chat");
  }, [props.selectedTopicId, topicLabel, subjectLabel, props.initialTopicName, props.grade, t]);

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || !canSend) return;
    const sent = await props.onSend(message);
    if (sent) {
      setDraft("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleSubmit();
    }
  };
  const handleNew = () => {
    setDraft("");
    setDrawerOpen(false);
    props.onNewConversation();
  };
  const handleSelect = (id: string | null) => {
    setDraft("");
    setDrawerOpen(false);
    props.onSelectConversation(id);
  };
  const choosePrompt = (prompt: string) => {
    setDraft(prompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return <div className="flex h-dvh min-h-[500px] w-full overflow-hidden bg-bg text-text">
    <AssistantSidebar
      conversations={props.conversations}
      activeConversationId={props.activeConversationId}
      loading={props.conversationsLoading}
      error={props.conversationsError}
      savedOnly={props.savedOnly}
      collapsed={collapsed}
      displayName={props.displayName}
      grade={props.grade}
      planLabel={props.planLabel}
      subjectOptions={props.subjectOptions}
      selectedSubjectId={props.selectedSubjectId}
      onSubjectChange={props.onSubjectChange}
      onToggleCollapse={() => setCollapsed((value) => !value)}
      onRetry={props.onRetryConversations}
      onSavedOnlyChange={props.onSavedOnlyChange}
      onNewConversation={handleNew}
      onSelectConversation={handleSelect}
      onSaveConversation={props.onSaveConversation}
      onRename={props.onRename}
      onDelete={props.onDelete}
      onLogout={props.onLogout}
    />
    <AssistantSidebar
      mobile
      mobileOpen={drawerOpen}
      conversations={props.conversations}
      activeConversationId={props.activeConversationId}
      loading={props.conversationsLoading}
      error={props.conversationsError}
      savedOnly={props.savedOnly}
      displayName={props.displayName}
      grade={props.grade}
      planLabel={props.planLabel}
      subjectOptions={props.subjectOptions}
      selectedSubjectId={props.selectedSubjectId}
      onSubjectChange={props.onSubjectChange}
      onClose={() => setDrawerOpen(false)}
      onRetry={props.onRetryConversations}
      onSavedOnlyChange={props.onSavedOnlyChange}
      onNewConversation={handleNew}
      onSelectConversation={handleSelect}
      onSaveConversation={props.onSaveConversation}
      onRename={props.onRename}
      onDelete={props.onDelete}
      onLogout={props.onLogout}
    />

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="z-20 flex min-h-[68px] shrink-0 items-center gap-2 border-b border-border bg-bg/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-5">
        <button type="button" onClick={() => setDrawerOpen(true)} aria-label={t("Open assistant navigation")} className="grid min-h-10 min-w-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"><Menu size={19} aria-hidden /></button>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate text-sm font-bold sm:text-base">{assistantHeaderTitle}</h1>
            {activeConversation?.isSaved && <span className="hidden shrink-0 rounded-full bg-accent/15 px-2 py-1 text-[10px] font-semibold text-text sm:inline-flex">{t("Saved")}</span>}
          </div>
          <p className="truncate text-[11px] text-muted">{props.grade ? `${t("Grade")} ${props.grade}` : t("Study workspace")} · {topicsHint}</p>
        </div>
        <Button variant="ghost" onClick={handleNew} className="hidden min-h-10 px-3 sm:inline-flex" aria-label={t("New conversation")}><Plus size={16} aria-hidden /><span className="hidden md:inline">{t("New conversation")}</span></Button>
        <Link href="/notifications" aria-label={t("Notifications")} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-muted transition hover:bg-border/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Bell size={18} aria-hidden /></Link>
        <div className="flex shrink-0 items-center gap-0.5"><LocaleSwitch /><ThemeToggle /></div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/70 bg-surface/60 px-3 py-2.5 sm:px-5">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted"><Sparkles size={13} aria-hidden />{t("Study context")}</span>
          <label className="sr-only" htmlFor="assistant-subject">{t("Subject")}</label>
          <div className="relative max-w-full">
            <select id="assistant-subject" value={props.selectedSubjectId ?? ""} disabled={isBusy} onChange={(event) => props.onSubjectChange(event.target.value || null)} className="min-h-10 max-w-[min(45vw,220px)] appearance-none rounded-xl border border-border bg-surface py-2 pl-3 pr-8 text-xs font-medium text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60">
              <option value="">{t("All available subjects")}</option>
              {props.subjectOptions.map((subject) => <option key={subject.id} value={subject.id}>{subject.label}{subject.grade ? ` · G${subject.grade}` : ""}</option>)}
            </select><ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <label className="sr-only" htmlFor="assistant-topic">{t("Topic")}</label>
          <div className="relative max-w-full">
            <select id="assistant-topic" value={props.selectedTopicId ?? ""} disabled={isBusy || !props.selectedSubjectId || !props.topicOptions.length} onChange={(event) => props.onTopicChange(event.target.value || null)} className="min-h-10 max-w-[min(45vw,260px)] appearance-none rounded-xl border border-border bg-surface py-2 pl-3 pr-8 text-xs font-medium text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60">
              <option value="">{props.selectedSubjectId ? t("Any topic") : t("Select a subject first")}</option>
              {props.topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}
            </select><ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <span className="ml-auto hidden max-w-[33%] truncate text-[11px] text-muted md:block">{props.planLabel}</span>
        </div>

        {props.errorMessage && <div role="alert" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error sm:mx-5">
          <p className="min-w-0 flex-1">{t(props.errorMessage)}</p>
          {props.dailyLimitReached && <Link href="/pricing" className="inline-flex min-h-9 items-center gap-1 font-semibold underline"><span>{t("Upgrade for more")}</span><ChevronDown size={13} aria-hidden className="-rotate-90" /></Link>}
        </div>}
        {props.conversationsError && !props.activeConversationId && !props.conversationsLoading && <div role="alert" className="mx-3 mt-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-text sm:mx-5">{t("Conversation history could not be loaded. You can still start a new chat.")}</div>}

        <main ref={scrollRef} id="assistant-conversation" aria-label={t("Study conversation")} aria-busy={isBusy} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          <AssistantTranscript
            messages={props.messages}
            loading={props.messagesLoading}
            sending={props.sending}
            displayName={props.displayName}
            grade={props.grade}
            subjectLabel={subjectLabel}
            topicLabel={topicLabel}
            demoMode={props.demoMode}
            onUsePrompt={choosePrompt}
            onCopy={props.onCopy}
            onFeedback={props.onFeedback}
            onSave={props.onSaveMessage}
            onRegenerate={() => { void props.onRegenerate(); }}
          />
        </main>

        <section aria-label={t("Message composer")} className="shrink-0 border-t border-border bg-bg/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-5 sm:pb-4">
          {props.dailyLimitReached ? <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface px-4 py-3 text-center">
            <p className="text-sm font-semibold">{t("You have used today’s free messages.")}</p><p className="mt-1 text-xs text-muted">{t("Your chat history is saved. You can continue tomorrow or review available plans.")}</p><Button href="/pricing" variant="secondary" className="mt-3">{t("View plans")}</Button>
          </div> : <form onSubmit={(event) => void handleSubmit(event)} className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
              <label htmlFor="assistant-composer" className="sr-only">{t("Ask Deborah a question")}</label>
              <textarea ref={textareaRef} id="assistant-composer" rows={1} maxLength={2000} value={draft} onChange={(event) => { setDraft(event.target.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`; }} onKeyDown={handleKeyDown} disabled={isBusy} placeholder={t("Ask anything about your studies…")} aria-describedby="assistant-composer-hint assistant-privacy-note" className="max-h-40 min-h-11 w-full resize-none border-0 bg-transparent px-3 py-2.5 text-sm leading-relaxed text-text outline-none placeholder:text-muted/75 focus:ring-0 disabled:opacity-70" />
              <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
                <p id="assistant-composer-hint" className="min-w-0 truncate text-[10px] text-muted">{t("Enter to send · Shift+Enter for a new line")}</p>
                <button type="submit" disabled={!canSend} aria-label={t("Send message")} title={t("Send message")} className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-xl bg-primary text-white transition hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden /></button>
              </div>
            </div>
            <p id="assistant-privacy-note" className="mx-auto mt-2 max-w-2xl text-center text-[10px] leading-relaxed text-muted">{props.demoMode ? t("Demo mode uses sample study notes; your question is not sent to a live AI service.") : t("OpenAI helps generate your study response. Avoid sharing passwords or other personal information.")}</p>
          </form>}
        </section>
      </div>
    </div>
  </div>;
}
