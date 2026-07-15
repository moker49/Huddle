import { CreateMessageInput, Message } from "@/models/message";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { createId } from "@/utils/createId";

export interface MessageService {
  listMessages(topicId: string): Promise<Message[]>;
  createMessage(input: CreateMessageInput): Promise<Message>;
  resetLocalData(): Promise<void>;
}

const initialMessages: Message[] = [];

const messageStorageKey = "huddle:messages:v2";

function isMessage(value: unknown): value is Message {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "topicId" in value &&
    "body" in value &&
    "authorName" in value &&
    "createdAt" in value &&
    typeof value.id === "string" &&
    typeof value.topicId === "string" &&
    typeof value.body === "string" &&
    typeof value.authorName === "string" &&
    typeof value.createdAt === "string"
  );
}

export class LocalMessageService implements MessageService {
  private messages = [...initialMessages];
  private messagesPromise: Promise<Message[]> | null = null;

  constructor(private readonly storage: JsonStorage = localJsonStorage) {}

  async listMessages(topicId: string): Promise<Message[]> {
    const messages = await this.loadMessages();
    return messages
      .filter((message) => message.topicId === topicId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const body = input.body.trim();

    if (!body) {
      throw new Error("Message is required.");
    }

    const message: Message = {
      id: createId(),
      topicId: input.topicId,
      body,
      authorId: input.authorId,
      authorName: input.authorName,
      createdAt: new Date().toISOString()
    };

    this.messages = [...(await this.loadMessages()), message];
    this.messagesPromise = Promise.resolve(this.messages);
    await this.storage.write(messageStorageKey, this.messages);

    return message;
  }

  async resetLocalData(): Promise<void> {
    this.messages = [...initialMessages];
    this.messagesPromise = Promise.resolve(this.messages);
    await this.storage.remove(messageStorageKey);
  }

  private async loadMessages(): Promise<Message[]> {
    if (!this.messagesPromise) {
      this.messagesPromise = this.storage.read<unknown>(messageStorageKey).then((storedMessages) => {
        if (Array.isArray(storedMessages) && storedMessages.every(isMessage)) {
          this.messages = storedMessages;
        }

        return this.messages;
      });
    }

    return this.messagesPromise;
  }
}

export const messageService = new LocalMessageService();
