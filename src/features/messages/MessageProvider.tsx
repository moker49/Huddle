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
  sendMessage(input: CreateMessageInput): Promise<Message>;
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
      const message = await service.createMessage(input);
      const messages = await service.listMessages(input.topicId);
      setMessagesByTopicId((current) => ({ ...current, [input.topicId]: messages }));
      setErrorsByTopicId((current) => ({ ...current, [input.topicId]: null }));
      return message;
    },
    [service]
  );

  const value = useMemo<MessageContextValue>(
    () => ({
      getMessages(topicId) {
        return messagesByTopicId[topicId] ?? [];
      },
      loadMessages,
      sendMessage,
      isLoading(topicId) {
        return loadingTopicIds[topicId] ?? false;
      },
      getError(topicId) {
        return errorsByTopicId[topicId] ?? null;
      }
    }),
    [errorsByTopicId, loadMessages, loadingTopicIds, messagesByTopicId, sendMessage]
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
