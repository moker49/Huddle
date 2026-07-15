import { CreateTopicInput, Topic, UpdateTopicInput } from "@/models/topic";
import { LocalUser } from "@/models/user";
import { DirectoryUser } from "@/models/directoryUser";
import {
  DirectoryUserService,
  directoryUserService,
  getDirectoryConnectionForMemberId,
  getDirectoryUserIdForIdentifier
} from "@/services/directoryUsers";
import { getVisibleInboundHuddleTopics } from "@/services/inboundHuddleFixtures";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { MessageService, messageService } from "@/services/messageService";
import { topicIsVisibleToUser } from "@/services/topicVisibility";
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
    (!("ownerId" in value) || typeof value.ownerId === "string") &&
    (!("ownerTag" in value) || typeof value.ownerTag === "string") &&
    (!("ownerPhoneNumber" in value) || typeof value.ownerPhoneNumber === "string") &&
    typeof value.createdAt === "string" &&
    (!("autoArchiveAt" in value) || typeof value.autoArchiveAt === "string")
  );
}

export class LocalTopicService implements TopicService {
  private topics = [...initialTopics];
  private topicsPromise: Promise<Topic[]> | null = null;

  constructor(
    private readonly storage: JsonStorage = localJsonStorage,
    private readonly users: UserService = userService,
    private readonly directoryUsers: DirectoryUserService = directoryUserService,
    private readonly messages: MessageService = messageService
  ) {}

  async listTopics(): Promise<Topic[]> {
    const topics = await this.loadTopics();
    const localUser = await this.users.getUser();
    const directoryUsers = await this.directoryUsers.listUsers();
    const visibleTopics = topics.filter((topic) =>
      topicIsVisibleToUser(topic, localUser, directoryUsers)
    );
    const visibleInboundTopics = getVisibleInboundHuddleTopics(
      localUser.id,
      localUser.phoneNumber
    );
    const topicById = new Map(
      [...visibleTopics, ...visibleInboundTopics].map((topic) => [topic.id, topic])
    );

    return Array.from(topicById.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTopic(id: string): Promise<Topic | null> {
    const topics = await this.listTopics();

    return topics.find((topic) => topic.id === id) ?? null;
  }

  async createTopic(input: CreateTopicInput): Promise<Topic> {
    const title = input.title.trim();
    const localUser = await this.users.getUser();
    const directoryUsers = await this.directoryUsers.listUsers();

    if (!title) {
      throw new Error("Huddle title is required.");
    }

    if (!input.memberIds || input.memberIds.length === 0) {
      throw new Error("At least one member is required.");
    }

    const topic: Topic = {
      id: createId(),
      title,
      memberIds: getTopicMemberIds(input.memberIds, localUser, directoryUsers),
      ownerId: localUser.id,
      ownerTag: localUser.tag,
      ownerPhoneNumber: localUser.phoneNumber,
      createdAt: new Date().toISOString(),
      autoArchiveAt: input.autoArchiveAt
    };

    this.topics = [topic, ...(await this.loadTopics())];
    await this.saveTopics();
    await this.messages.createActivity({
      topicId: topic.id,
      body: "Huddle created",
      activityType: "huddle_created"
    });

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
    const directoryUsers = await this.directoryUsers.listUsers();
    const topicIndex = topics.findIndex((topic) => topic.id === id);

    if (topicIndex === -1) {
      throw new Error("Huddle could not be found.");
    }

    const currentTopic = topics[topicIndex];
    const nextMemberIds = getTopicMemberIds(input.memberIds, currentTopic, directoryUsers);
    const topic: Topic = {
      ...currentTopic,
      title,
      memberIds: nextMemberIds,
      autoArchiveAt: input.autoArchiveAt
    };

    this.topics = topics.map((currentTopic) => (
      currentTopic.id === id ? topic : currentTopic
    ));
    await this.saveTopics();
    await this.createUpdateActivities(currentTopic, topic, directoryUsers);

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

  private async createUpdateActivities(
    previousTopic: Topic,
    nextTopic: Topic,
    directoryUsers: DirectoryUser[]
  ) {
    if (previousTopic.title !== nextTopic.title) {
      await this.messages.createActivity({
        topicId: nextTopic.id,
        body: `Title updated from "${previousTopic.title}" to "${nextTopic.title}"`,
        activityType: "title_updated"
      });
    }

    const previousMemberIds = new Set(previousTopic.memberIds);
    const nextMemberIds = new Set(nextTopic.memberIds);
    const addedMemberIds = nextTopic.memberIds.filter((memberId) => !previousMemberIds.has(memberId));
    const removedMemberIds = previousTopic.memberIds.filter((memberId) => !nextMemberIds.has(memberId));

    for (const memberId of addedMemberIds) {
      await this.messages.createActivity({
        topicId: nextTopic.id,
        body: `Member added: ${getMemberDisplayName(memberId, directoryUsers)}`,
        activityType: "member_added"
      });
    }

    for (const memberId of removedMemberIds) {
      await this.messages.createActivity({
        topicId: nextTopic.id,
        body: `Member removed: ${getMemberDisplayName(memberId, directoryUsers)}`,
        activityType: "member_removed"
      });
    }
  }
}

function getTopicMemberIds(
  inputMemberIds: string[],
  creator: LocalUser | Topic,
  directoryUsers: DirectoryUser[]
) {
  const creatorMemberId = getCreatorMemberId(creator, directoryUsers);

  return Array.from(new Set([
    ...(creatorMemberId ? [creatorMemberId] : []),
    ...inputMemberIds
  ]));
}

function getCreatorMemberId(creator: LocalUser | Topic, directoryUsers: DirectoryUser[]) {
  if ("memberIds" in creator) {
    const directoryMemberId =
      getDirectoryUserIdForIdentifier(directoryUsers, creator.ownerTag ?? "") ??
      getDirectoryUserIdForIdentifier(directoryUsers, creator.ownerPhoneNumber ?? "");

    return directoryMemberId
      ?? creator.ownerId
      ?? null;
  }

  const directoryMemberId =
    getDirectoryUserIdForIdentifier(directoryUsers, creator.tag) ??
    getDirectoryUserIdForIdentifier(directoryUsers, creator.phoneNumber);

  return directoryMemberId
    ?? creator.id
    ?? null;
}

function getMemberDisplayName(memberId: string, directoryUsers: DirectoryUser[]) {
  const connection = getDirectoryConnectionForMemberId(directoryUsers, memberId);

  return connection?.displayName || connection?.tag || connection?.phoneNumber || memberId;
}

export const topicService = new LocalTopicService();
