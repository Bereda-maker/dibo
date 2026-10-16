"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, api } from "../../lib/api";
import { useSession } from "../../lib/session";
import { useLocalizedName } from "../../lib/i18n";
import { useToast } from "../../components/ui";
import { AssistantWorkspace } from "./AssistantWorkspace";
import type { AssistantConversation, AssistantFeedback, AssistantMessage, AssistantSubjectOption, AssistantTopicOption } from "./types";

type SubjectRow = { id: string; slug: string; names: Record<string, string>; grade: number; stream: string | null; subjectKey?: string };
type TopicRow = { id: string; slug: string; names: Record<string, string> };
type SendResult = { conversationId: string; assistantMessageId: string; reply: string; sources: string[]; sourceDetails: { id: string; title: string }[]; isRegeneration: boolean };

const localId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function friendlyError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "DAILY_LIMIT") return "You have reached today’s AI message limit.";
    if (error.code === "AI_UNAVAILABLE" || error.code === "AI_PROVIDER_UNAVAILABLE") return "The AI study assistant is temporarily unavailable. Please try again later.";
    return error.message;
  }
  return "The assistant could not complete that request. Please try again.";
}

export function LiveAssistant() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { profile, logout } = useSession();
  const localizedName = useLocalizedName();
  const initialConversationId = searchParams.get("conversationId");
  const initialTopicId = searchParams.get("topicId");
  const initialTopicName = (searchParams.get("topicName") || "").slice(0, 100);
  const queryGrade = Number(searchParams.get("grade"));
  const grade = profile?.grade ?? ([9, 10, 11, 12].includes(queryGrade) ? queryGrade : null);
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(searchParams.get("subjectId"));
  const [topicRows, setTopicRows] = useState<TopicRow[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialTopicId);
  const activeIdRef = useRef<string | null>(null);
  const viewVersion = useRef(0);
  const listVersion = useRef(0);
  const initialOpenDone = useRef(false);

  const loadConversations = useCallback(async () => {
    const version = ++listVersion.current;
    setConversationsLoading(true);
    setConversationsError(null);
    try {
      const rows = await api<AssistantConversation[]>(`/ai/conversations${savedOnly ? "?saved=true" : ""}`);
      if (version === listVersion.current) setConversations(rows);
    } catch (error) {
      if (version === listVersion.current) setConversationsError(friendlyError(error));
    } finally {
      if (version === listVersion.current) setConversationsLoading(false);
    }
  }, [savedOnly]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  useEffect(() => {
    let live = true;
    void api<SubjectRow[]>("/content/subjects?scope=notes").then((rows) => { if (live) setSubjectRows(rows); }).catch(() => { if (live) setSubjectRows([]); });
    return () => { live = false; };
  }, []);

  const subjectOptions: AssistantSubjectOption[] = useMemo(() => {
    const groups = new Map<string, SubjectRow[]>();
    for (const subject of subjectRows) {
      const key = subject.subjectKey || `${subject.slug}:${subject.names.en ?? subject.slug}`;
      groups.set(key, [...(groups.get(key) ?? []), subject]);
    }
    return [...groups.entries()].map(([subjectKey, rows]) => {
      const sameGrade = rows.filter((row) => row.grade === profile?.grade);
      const selected = sameGrade.find((row) => row.stream === profile?.stream || row.stream === null) ?? sameGrade[0] ?? rows[0]!;
      return { id: selected.id, label: localizedName(selected.names), grade: selected.grade, subjectKey };
    });
  }, [subjectRows, profile?.grade, profile?.stream, localizedName]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setTopicRows([]);
      return;
    }
    let live = true;
    void api<TopicRow[]>(`/content/topics?subjectId=${encodeURIComponent(selectedSubjectId)}`)
      .then((rows) => { if (live) setTopicRows(rows); })
      .catch(() => { if (live) setTopicRows([]); });
    return () => { live = false; };
  }, [selectedSubjectId]);

  const topicOptions: AssistantTopicOption[] = useMemo(
    () => topicRows.map((topic) => ({ id: topic.id, label: localizedName(topic.names) })),
    [topicRows, localizedName],
  );

  const selectConversation = useCallback(async (id: string | null) => {
    const version = ++viewVersion.current;
    activeIdRef.current = id;
    setActiveConversationId(id);
    setMessages([]);
    setErrorMessage(null);
    setDailyLimitReached(false);
    if (!id) {
      setMessagesLoading(false);
      setSelectedSubjectId(searchParams.get("subjectId"));
      setSelectedTopicId(searchParams.get("topicId"));
      return;
    }
    const conversation = conversations.find((row) => row.id === id);
    setSelectedSubjectId(conversation?.subjectId ?? null);
    setSelectedTopicId(conversation?.topicId ?? null);
    setMessagesLoading(true);
    try {
      const rows = await api<AssistantMessage[]>(`/ai/conversations/${encodeURIComponent(id)}/messages`);
      if (version === viewVersion.current) setMessages(rows);
    } catch (error) {
      if (version === viewVersion.current) setErrorMessage(friendlyError(error));
    } finally {
      if (version === viewVersion.current) setMessagesLoading(false);
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    if (initialOpenDone.current || !initialConversationId || conversationsLoading) return;
    initialOpenDone.current = true;
    void selectConversation(initialConversationId);
  }, [initialConversationId, conversationsLoading, selectConversation]);

  const sendMessage = useCallback(async (raw: string): Promise<boolean> => {
    const message = raw.trim();
    if (!message || sending || dailyLimitReached) return false;
    const currentId = activeIdRef.current;
    const version = viewVersion.current;
    const tempUserId = localId("pending-user");
    setSending(true);
    setErrorMessage(null);
    setDailyLimitReached(false);
    setMessages((current) => [...current, { id: tempUserId, role: "user", content: message, createdAt: new Date().toISOString() }]);
    try {
      const result = await api<SendResult>("/ai/messages", {
        method: "POST",
        body: {
          conversationId: currentId ?? undefined,
          subjectId: selectedSubjectId,
          topicId: selectedTopicId,
          message,
        },
      });
      await loadConversations();
      if (version === viewVersion.current) {
        if (!currentId) {
          activeIdRef.current = result.conversationId;
          setActiveConversationId(result.conversationId);
        }
        setMessages((current) => [
          ...current.filter((row) => row.id !== tempUserId),
          { id: tempUserId, role: "user", content: message, createdAt: new Date().toISOString() },
          { id: result.assistantMessageId, role: "assistant", content: result.reply, sources: result.sources, sourceDetails: result.sourceDetails, isRegeneration: result.isRegeneration, createdAt: new Date().toISOString() },
        ]);
      }
      return true;
    } catch (error) {
      if (version === viewVersion.current) {
        setMessages((current) => current.filter((row) => row.id !== tempUserId));
        if (error instanceof ApiError && error.code === "DAILY_LIMIT") setDailyLimitReached(true);
        else setErrorMessage(friendlyError(error));
      }
      return false;
    } finally { setSending(false); }
  }, [dailyLimitReached, loadConversations, selectedSubjectId, selectedTopicId, sending]);

  const regenerate = useCallback(async (): Promise<boolean> => {
    const conversationId = activeIdRef.current;
    const previousUserMessage = [...messages].reverse().find((message) => message.role === "user" && !message.isRegeneration);
    if (!conversationId || !previousUserMessage || sending || dailyLimitReached) return false;
    const version = viewVersion.current;
    setSending(true);
    setErrorMessage(null);
    setDailyLimitReached(false);
    try {
      const result = await api<SendResult>("/ai/messages", {
        method: "POST",
        body: { conversationId, subjectId: selectedSubjectId, topicId: selectedTopicId, message: previousUserMessage.content, regenerate: true },
      });
      await loadConversations();
      if (version === viewVersion.current) setMessages((current) => [
        ...current,
        { id: result.assistantMessageId, role: "assistant", content: result.reply, sources: result.sources, sourceDetails: result.sourceDetails, isRegeneration: true, createdAt: new Date().toISOString() },
      ]);
      return true;
    } catch (error) {
      if (version === viewVersion.current) {
        if (error instanceof ApiError && error.code === "DAILY_LIMIT") setDailyLimitReached(true);
        else setErrorMessage(friendlyError(error));
      }
      return false;
    } finally { setSending(false); }
  }, [dailyLimitReached, loadConversations, messages, selectedSubjectId, selectedTopicId, sending]);

  const copyAnswer = useCallback(async (content: string) => {
    try { await navigator.clipboard.writeText(content); toast("Answer copied", "info"); }
    catch { toast("Clipboard access is unavailable in this browser", "error"); }
  }, [toast]);

  const feedback = useCallback(async (messageId: string, value: Exclude<AssistantFeedback, null>) => {
    const previous = messages.find((message) => message.id === messageId)?.feedback ?? null;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, feedback: value } : message));
    try { await api(`/ai/messages/${encodeURIComponent(messageId)}/feedback`, { method: "PATCH", body: { feedback: value } }); }
    catch (error) {
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, feedback: previous } : message));
      toast(friendlyError(error), "error");
    }
  }, [messages, toast]);

  const saveMessage = useCallback(async (messageId: string, saved: boolean) => {
    const previous = messages.find((message) => message.id === messageId)?.isSaved ?? false;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, isSaved: saved } : message));
    try {
      await api(`/ai/messages/${encodeURIComponent(messageId)}/saved`, { method: "PATCH", body: { saved } });
      await loadConversations();
      toast(saved ? "Answer saved" : "Answer removed from saved", "info");
    } catch (error) {
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, isSaved: previous } : message));
      toast(friendlyError(error), "error");
    }
  }, [loadConversations, messages, toast]);

  const saveConversation = useCallback(async (conversationId: string, saved: boolean) => {
    const previous = conversations.find((conversation) => conversation.id === conversationId)?.isSaved ?? false;
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, isSaved: saved } : conversation));
    try {
      await api(`/ai/conversations/${encodeURIComponent(conversationId)}/saved`, { method: "PATCH", body: { saved } });
      await loadConversations();
    } catch (error) {
      setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, isSaved: previous } : conversation));
      toast(friendlyError(error), "error");
      throw error;
    }
  }, [conversations, loadConversations, toast]);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    try {
      await api(`/ai/conversations/${encodeURIComponent(conversationId)}`, { method: "PATCH", body: { title } });
      await loadConversations();
      toast("Conversation renamed", "info");
      return true;
    } catch (error) { toast(friendlyError(error), "error"); return false; }
  }, [loadConversations, toast]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await api(`/ai/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" });
      if (activeIdRef.current === conversationId) await selectConversation(null);
      await loadConversations();
      toast("Conversation deleted", "info");
      return true;
    } catch (error) { toast(friendlyError(error), "error"); return false; }
  }, [loadConversations, selectConversation, toast]);

  const changeSubject = (id: string | null) => {
    setSelectedSubjectId(id);
    setSelectedTopicId(null);
    setErrorMessage(null);
  };
  const logoutStudent = () => { void logout().finally(() => router.push("/")); };

  const displayName = profile?.displayName || profile?.fullName || "Student";
  const planLabel = profile?.subscriptionStatus === "ACTIVE" ? "Premium student" : "Free student";

  return <AssistantWorkspace
    displayName={displayName}
    grade={grade}
    planLabel={planLabel}
    conversations={conversations}
    activeConversationId={activeConversationId}
    messages={messages}
    subjectOptions={subjectOptions}
    topicOptions={topicOptions}
    selectedSubjectId={selectedSubjectId}
    selectedTopicId={selectedTopicId}
    initialTopicName={initialTopicName}
    conversationsLoading={conversationsLoading}
    conversationsError={conversationsError}
    messagesLoading={messagesLoading}
    sending={sending}
    dailyLimitReached={dailyLimitReached}
    errorMessage={errorMessage}
    savedOnly={savedOnly}
    onRetryConversations={() => { void loadConversations(); }}
    onSavedOnlyChange={(value) => setSavedOnly(value)}
    onNewConversation={() => void selectConversation(null)}
    onSelectConversation={(id) => void selectConversation(id)}
    onSend={sendMessage}
    onRegenerate={regenerate}
    onCopy={copyAnswer}
    onFeedback={feedback}
    onSaveMessage={saveMessage}
    onSaveConversation={saveConversation}
    onRename={renameConversation}
    onDelete={deleteConversation}
    onSubjectChange={changeSubject}
    onTopicChange={(id) => setSelectedTopicId(id)}
    onLogout={logoutStudent}
  />;
}
