import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { CreateMessageInput, Message } from "@/models/message";
import { useAuth } from "@/features/auth/AuthProvider";
import { MessageService, messageService } from "@/services/messageService";

interface MessageContextValue {
  getMessages(topicId: string): Message[];
  loadMessages(topicId: string): Promise<boolean>;
  subscribeToMessages(topicId: string): Promise<() => void>;
  sendMessage(input: CreateMessageInput): Promise<Message>;
  getDraft(topicId: string): string;
  loadDraft(topicId: string): Promise<void>;
  saveDraft(topicId: string, body: string): Promise<void>;
  clearDraft(topicId: string): Promise<void>;
  clearLoadedMessages(): void;
  hasLoadedDraft(topicId: string): boolean;
  hasLoadedMessages(topicId: string): boolean;
  getError(topicId: string): string | null;
}

const MessageContext = createContext<MessageContextValue | null>(null);

interface MessageProviderProps extends PropsWithChildren {
  service?: MessageService;
}

export function MessageProvider({ children, service = messageService }: MessageProviderProps) {
  const { session } = useAuth();
  const [messagesByTopicId, setMessagesByTopicId] = useState<Record<string, Message[]>>({});
  const [loadedTopicIds, setLoadedTopicIds] = useState<Record<string, boolean>>({});
  const [errorsByTopicId, setErrorsByTopicId] = useState<Record<string, string | null>>({});
  const [draftsByTopicId, setDraftsByTopicId] = useState<Record<string, string>>({});
  const [loadedDraftTopicIds, setLoadedDraftTopicIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    service.setAccountScope(session?.user.id ?? null);
    setDraftsByTopicId({});
    setLoadedDraftTopicIds({});
  }, [service, session]);

  const loadDraft = useCallback(
    async (topicId: string) => {
      const draft = await service.getDraft(topicId);
      setDraftsByTopicId((current) => ({ ...current, [topicId]: draft }));
      setLoadedDraftTopicIds((current) => ({ ...current, [topicId]: true }));
    },
    [service]
  );

  const saveDraft = useCallback(
    async (topicId: string, body: string) => {
      setDraftsByTopicId((current) => ({ ...current, [topicId]: body }));
      setLoadedDraftTopicIds((current) => ({ ...current, [topicId]: true }));
      await service.saveDraft(topicId, body);
    },
    [service]
  );

  const clearDraft = useCallback(
    async (topicId: string) => {
      setDraftsByTopicId((current) => ({ ...current, [topicId]: "" }));
      setLoadedDraftTopicIds((current) => ({ ...current, [topicId]: true }));
      await service.clearDraft(topicId);
    },
    [service]
  );

  const loadMessages = useCallback(
    async (topicId: string) => {
      try {
        const messages = await service.listMessages(topicId);
        setMessagesByTopicId((current) => ({ ...current, [topicId]: messages }));
        setLoadedTopicIds((current) => ({ ...current, [topicId]: true }));
        setErrorsByTopicId((current) => ({ ...current, [topicId]: null }));
        return true;
      } catch {
        setErrorsByTopicId((current) => ({
          ...current,
          [topicId]: "Messages could not be loaded."
        }));
        return false;
      }
    },
    [service]
  );

  const sendMessage = useCallback(
    async (input: CreateMessageInput) => {
      const optimisticMessage: Message = {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        topicId: input.topicId,
        body: input.body.trim(),
        kind: "user",
        authorId: input.authorId,
        authorName: input.authorName,
        createdAt: new Date().toISOString(),
        isUnread: false
      };

      setMessagesByTopicId((current) => ({
        ...current,
        [input.topicId]: [...(current[input.topicId] ?? []), optimisticMessage]
      }));
      setErrorsByTopicId((current) => ({ ...current, [input.topicId]: null }));

      try {
        const message = await service.createMessage(input);
        await clearDraft(input.topicId);
        setMessagesByTopicId((current) => ({
          ...current,
          [input.topicId]: (current[input.topicId] ?? []).map((currentMessage) =>
            currentMessage.id === optimisticMessage.id ? message : currentMessage
          )
        }));
        return message;
      } catch (error) {
        setMessagesByTopicId((current) => ({
          ...current,
          [input.topicId]: (current[input.topicId] ?? []).filter(
            (currentMessage) => currentMessage.id !== optimisticMessage.id
          )
        }));
        setErrorsByTopicId((current) => ({
          ...current,
          [input.topicId]: error instanceof Error ? error.message : "Message could not be sent."
        }));
        throw error;
      }
    },
    [clearDraft, service]
  );

  const subscribeToMessages = useCallback(
    async (topicId: string) => service.subscribeToMessages(topicId, () => {
      void loadMessages(topicId);
    }),
    [loadMessages, service]
  );

  const value = useMemo<MessageContextValue>(
    () => ({
      getMessages(topicId) {
        return messagesByTopicId[topicId] ?? [];
      },
      loadMessages,
      subscribeToMessages,
      sendMessage,
      getDraft(topicId) {
        return draftsByTopicId[topicId] ?? "";
      },
      loadDraft,
      saveDraft,
      clearDraft,
      clearLoadedMessages() {
        setMessagesByTopicId({});
        setLoadedTopicIds({});
        setErrorsByTopicId({});
      },
      hasLoadedMessages(topicId) {
        return loadedTopicIds[topicId] ?? false;
      },
      hasLoadedDraft(topicId) {
        return loadedDraftTopicIds[topicId] ?? false;
      },
      getError(topicId) {
        return errorsByTopicId[topicId] ?? null;
      }
    }),
    [
      errorsByTopicId,
      draftsByTopicId,
      clearDraft,
      loadDraft,
      loadMessages,
      loadedDraftTopicIds,
      loadedTopicIds,
      messagesByTopicId,
      saveDraft,
      sendMessage,
      subscribeToMessages
    ]
  );

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessageContext);

  if (!context) {
    throw new Error("useMessages must be used inside MessageProvider.");
  }

  return context;
}
