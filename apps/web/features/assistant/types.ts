export type AssistantFeedback = "HELPFUL" | "NOT_HELPFUL" | null;
export type AssistantRole = "user" | "assistant";
export type AssistantSource = { id: string; title: string };

export type AssistantConversation = {
  id: string;
  title: string;
  updatedAt?: string | Date | null;
  subjectId?: string | null;
  topicId?: string | null;
  isSaved?: boolean;
  messages?: AssistantMessage[];
};

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  content: string;
  sources?: string[];
  sourceDetails?: AssistantSource[];
  feedback?: AssistantFeedback;
  isSaved?: boolean;
  isRegeneration?: boolean;
  createdAt?: string;
};

export type AssistantSubjectOption = {
  id: string;
  label: string;
  grade?: number;
  subjectKey?: string;
};

export type AssistantTopicOption = { id: string; label: string };

export type AssistantWorkspaceProps = {
  displayName: string;
  grade: number | null;
  planLabel: string;
  conversations: AssistantConversation[];
  activeConversationId: string | null;
  messages: AssistantMessage[];
  subjectOptions: AssistantSubjectOption[];
  topicOptions: AssistantTopicOption[];
  selectedSubjectId: string | null;
  selectedTopicId: string | null;
  initialTopicName?: string | null;
  conversationsLoading?: boolean;
  messagesLoading?: boolean;
  sending?: boolean;
  dailyLimitReached?: boolean;
  errorMessage?: string | null;
  conversationsError?: string | null;
  savedOnly: boolean;
  demoMode?: boolean;
  onRetryConversations?: () => void;
  onSavedOnlyChange: (savedOnly: boolean) => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string | null) => void;
  onSend: (message: string) => Promise<boolean>;
  onRegenerate: () => Promise<boolean>;
  onCopy: (content: string) => Promise<void>;
  onFeedback: (messageId: string, feedback: Exclude<AssistantFeedback, null>) => Promise<void>;
  onSaveMessage: (messageId: string, saved: boolean) => Promise<void>;
  onSaveConversation: (conversationId: string, saved: boolean) => Promise<void>;
  onRename: (conversationId: string, title: string) => Promise<boolean>;
  onDelete: (conversationId: string) => Promise<boolean>;
  onSubjectChange: (subjectId: string | null) => void;
  onTopicChange: (topicId: string | null) => void;
  onLogout: () => void;
};
