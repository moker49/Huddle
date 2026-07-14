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
    title: "Weekend plans",
    memberIds: ["erik", "hanna", "kevo"],
    createdAt: new Date("2026-07-11T12:00:00.000Z").toISOString(),
    autoArchiveAt: new Date("2026-07-20T23:59:59.999Z").toISOString()
  },
  {
    id: "trail-run",
    title: "Trail run crew",
    memberIds: ["andre", "karina"],
    createdAt: new Date("2026-07-11T12:10:00.000Z").toISOString(),
    autoArchiveAt: new Date("2026-07-10T23:59:59.999Z").toISOString()
  },
  {
    id: "recipe-swap",
    title: "Recipe swap",
    memberIds: ["hanna", "karina", "russel"],
    createdAt: new Date("2026-07-11T12:20:00.000Z").toISOString()
  },
  {
    id: "book-club",
    title: "Book club picks",
    memberIds: ["erik", "andre", "russel"],
    createdAt: new Date("2026-07-11T12:30:00.000Z").toISOString(),
    autoArchiveAt: new Date("2026-08-01T23:59:59.999Z").toISOString()
  },
  {
    id: "coffee-walks",
    title: "Coffee walks",
    memberIds: ["jay", "kayla", "hanna"],
    createdAt: new Date("2026-07-11T12:40:00.000Z").toISOString()
  },
  {
    id: "movie-night",
    title: "Movie night",
    memberIds: ["kevo", "glenn", "russel", "karina"],
    createdAt: new Date("2026-07-11T12:50:00.000Z").toISOString(),
    autoArchiveAt: new Date("2026-07-12T23:59:59.999Z").toISOString()
  },
  {
    id: "pickup-games",
    title: "Pickup games",
    memberIds: ["andre", "kleb", "jay"],
    createdAt: new Date("2026-07-11T13:00:00.000Z").toISOString()
  },
  {
    id: "project-ideas",
    title: "Project ideas",
    memberIds: ["erik", "glenn", "kayla", "kleb"],
    createdAt: new Date("2026-07-11T13:10:00.000Z").toISOString()
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

    this.topics = [topic, ...this.topics];

    return topic;
  }
}

export const topicService = new LocalTopicService();
