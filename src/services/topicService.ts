import { CreateTopicInput, Topic, UpdateTopicInput } from "@/models/topic";
import { getVisibleInboundHuddleTopics } from "@/services/inboundHuddleFixtures";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { UserService, userService } from "@/services/userService";
import { createId } from "@/utils/createId";

export interface TopicService {
  listTopics(): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | null>;
  createTopic(input: CreateTopicInput): Promise<Topic>;
  updateTopic(id: string, input: UpdateTopicInput): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;
  resetLocalData(): Promise<void>;
}

const initialTopics: Topic[] = [];

const topicStorageKey = "huddle:topics:v2";

function isTopic(value: unknown): value is Topic {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "title" in value &&
    "memberIds" in value &&
    "createdAt" in value &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.memberIds) &&
    value.memberIds.every((memberId) => typeof memberId === "string") &&
    typeof value.createdAt === "string" &&
    (!("autoArchiveAt" in value) || typeof value.autoArchiveAt === "string")
  );
}

export class LocalTopicService implements TopicService {
  private topics = [...initialTopics];
  private topicsPromise: Promise<Topic[]> | null = null;

  constructor(
    private readonly storage: JsonStorage = localJsonStorage,
    private readonly users: UserService = userService
  ) {}

  async listTopics(): Promise<Topic[]> {
    const topics = await this.loadTopics();
    const localUser = await this.users.getUser();
    const visibleInboundTopics = getVisibleInboundHuddleTopics(
      localUser.id,
      localUser.phoneNumber
    );
    const topicById = new Map(
      [...topics, ...visibleInboundTopics].map((topic) => [topic.id, topic])
    );

    return Array.from(topicById.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTopic(id: string): Promise<Topic | null> {
    const topics = await this.listTopics();

    return topics.find((topic) => topic.id === id) ?? null;
  }

  async createTopic(input: CreateTopicInput): Promise<Topic> {
    const title = input.title.trim();

    if (!title) {
      throw new Error("Huddle title is required.");
    }

    if (!input.memberIds || input.memberIds.length === 0) {
      throw new Error("At least one member is required.");
    }

    const topic: Topic = {
      id: createId(),
      title,
      memberIds: input.memberIds,
      createdAt: new Date().toISOString(),
      autoArchiveAt: input.autoArchiveAt
    };

    this.topics = [topic, ...(await this.loadTopics())];
    await this.saveTopics();

    return topic;
  }

  async updateTopic(id: string, input: UpdateTopicInput): Promise<Topic> {
    const title = input.title.trim();

    if (!title) {
      throw new Error("Huddle title is required.");
    }

    if (!input.memberIds || input.memberIds.length === 0) {
      throw new Error("At least one member is required.");
    }

    const topics = await this.loadTopics();
    const topicIndex = topics.findIndex((topic) => topic.id === id);

    if (topicIndex === -1) {
      throw new Error("Huddle could not be found.");
    }

    const topic: Topic = {
      ...topics[topicIndex],
      title,
      memberIds: input.memberIds,
      autoArchiveAt: input.autoArchiveAt
    };

    this.topics = topics.map((currentTopic) => (
      currentTopic.id === id ? topic : currentTopic
    ));
    await this.saveTopics();

    return topic;
  }

  async deleteTopic(id: string): Promise<void> {
    this.topics = (await this.loadTopics()).filter((topic) => topic.id !== id);
    await this.saveTopics();
  }

  async resetLocalData(): Promise<void> {
    this.topics = [...initialTopics];
    this.topicsPromise = Promise.resolve(this.topics);
    await this.storage.remove(topicStorageKey);
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

  private async saveTopics() {
    this.topicsPromise = Promise.resolve(this.topics);
    await this.storage.write(topicStorageKey, this.topics);
  }
}

export const topicService = new LocalTopicService();
