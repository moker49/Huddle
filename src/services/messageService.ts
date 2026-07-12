import { CreateMessageInput, Message } from "@/models/message";
import { createId } from "@/utils/createId";

export interface MessageService {
  listMessages(topicId: string): Promise<Message[]>;
  createMessage(input: CreateMessageInput): Promise<Message>;
}

const localAuthorName = "You";

const initialMessages: Message[] = [
  {
    id: "welcome-message-1",
    topicId: "welcome",
    body: "Looking forward to the next group plan. Loved the last one.",
    authorName: "Mario",
    createdAt: new Date("2026-07-11T12:10:00.000Z").toISOString()
  },
  {
    id: "welcome-message-2",
    topicId: "welcome",
    body: "Does anyone have ideas that they want to add?",
    authorName: "Anna",
    createdAt: new Date("2026-07-11T12:16:00.000Z").toISOString()
  },
  {
    id: "welcome-message-3",
    topicId: "welcome",
    body: "I am thinking of hosting this evening. Who is available?",
    authorName: "Amanda",
    createdAt: new Date("2026-07-11T12:22:00.000Z").toISOString()
  }
];

export class InMemoryMessageService implements MessageService {
  private messages = [...initialMessages];

  async listMessages(topicId: string): Promise<Message[]> {
    return this.messages
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
      authorName: localAuthorName,
      createdAt: new Date().toISOString()
    };

    this.messages = [...this.messages, message];

    return message;
  }
}

export const messageService = new InMemoryMessageService();
