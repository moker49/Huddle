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
    connectionIds: ["kevin", "alex"],
    createdAt: new Date("2026-07-11T12:00:00.000Z").toISOString()
  },
  {
    id: "trail-run",
    name: "Trail run crew",
    connectionIds: ["dana", "sam"],
    createdAt: new Date("2026-07-11T12:10:00.000Z").toISOString()
  },
  {
    id: "recipe-swap",
    name: "Recipe swap",
    connectionIds: ["alex", "maria", "sam"],
    createdAt: new Date("2026-07-11T12:20:00.000Z").toISOString()
  },
  {
    id: "book-club",
    name: "Book club picks",
    connectionIds: ["kevin", "maria"],
    createdAt: new Date("2026-07-11T12:30:00.000Z").toISOString()
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
    typeof value.createdAt === "string" &&
    (
      !("connectionIds" in value) ||
      (Array.isArray(value.connectionIds) &&
        value.connectionIds.every((connectionId) => typeof connectionId === "string"))
    )
  );
}

function normalizeTopic(topic: Topic): Topic {
  const initialTopic = initialTopics.find((candidate) => candidate.id === topic.id);

  return {
    ...topic,
    connectionIds: topic.connectionIds ?? initialTopic?.connectionIds ?? []
  };
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
      throw new Error("Huddle name is required.");
    }

    const topic: Topic = {
      id: createId(),
      name,
      connectionIds: input.connectionIds ?? [],
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
          const normalizedTopics = storedTopics.map(normalizeTopic);
          const storedTopicIds = new Set(normalizedTopics.map((topic) => topic.id));
          const missingInitialTopics = initialTopics.filter(
            (topic) => !storedTopicIds.has(topic.id)
          );
          this.topics = [...normalizedTopics, ...missingInitialTopics];
        }

        return this.topics;
      });
    }

    return this.topicsPromise;
  }
}

export const topicService = new LocalTopicService();
