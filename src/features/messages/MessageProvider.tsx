import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { CreateMessageInput, Message } from "@/models/message";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  MessageCursor,
  MessageService,
  messagePageSize,
  messageService
} from "@/services/messageService";

interface MessageContextValue {
  getMessages(topicId: string): Message[];
  loadMessages(topicId: string, options?: MessageLoadOptions): Promise<boolean>;
  preloadOlderMessages(topicId: string): Promise<void>;
  ensureMessageSegmentLoaded(topicId: string, messageId: string): Promise<void>;
  subscribeToMessages(topicId: string): Promise<() => void>;
  sendMessage(input: CreateMessageInput): Promise<Message>;
  updateMessage(messageId: string, body: string): Promise<Message>;
  deleteMessage(messageId: string): Promise<Message>;
  getDraft(topicId: string): string;
  loadDraft(topicId: string): Promise<void>;
  saveDraft(topicId: string, body: string): Promise<void>;
  clearDraft(topicId: string): Promise<void>;
  markMessagesRead(topicId: string): void;
  clearLoadedMessages(): void;
  hasLoadedDraft(topicId: string): boolean;
  hasLoadedMessages(topicId: string): boolean;
  getError(topicId: string): string | null;
  getOlderPreloadBoundary(topicId: string): string | null;
}

interface MessageHistoryState {
  oldestCursor?: MessageCursor;
  hasOlderMessages: boolean;
  olderPreloadBoundaryId: string | null;
}

interface MessageLoadOptions {
  priorityMessageIds?: string[];
}

const MessageContext = createContext<MessageContextValue | null>(null);

interface MessageProviderProps extends PropsWithChildren {
  service?: MessageService;
}

export function MessageProvider({ children, service = messageService }: MessageProviderProps) {
  const { session } = useAuth();
  const [messagesByTopicId, setMessagesByTopicId] = useState<Record<string, Message[]>>({});
  const [historyByTopicId, setHistoryByTopicId] = useState<Record<string, MessageHistoryState>>({});
  const olderLoadInFlightTopicIds = useRef(new Set<string>());
  const targetSegmentInFlightMessageIds = useRef(new Set<string>());
  const initialLoadPromises = useRef(new Map<string, Promise<boolean>>());
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

  const preloadOlderPage = useCallback(async (
    topicId: string,
    before: MessageCursor,
    hasOlderMessages: boolean
  ) => {
    if (!hasOlderMessages || olderLoadInFlightTopicIds.current.has(topicId)) {
      return;
    }

    olderLoadInFlightTopicIds.current.add(topicId);

    try {
      const page = await service.listMessagePage(topicId, { before, limit: messagePageSize });

      setMessagesByTopicId((current) => ({
        ...current,
        [topicId]: mergeMessages(current[topicId] ?? [], page.messages)
      }));
      setHistoryByTopicId((current) => ({
        ...current,
        [topicId]: {
          oldestCursor: getOldestCursor(page.messages) ?? before,
          hasOlderMessages: page.hasOlderMessages,
          olderPreloadBoundaryId: getOlderPreloadBoundaryId(page.messages)
        }
      }));
    } finally {
      olderLoadInFlightTopicIds.current.delete(topicId);
    }
  }, [service]);

  const loadMessageSegmentWindow = useCallback(async (topicId: string, messageId: string) => {
    const segments = await Promise.all(
      [-1, 0, 1].map((relativeSegment) => (
        service.listMessageSegment(topicId, messageId, messagePageSize, relativeSegment)
      ))
    );

    return segments.reduce(
      (messages, segment) => mergeMessages(messages, segment),
      [] as Message[]
    );
  }, [service]);

  const loadMessages = useCallback(
    (topicId: string, options: MessageLoadOptions = {}) => {
      if (loadedTopicIds[topicId]) {
        return Promise.resolve(true);
      }

      const inFlightLoad = initialLoadPromises.current.get(topicId);

      if (inFlightLoad) {
        return inFlightLoad;
      }

      const load = (async () => {
        try {
          const page = await service.listMessagePage(topicId, { limit: messagePageSize });
          const priorityMessageIds = new Set([
            ...(options.priorityMessageIds ?? []),
            ...page.messages.flatMap((message) => (
              message.replyToMessageId ? [message.replyToMessageId] : []
            ))
          ]);
          page.messages.forEach((message) => priorityMessageIds.delete(message.id));
          const prioritySegments = await Promise.all(
            Array.from(priorityMessageIds).map((messageId) => loadMessageSegmentWindow(topicId, messageId))
          );
          const initialMessages = prioritySegments.reduce(
            (currentMessages, segment) => mergeMessages(currentMessages, segment),
            page.messages
          );
          const oldestCursor = getOldestCursor(page.messages);

          setMessagesByTopicId((current) => ({ ...current, [topicId]: initialMessages }));
          setHistoryByTopicId((current) => ({
            ...current,
            [topicId]: {
              oldestCursor,
              hasOlderMessages: page.hasOlderMessages,
              olderPreloadBoundaryId: null
            }
          }));
          setLoadedTopicIds((current) => ({ ...current, [topicId]: true }));
          setErrorsByTopicId((current) => ({ ...current, [topicId]: null }));

          if (oldestCursor) {
            void preloadOlderPage(topicId, oldestCursor, page.hasOlderMessages);
          }

          return true;
        } catch {
          setErrorsByTopicId((current) => ({
            ...current,
            [topicId]: "Messages could not be loaded."
          }));
          return false;
        } finally {
          initialLoadPromises.current.delete(topicId);
        }
      })();

      initialLoadPromises.current.set(topicId, load);
      return load;
    },
    [loadedTopicIds, loadMessageSegmentWindow, preloadOlderPage, service]
  );

  const preloadOlderMessages = useCallback(async (topicId: string) => {
    const history = historyByTopicId[topicId];

    if (history?.oldestCursor) {
      await preloadOlderPage(topicId, history.oldestCursor, history.hasOlderMessages);
    }
  }, [historyByTopicId, preloadOlderPage]);

  const ensureMessageSegmentLoaded = useCallback(async (topicId: string, messageId: string) => {
    if (
      messagesByTopicId[topicId]?.some((message) => message.id === messageId) ||
      targetSegmentInFlightMessageIds.current.has(messageId)
    ) {
      return;
    }

    targetSegmentInFlightMessageIds.current.add(messageId);

    try {
      const messages = await loadMessageSegmentWindow(topicId, messageId);

      if (messages.length > 0) {
        setMessagesByTopicId((current) => ({
          ...current,
          [topicId]: mergeMessages(current[topicId] ?? [], messages)
        }));
      }
    } finally {
      targetSegmentInFlightMessageIds.current.delete(messageId);
    }
  }, [loadMessageSegmentWindow, messagesByTopicId]);

  const refreshNewestMessages = useCallback(async (topicId: string) => {
    try {
      const page = await service.listMessagePage(topicId, { limit: messagePageSize });
      setMessagesByTopicId((current) => ({
        ...current,
        [topicId]: mergeMessages(current[topicId] ?? [], page.messages)
      }));
    } catch {
      // Realtime refresh failures should not replace already visible history.
    }
  }, [service]);

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
        replyToMessageId: input.replyToMessageId,
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

  const updateMessage = useCallback(
    async (messageId: string, body: string) => {
      const message = await service.updateMessage(messageId, body);

      setMessagesByTopicId((current) => ({
        ...current,
        [message.topicId]: (current[message.topicId] ?? []).map((currentMessage) => (
          currentMessage.id === message.id ? message : currentMessage
        ))
      }));

      return message;
    },
    [service]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const message = await service.deleteMessage(messageId);

      setMessagesByTopicId((current) => ({
        ...current,
        [message.topicId]: (current[message.topicId] ?? []).map((currentMessage) => (
          currentMessage.id === message.id ? message : currentMessage
        ))
      }));

      return message;
    },
    [service]
  );

  const subscribeToMessages = useCallback(
    async (topicId: string) => service.subscribeToMessages(topicId, () => {
      void refreshNewestMessages(topicId);
    }),
    [refreshNewestMessages, service]
  );

  const value = useMemo<MessageContextValue>(
    () => ({
      getMessages(topicId) {
        return messagesByTopicId[topicId] ?? [];
      },
      loadMessages,
      preloadOlderMessages,
      ensureMessageSegmentLoaded,
      subscribeToMessages,
      sendMessage,
      updateMessage,
      deleteMessage,
      getDraft(topicId) {
        return draftsByTopicId[topicId] ?? "";
      },
      loadDraft,
      saveDraft,
      clearDraft,
      markMessagesRead(topicId) {
        setMessagesByTopicId((current) => ({
          ...current,
          [topicId]: (current[topicId] ?? []).map((message) => ({
            ...message,
            isUnread: false
          }))
        }));
      },
      clearLoadedMessages() {
        setMessagesByTopicId({});
        setHistoryByTopicId({});
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
      },
      getOlderPreloadBoundary(topicId) {
        return historyByTopicId[topicId]?.olderPreloadBoundaryId ?? null;
      }
    }),
    [
      errorsByTopicId,
      draftsByTopicId,
      clearDraft,
      loadDraft,
      loadMessages,
      preloadOlderMessages,
      ensureMessageSegmentLoaded,
      loadedDraftTopicIds,
      loadedTopicIds,
      messagesByTopicId,
      historyByTopicId,
      saveDraft,
      sendMessage,
      subscribeToMessages,
      updateMessage,
      deleteMessage
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

function getOldestCursor(messages: Message[]): MessageCursor | undefined {
  const oldestMessage = messages[0];

  return oldestMessage ? { createdAt: oldestMessage.createdAt, id: oldestMessage.id } : undefined;
}

function mergeMessages(currentMessages: Message[], nextMessages: Message[]) {
  const messagesById = new Map(currentMessages.map((message) => [message.id, message]));

  nextMessages.forEach((message) => messagesById.set(message.id, message));

  return Array.from(messagesById.values())
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id));
}

function getOlderPreloadBoundaryId(messages: Message[]) {
  if (messages.length === 0) {
    return null;
  }

  // Start the following preload after entering the newest quarter of this older segment.
  return messages[Math.floor(messages.length * 0.75)]?.id ?? messages.at(-1)?.id ?? null;
}
