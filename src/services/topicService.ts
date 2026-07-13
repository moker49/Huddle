import { CreateTopicInput, Topic } from "@/models/topic";
import { createId } from "@/utils/createId";

export interface TopicService {
  listTopics(): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | null>;
  createTopic(input: CreateTopicInput): Promise<Topic>;
}

const initialTopics: Topic[] = [
  {
    id: "welcome",
    name: "Weekend plans",
    memberIds: ["kevin", "alex"],
    createdAt: new Date("2026-07-11T12:00:00.000Z").toISOString()
  },
  {
    id: "trail-run",
    name: "Trail run crew",
    memberIds: ["dana", "sam"],
    createdAt: new Date("2026-07-11T12:10:00.000Z").toISOString()
  },
  {
    id: "recipe-swap",
    name: "Recipe swap",
    memberIds: ["alex", "maria", "sam"],
    createdAt: new Date("2026-07-11T12:20:00.000Z").toISOString()
  },
  {
    id: "book-club",
    name: "Book club picks",
    memberIds: ["kevin", "maria"],
    createdAt: new Date("2026-07-11T12:30:00.000Z").toISOString()
  }
];

export class LocalTopicService implements TopicService {
  private topics = [...initialTopics];

  async listTopics(): Promise<Topic[]> {
    return [...this.topics].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTopic(id: string): Promise<Topic | null> {
    return this.topics.find((topic) => topic.id === id) ?? null;
  }

  async createTopic(input: CreateTopicInput): Promise<Topic> {
    const name = input.name.trim();

    if (!name) {
      throw new Error("Huddle name is required.");
    }

    if (!input.memberIds || input.memberIds.length === 0) {
      throw new Error("At least one member is required.");
    }

    const topic: Topic = {
      id: createId(),
      name,
      memberIds: input.memberIds,
      createdAt: new Date().toISOString()
    };

    this.topics = [topic, ...this.topics];

    return topic;
  }
}

export const topicService = new LocalTopicService();
