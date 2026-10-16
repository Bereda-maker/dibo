"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import {
  BookOpen, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, ClipboardList,
  Crown, LayoutDashboard, LogOut, MessageSquare, MoreHorizontal, Pencil, Plus,
  Search, Settings, Trash2, X,
} from "lucide-react";
import { Button, Modal, Skeleton, cx, inputCls, useToast } from "../../components/ui";
import { Logo } from "../../components/Logo";
import { useT } from "../../lib/i18n";
import type { AssistantConversation, AssistantSubjectOption } from "./types";

type Props = {
  conversations: AssistantConversation[];
  activeConversationId: string | null;
  loading?: boolean;
  error?: string | null;
  savedOnly: boolean;
  collapsed?: boolean;
  mobile?: boolean;
  mobileOpen?: boolean;
  displayName: string;
  grade: number | null;
  planLabel: string;
  subjectOptions: AssistantSubjectOption[];
  selectedSubjectId: string | null;
  onSubjectChange: (subjectId: string | null) => void;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  onRetry?: () => void;
  onSavedOnlyChange: (value: boolean) => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string | null) => void;
  onSaveConversation: (id: string, saved: boolean) => Promise<void>;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onLogout: () => void;
};

const DATE_GROUPS = ["Today", "Yesterday", "Previous 7 days", "Older", "Recent"] as const;

function dateGroup(value: AssistantConversation["updatedAt"]): (typeof DATE_GROUPS)[number] {
  if (!value) return "Recent";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Recent";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const age = Math.floor((start.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  if (age <= 0) return "Today";
  if (age === 1) return "Yesterday";
  if (age <= 7) return "Previous 7 days";
  return "Older";
}

function groupedConversations(items: AssistantConversation[]) {
  const groups = new Map<string, AssistantConversation[]>();
  for (const item of items) {
    const label = dateGroup(item.updatedAt);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return DATE_GROUPS.flatMap((label) => {
    const rows = groups.get(label);
    return rows?.length ? [{ label, rows }] : [];
  });
}

export function AssistantSidebar(props: Props) {
  const t = useT();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [renameTarget, setRenameTarget] = useState<AssistantConversation | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AssistantConversation | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const closeRename = useCallback(() => setRenameTarget(null), []);
  const closeDelete = useCallback(() => setDeleteTarget(null), []);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return props.conversations.filter((conversation) => !query || conversation.title.toLocaleLowerCase().includes(query));
  }, [props.conversations, search]);
  const groups = useMemo(() => groupedConversations(visible), [visible]);
  const compact = !!props.collapsed && !props.mobile;
  const canRender = !props.mobile || !!props.mobileOpen;

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim() || actionBusy) return;
    setActionBusy(true);
    try {
      if (await props.onRename(renameTarget.id, renameValue.trim())) closeRename();
    } finally { setActionBusy(false); }
  };
  const handleDelete = async () => {
    if (!deleteTarget || actionBusy) return;
    setActionBusy(true);
    try {
      if (await props.onDelete(deleteTarget.id)) closeDelete();
    } finally { setActionBusy(false); }
  };
  const startRename = (conversation: AssistantConversation) => {
    setRenameTarget(conversation);
    setRenameValue(conversation.title);
  };
  const select = (id: string | null) => {
    props.onSelectConversation(id);
    props.onClose?.();
  };
  const toggleSaved = async (conversation: AssistantConversation) => {
    try {
      await props.onSaveConversation(conversation.id, !conversation.isSaved);
      toast(conversation.isSaved ? "Conversation removed from saved" : "Conversation saved", "info");
    } catch {
      toast("Could not update saved conversation", "error");
    }
  };

  if (!canRender) return null;

  return <>
    {props.mobile && <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label={t("Close navigation")} className="absolute inset-0 bg-black/45" onClick={props.onClose} />
      <aside role="dialog" aria-modal="true" aria-label={t("Assistant navigation")} className="absolute inset-y-0 left-0 flex w-[min(88vw,330px)] flex-col border-r border-border bg-surface shadow-xl">
        <SidebarContents {...props} compact={false} mobile onClose={props.onClose} search={search} setSearch={setSearch} visible={visible} groups={groups} select={select} startRename={startRename} setDeleteTarget={setDeleteTarget} toggleSaved={toggleSaved} />
      </aside>
    </div>}
    {!props.mobile && <aside aria-label={t("Assistant navigation")} className={cx("hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 lg:flex", compact ? "w-[76px]" : "w-[286px]")}>
      <SidebarContents {...props} compact={compact} search={search} setSearch={setSearch} visible={visible} groups={groups} select={select} startRename={startRename} setDeleteTarget={setDeleteTarget} toggleSaved={toggleSaved} />
    </aside>}

    <Modal open={!!renameTarget} title="Rename conversation" onClose={closeRename}>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleRename(); }}>
        <label htmlFor="assistant-rename-title" className="sr-only">{t("Conversation title")}</label>
        <input id="assistant-rename-title" autoComplete="off" maxLength={80} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className={inputCls} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={closeRename}>Cancel</Button><Button type="submit" loading={actionBusy} disabled={!renameValue.trim()}>Save</Button></div>
      </form>
    </Modal>
    <Modal open={!!deleteTarget} title="Delete conversation?" onClose={closeDelete}>
      <p className="text-sm leading-relaxed text-muted">{t("This conversation will be removed from your history. This cannot be undone.")}</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={closeDelete}>Cancel</Button><Button variant="danger" loading={actionBusy} onClick={() => void handleDelete()}>Delete</Button></div>
    </Modal>
  </>;
}

type ContentsProps = Props & {
  compact: boolean;
  mobile?: boolean;
  search: string;
  setSearch: (value: string) => void;
  visible: AssistantConversation[];
  groups: { label: string; rows: AssistantConversation[] }[];
  select: (id: string | null) => void;
  startRename: (conversation: AssistantConversation) => void;
  setDeleteTarget: (conversation: AssistantConversation) => void;
  toggleSaved: (conversation: AssistantConversation) => Promise<void>;
};

function SidebarContents(props: ContentsProps) {
  const t = useT();
  const { compact, mobile } = props;
  const changeSubject = (subjectId: string | null) => { props.onSubjectChange(subjectId); props.onClose?.(); };
  const rowAction = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    action();
  };

  return <>
    <div className={cx("flex items-center border-b border-border", compact ? "justify-center px-2 py-4" : "justify-between px-4 py-4")}>
      {!compact && <div onClick={() => props.onClose?.()}><Logo /></div>}
      {compact && <Link href="/" aria-label="Deborah home" className="grid h-12 w-12 place-items-center rounded-2xl border border-accent/25 bg-white p-2 shadow-sm"><Image src="/images/dibora-logo.png" alt="" aria-hidden width={48} height={48} className="h-full w-full object-contain" /></Link>}
      {!mobile && <button type="button" aria-label={compact ? t("Expand sidebar") : t("Collapse sidebar")} title={compact ? t("Expand sidebar") : t("Collapse sidebar")} onClick={props.onToggleCollapse} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-muted transition hover:bg-border/50 hover:text-text focus-visible:ring-2 focus-visible:ring-primary">
        {compact ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
      </button>}
      {mobile && <button type="button" aria-label={t("Close navigation")} onClick={props.onClose} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-muted hover:bg-border/50"><X size={18} aria-hidden /></button>}
    </div>

    <div className={cx("shrink-0", compact ? "p-3" : "p-4")}>
      <Button variant="secondary" className={cx("w-full", compact && "px-2")} onClick={() => { props.onNewConversation(); props.onClose?.(); }} aria-label={compact ? t("New conversation") : undefined} title={compact ? t("New conversation") : undefined}>
        <Plus size={17} aria-hidden />{!compact && t("New conversation")}
      </Button>
      {!compact && <label className="relative mt-3 block">
        <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={props.search} onChange={(event) => props.setSearch(event.target.value)} type="search" placeholder={t("Search conversations")} aria-label={t("Search conversations")} className={cx(inputCls, "pl-9 pr-3")} />
      </label>}
      <button type="button" aria-pressed={props.savedOnly} title={compact ? t("Saved conversations") : undefined} onClick={() => props.onSavedOnlyChange(!props.savedOnly)} className={cx("mt-2 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-medium transition hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary", props.savedOnly && "bg-primary/10 text-primary", compact && "justify-center px-2")}>
        {props.savedOnly ? <BookmarkCheck size={17} aria-hidden /> : <Bookmark size={17} aria-hidden />}{!compact && t("Saved conversations")}
      </button>
      {!compact && <section className="mt-4 px-1" aria-label={t("Subjects")}>
        <h2 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted">{t("Subjects")}</h2>
        <div className="max-h-32 space-y-0.5 overflow-y-auto">
          <button type="button" aria-pressed={!props.selectedSubjectId} onClick={() => changeSubject(null)} className={cx("flex min-h-9 w-full items-center rounded-lg px-2 text-left text-xs transition hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary", !props.selectedSubjectId ? "bg-primary/10 font-semibold text-primary" : "text-muted")}>{t("All available subjects")}</button>
          {props.subjectOptions.map((subject) => <button key={subject.id} type="button" aria-pressed={props.selectedSubjectId === subject.id} title={subject.grade ? `${subject.label} · ${t("Grade")} ${subject.grade}` : subject.label} onClick={() => changeSubject(subject.id)} className={cx("flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs transition hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary", props.selectedSubjectId === subject.id ? "bg-primary/10 font-semibold text-primary" : "text-muted")}><span className="truncate">{subject.label}</span>{subject.grade && <span className="shrink-0 text-[10px] opacity-70">G{subject.grade}</span>}</button>)}
        </div>
      </section>}
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      {!compact && <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted"><span>{props.savedOnly ? t("Saved conversations") : t("Recent conversations")}</span><span>{props.visible.length}</span></div>}
      {props.loading && <div className="space-y-2 px-1">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-10" />)}</div>}
      {props.error && !props.loading && <div role="alert" className="mx-2 rounded-xl border border-error/30 bg-error/5 p-3 text-xs text-error"><p>{t(props.error)}</p>{props.onRetry && <button type="button" onClick={props.onRetry} className="mt-2 min-h-9 font-semibold underline">{t("Try again")}</button>}</div>}
      {!props.loading && !props.error && !props.visible.length && <p className="px-3 py-6 text-center text-sm text-muted">{props.search ? t("No matching conversations") : props.savedOnly ? t("No saved conversations yet") : t("Your conversations will appear here")}</p>}
      {!props.loading && !props.error && props.groups.map((group) => <section key={group.label} className="mb-4">
        {!compact && <h2 className="mb-1 px-3 text-xs font-semibold text-muted">{t(group.label)}</h2>}
        <div className="space-y-1">{group.rows.map((conversation) => <div key={conversation.id} className="group relative flex min-w-0 items-center gap-1">
          <button type="button" aria-current={conversation.id === props.activeConversationId ? "page" : undefined} aria-label={compact ? conversation.title : undefined} title={compact ? conversation.title : undefined} onClick={() => props.select(conversation.id)} className={cx("flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-primary", conversation.id === props.activeConversationId ? "bg-primary/10 font-semibold text-primary" : "text-text hover:bg-border/50", compact && "justify-center px-2")}>
            {compact ? <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{conversation.title.trim().slice(0, 1).toLocaleUpperCase() || <MessageSquare size={15} />}</span> : <><MessageSquare size={15} aria-hidden className="shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate">{conversation.title}</span>{conversation.isSaved && <BookmarkCheck size={14} aria-label={t("Saved")} className="shrink-0 text-accent" />}</>}
          </button>
          {!compact && <details className="relative shrink-0">
            <summary aria-label={`${t("Conversation actions")}: ${conversation.title}`} title={t("More actions")} className="grid min-h-10 min-w-10 cursor-pointer list-none place-items-center rounded-xl text-muted opacity-100 hover:bg-border/50 focus-visible:ring-2 focus-visible:ring-primary lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"><MoreHorizontal size={17} aria-hidden /></summary>
            <div role="menu" aria-label={t("Actions for conversation") + ` ${conversation.title}`} className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-border bg-surface p-1 shadow-lg">
              <button type="button" role="menuitem" onClick={(event) => rowAction(event, () => props.startRename(conversation))} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-border/50"><Pencil size={15} aria-hidden />{t("Rename")}</button>
              <button type="button" role="menuitem" onClick={(event) => rowAction(event, () => { void props.toggleSaved(conversation); })} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-border/50">{conversation.isSaved ? <BookmarkCheck size={15} aria-hidden /> : <Bookmark size={15} aria-hidden />}{t(conversation.isSaved ? "Remove from saved" : "Save conversation")}</button>
              <button type="button" role="menuitem" onClick={(event) => rowAction(event, () => props.setDeleteTarget(conversation))} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-error hover:bg-error/5"><Trash2 size={15} aria-hidden />{t("Delete")}</button>
            </div>
          </details>}
        </div>)}</div>
      </section>)}
    </div>

    {!compact && <div className="shrink-0 border-t border-border p-3">
      <nav aria-label={t("Study tools")} className="mb-3 grid grid-cols-2 gap-1">
        {[
          { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
          { href: "/exams", label: "Exams", Icon: ClipboardList },
          { href: "/notes", label: "Short Notes", Icon: BookOpen },
          { href: "/bookmarks", label: "Saved study items", Icon: Bookmark },
        ].map(({ href, label, Icon }) => <Link key={href} href={href} onClick={props.onClose} className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-border/50 hover:text-primary"><Icon size={15} aria-hidden /><span className="truncate">{t(label)}</span></Link>)}
      </nav>
      <div className="flex items-center gap-2 rounded-xl bg-background p-2">
        <Link href="/profile" onClick={props.onClose} aria-label={t("Student profile and settings")} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 hover:bg-border/50">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">{props.displayName.trim().slice(0, 1).toLocaleUpperCase() || "S"}</span>
          <span className="min-w-0"><span className="block truncate text-xs font-semibold">{props.displayName}</span><span className="block truncate text-[10px] text-muted">{props.grade ? `${t("Grade")} ${props.grade}` : t("Student profile")}</span></span>
        </Link>
        <Link href="/pricing" onClick={props.onClose} aria-label={t("Account and plans")} title={props.planLabel} className="grid min-h-10 min-w-10 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-primary"><Crown size={16} aria-hidden /><span className="sr-only">{t("Plans")}</span></Link>
        <Link href="/profile" onClick={props.onClose} aria-label={t("Settings")} title={t("Settings")} className="grid min-h-10 min-w-10 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-primary"><Settings size={16} aria-hidden /></Link>
        <button type="button" onClick={props.onLogout} aria-label={t("Log out")} title={t("Log out")} className="grid min-h-10 min-w-10 place-items-center rounded-lg text-muted hover:bg-error/5 hover:text-error"><LogOut size={16} aria-hidden /></button>
      </div>
    </div>}
    {compact && <div className="flex shrink-0 flex-col items-center gap-2 border-t border-border p-3">
      <Link href="/profile" aria-label={t("Student profile and settings")} title={t("Student profile")} className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 font-bold text-primary">{props.displayName.trim().slice(0, 1).toLocaleUpperCase() || "S"}</Link>
      <button type="button" onClick={props.onLogout} aria-label={t("Log out")} title={t("Log out")} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-muted hover:bg-error/5 hover:text-error"><LogOut size={16} aria-hidden /></button>
    </div>}

  </>;
}
