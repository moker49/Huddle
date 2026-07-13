import { CreateTopicInput, Topic } from "@/models/topic";
import { createId } from "@/utils/createId";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";

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

const topicStorageKey = "huddle:topics";

function isTopic(value: unknown): value is Topic {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "createdAt" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.createdAt === "string"
  );
}

export class LocalTopicService implements TopicService {
  private topics = [...initialTopics];
  private topicsPromise: Promise<Topic[]> | null = null;

  constructor(private readonly storage: JsonStorage = localJsonStorage) {}

  async listTopics(): Promise<Topic[]> {
    const topics = await this.loadTopics();
    return [...topics].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTopic(id: string): Promise<Topic | null> {
    const topics = await this.loadTopics();
    return topics.find((topic) => topic.id === id) ?? null;
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

    this.topics = [topic, ...(await this.loadTopics())];
    this.topicsPromise = Promise.resolve(this.topics);
    await this.storage.write(topicStorageKey, this.topics);

    return topic;
  }

  private async loadTopics(): Promise<Topic[]> {
    if (!this.topicsPromise) {
      this.topicsPromise = this.storage.read<unknown>(topicStorageKey).then((storedTopics) => {
        if (Array.isArray(storedTopics) && storedTopics.every(isTopic)) {
          this.topics = storedTopics;
        }

        return this.topics;
      });
    }

    return this.topicsPromise;
  }
}

export const topicService = new LocalTopicService();
