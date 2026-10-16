"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { today, useStore } from "../../lib/store";
import { useToast } from "../../components/ui";
import { QUESTIONS, NOTES, SUBJECTS, TOPICS } from "../../lib/mock";
import { AssistantWorkspace } from "./AssistantWorkspace";
import type { AssistantConversation, AssistantFeedback, AssistantMessage, AssistantSubjectOption, AssistantTopicOption } from "./types";

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function localNoteAnswer(message: string, subjectId: string | null, topicId: string | null) {
  const topic = topicId ? TOPICS.find((row) => row.id === topicId) : null;
  const topicSubjectId = topic?.subjectId ?? null;
  const words = [...new Set(message.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 2))];
  const matchingNotes = NOTES.map((note) => {
    const noteTopic = TOPICS.find((row) => row.id === note.topicId);
    if (!noteTopic || (subjectId && noteTopic.subjectId !== subjectId) || (topicId && note.topicId !== topicId)) return { note, score: -1 };
    const text = [note.title, note.summary, ...note.sections.map((section) => `${section.heading} ${section.body}`), ...note.formulas, ...note.keyPoints].join(" ").toLocaleLowerCase();
    const score = words.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0) + (topicId && note.topicId === topicId ? 4 : 0) + (topicSubjectId && noteTopic.subjectId === topicSubjectId ? 1 : 0);
    return { note, score };
  }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score);

  if (/\b(quiz|test|practice question|question me)\b/i.test(message)) {
    const eligible = QUESTIONS.filter((question) => (!subjectId || question.subjectId === subjectId) && (!topicId || question.topicId === topicId));
    const question = eligible.find((row) => words.some((word) => row.text.toLocaleLowerCase().includes(word))) ?? eligible[0];
    if (question) {
      const options = question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option.text}`).join("\n");
      return { text: `### Practice question\n\n${question.text}\n\n${options}\n\nReply with your choice. This demo can show sample questions, but it does not grade chat replies.`, sources: [] as string[], sourceDetails: [] as { id: string; title: string }[] };
    }
  }

  const note = matchingNotes[0]?.note;
  if (!note) {
    return { text: "This demo library does not contain a matching published note for that question. Try selecting a different subject or topic, or browse Short Notes for the available material.", sources: [] as string[], sourceDetails: [] as { id: string; title: string }[] };
  }
  const section = note.sections[0];
  const lines = [
    `### ${note.title}`,
    note.summary,
    ...(section ? [`**${section.heading}**`, section.body] : []),
    ...(note.formulas.length ? [`**Key formula${note.formulas.length > 1 ? "s" : ""}**`, ...note.formulas.map((formula) => `- ${formula}`)] : []),
    ...(note.keyPoints.length ? [`**Key points**`, ...note.keyPoints.map((point) => `- ${point}`)] : []),
    "This is the existing Deborah sample note shown in demo mode, not a live AI-generated answer.",
  ];
  return { text: lines.join("\n\n"), sources: [note.id], sourceDetails: [{ id: note.id, title: note.title }] };
}

export function DemoAssistant() {
  const { state, update, logout } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const demoUser = state.user;
  const initialConversationId = searchParams.get("conversationId");
  const initialTopicId = searchParams.get("topicId");
  const initialTopicName = (searchParams.get("topicName") || "").slice(0, 100);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(searchParams.get("subjectId"));
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialTopicId);
  const [savedOnly, setSavedOnly] = useState(false);
  const usageKey = today();
  const usedToday = state.aiUsage[usageKey] ?? 0;
  const limit = demoUser?.plan === "PREMIUM" ? Number.MAX_SAFE_INTEGER : 5;
  const dailyLimitReached = usedToday >= limit;
  const conversations = [...state.conversations].sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
  const activeConversation = state.conversations.find((conversation) => conversation.id === activeConversationId);
  const messages = (activeConversation?.messages ?? []) as AssistantMessage[];
  const allowedSubjectIds = demoUser?.subjects.length ? demoUser.subjects : SUBJECTS.map((subject) => subject.id);
  const subjectOptions: AssistantSubjectOption[] = SUBJECTS.filter((subject) => allowedSubjectIds.includes(subject.id)).map((subject) => ({ id: subject.id, label: subject.name, grade: demoUser?.grade }));
  const topicOptions: AssistantTopicOption[] = useMemo(() => selectedSubjectId ? TOPICS.filter((topic) => topic.subjectId === selectedSubjectId).map((topic) => ({ id: topic.id, label: topic.name })) : [], [selectedSubjectId]);
  const shownConversations = savedOnly ? conversations.filter((conversation) => conversation.isSaved) : conversations;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const newConversation = () => {
    setActiveConversationId(null);
    setSelectedSubjectId(searchParams.get("subjectId"));
    setSelectedTopicId(searchParams.get("topicId"));
    setErrorMessage(null);
  };
  const selectConversation = (id: string | null) => {
    setActiveConversationId(id);
    const conversation = conversations.find((row) => row.id === id);
    setSelectedSubjectId(conversation?.subjectId ?? null);
    setSelectedTopicId(conversation?.topicId ?? null);
    setErrorMessage(null);
  };

  const saveConversation = async (id: string, saved: boolean) => {
    update((current) => ({ ...current, conversations: current.conversations.map((conversation) => conversation.id === id ? { ...conversation, isSaved: saved } : conversation) }));
  };
  const renameConversation = async (id: string, title: string) => {
    update((current) => ({ ...current, conversations: current.conversations.map((conversation) => conversation.id === id ? { ...conversation, title, updatedAt: new Date().toISOString() } : conversation) }));
    toast("Conversation renamed", "info");
    return true;
  };
  const deleteConversation = async (id: string) => {
    update((current) => ({ ...current, conversations: current.conversations.filter((conversation) => conversation.id !== id) }));
    if (activeConversationId === id) newConversation();
    toast("Conversation deleted", "info");
    return true;
  };

  const sendMessage = async (raw: string): Promise<boolean> => {
    if (dailyLimitReached) return false;
    const message = raw.trim();
    if (!message) return false;
    const existing = state.conversations.find((conversation) => conversation.id === activeConversationId);
    const id = activeConversationId ?? makeId("demo-chat");
    const createdAt = new Date().toISOString();
    const answer = localNoteAnswer(message, selectedSubjectId, selectedTopicId);
    const userMessage: AssistantMessage = { id: makeId("demo-user"), role: "user", content: message, createdAt };
    const assistantMessage: AssistantMessage = { id: makeId("demo-assistant"), role: "assistant", content: answer.text, sources: answer.sources, sourceDetails: answer.sourceDetails, createdAt };
    const conversation = {
      id,
      title: existing?.title ?? message.slice(0, 44),
      messages: [...(existing?.messages ?? []), userMessage, assistantMessage],
      subjectId: selectedSubjectId,
      topicId: selectedTopicId,
      isSaved: existing?.isSaved ?? false,
      updatedAt: createdAt,
    };
    update((current) => ({
      ...current,
      conversations: [conversation, ...current.conversations.filter((row) => row.id !== id)],
      aiUsage: { ...current.aiUsage, [usageKey]: (current.aiUsage[usageKey] ?? 0) + 1 },
    }));
    setActiveConversationId(id);
    setErrorMessage(null);
    return true;
  };

  const regenerate = async (): Promise<boolean> => {
    if (dailyLimitReached || !activeConversation) return false;
    const sourceMessage = [...activeConversation.messages].reverse().find((message) => message.role === "user" && !message.isRegeneration);
    if (!sourceMessage) return false;
    const answer = localNoteAnswer(sourceMessage.content, selectedSubjectId, selectedTopicId);
    const now = new Date().toISOString();
    const alternative: AssistantMessage = { id: makeId("demo-regen-answer"), role: "assistant", content: answer.text, sources: answer.sources, sourceDetails: answer.sourceDetails, isRegeneration: true, createdAt: now };
    update((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === activeConversation.id ? { ...conversation, messages: [...conversation.messages, alternative], updatedAt: now } : conversation),
      aiUsage: { ...current.aiUsage, [usageKey]: (current.aiUsage[usageKey] ?? 0) + 1 },
    }));
    return true;
  };

  const copyAnswer = async (content: string) => {
    try { await navigator.clipboard.writeText(content); toast("Answer copied", "info"); }
    catch { toast("Clipboard access is unavailable in this browser", "error"); }
  };
  const feedback = async (id: string, value: Exclude<AssistantFeedback, null>) => {
    update((current) => ({ ...current, conversations: current.conversations.map((conversation) => ({ ...conversation, messages: conversation.messages.map((message) => message.id === id ? { ...message, feedback: value } : message) })) }));
  };
  const saveMessage = async (id: string, saved: boolean) => {
    update((current) => ({ ...current, conversations: current.conversations.map((conversation) => ({
      ...conversation,
      isSaved: saved ? true : conversation.isSaved,
      messages: conversation.messages.map((message) => message.id === id ? { ...message, isSaved: saved } : message),
    })) }));
    toast(saved ? "Answer saved" : "Answer removed from saved", "info");
  };
  const logoutStudent = () => { logout(); router.push("/"); };
  const displayName = demoUser?.name || "Student";
  const topicLabel = topicOptions.find((topic) => topic.id === selectedTopicId)?.label || initialTopicName;

  return <AssistantWorkspace
    displayName={displayName}
    grade={demoUser?.grade ?? null}
    planLabel={demoUser?.plan === "PREMIUM" ? "Premium student" : "Free student"}
    conversations={shownConversations}
    activeConversationId={activeConversationId}
    messages={messages}
    subjectOptions={subjectOptions}
    topicOptions={topicOptions}
    selectedSubjectId={selectedSubjectId}
    selectedTopicId={selectedTopicId}
    initialTopicName={topicLabel}
    sending={false}
    dailyLimitReached={dailyLimitReached}
    errorMessage={errorMessage}
    savedOnly={savedOnly}
    demoMode
    onSavedOnlyChange={setSavedOnly}
    onNewConversation={newConversation}
    onSelectConversation={selectConversation}
    onSend={sendMessage}
    onRegenerate={regenerate}
    onCopy={copyAnswer}
    onFeedback={feedback}
    onSaveMessage={saveMessage}
    onSaveConversation={saveConversation}
    onRename={renameConversation}
    onDelete={deleteConversation}
    onSubjectChange={(id) => { setSelectedSubjectId(id); setSelectedTopicId(null); }}
    onTopicChange={(id) => setSelectedTopicId(id)}
    onLogout={logoutStudent}
  />;
}
