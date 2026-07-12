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
    createdAt: new Date("2026-07-11T12:00:00.000Z").toISOString()
  }
];

export class InMemoryTopicService implements TopicService {
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
      throw new Error("Topic name is required.");
    }

    const topic: Topic = {
      id: createId(),
      name,
      createdAt: new Date().toISOString()
    };

    this.topics = [topic, ...this.topics];

    return topic;
  }
}

export const topicService = new InMemoryTopicService();
