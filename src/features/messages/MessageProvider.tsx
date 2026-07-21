import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

import { CreateMessageInput, Message } from "@/models/message";
import { MessageService, messageService } from "@/services/messageService";

interface MessageContextValue {
  getMessages(topicId: string): Message[];
  loadMessages(topicId: string): Promise<void>;
  subscribeToMessages(topicId: string): Promise<() => void>;
  sendMessage(input: CreateMessageInput): Promise<Message>;
  clearLoadedMessages(): void;
  isLoading(topicId: string): boolean;
  getError(topicId: string): string | null;
}

const MessageContext = createContext<MessageContextValue | null>(null);

interface MessageProviderProps extends PropsWithChildren {
  service?: MessageService;
}

export function MessageProvider({ children, service = messageService }: MessageProviderProps) {
  const [messagesByTopicId, setMessagesByTopicId] = useState<Record<string, Message[]>>({});
  const [loadingTopicIds, setLoadingTopicIds] = useState<Record<string, boolean>>({});
  const [errorsByTopicId, setErrorsByTopicId] = useState<Record<string, string | null>>({});

  const loadMessages = useCallback(
    async (topicId: string) => {
      setLoadingTopicIds((current) => ({ ...current, [topicId]: true }));

      try {
        const messages = await service.listMessages(topicId);
        setMessagesByTopicId((current) => ({ ...current, [topicId]: messages }));
        setErrorsByTopicId((current) => ({ ...current, [topicId]: null }));
      } catch {
        setErrorsByTopicId((current) => ({
          ...current,
          [topicId]: "Messages could not be loaded."
        }));
      } finally {
        setLoadingTopicIds((current) => ({ ...current, [topicId]: false }));
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
        createdAt: new Date().toISOString()
      };

      setMessagesByTopicId((current) => ({
        ...current,
        [input.topicId]: [...(current[input.topicId] ?? []), optimisticMessage]
      }));
      setErrorsByTopicId((current) => ({ ...current, [input.topicId]: null }));

      try {
        const message = await service.createMessage(input);
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
    [service]
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
      clearLoadedMessages() {
        setMessagesByTopicId({});
        setLoadingTopicIds({});
        setErrorsByTopicId({});
      },
      isLoading(topicId) {
        return loadingTopicIds[topicId] ?? false;
      },
      getError(topicId) {
        return errorsByTopicId[topicId] ?? null;
      }
    }),
    [errorsByTopicId, loadMessages, loadingTopicIds, messagesByTopicId, sendMessage, subscribeToMessages]
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
