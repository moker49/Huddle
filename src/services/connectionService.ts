import { Connection } from "@/models/connection";
import { getConnectionDisplayName } from "@/models/connectionDisplay";
import { Topic } from "@/models/topic";
import {
  DirectoryUserService,
  directoryUserService,
  findDirectoryUser,
  getDirectoryConnectionForMemberId,
  normalizeIdentifier,
  userToConnection
} from "@/services/directoryUsers";
import { getAutoNetworkMemberIdsForPhone } from "@/services/inboundHuddleFixtures";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { getLocalMemberIds, topicIsVisibleToUser } from "@/services/topicVisibility";
import { UserService, userService } from "@/services/userService";

export interface ConnectionService {
  listConnections(): Promise<Connection[]>;
  addConnection(identifier: string): Promise<Connection>;
  resetLocalData(): Promise<void>;
}

const networkStorageKey = "huddle:network-user-ids";
const topicStorageKey = "huddle:topics:v2";

function isNetworkUserIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((userId) => typeof userId === "string");
}

export class LocalConnectionService implements ConnectionService {
  private networkUserIds: string[] = [];
  private networkUserIdsPromise: Promise<string[]> | null = null;

  constructor(
    private readonly storage: JsonStorage = localJsonStorage,
    private readonly users: UserService = userService,
    private readonly directoryUsers: DirectoryUserService = directoryUserService
  ) {}

  async listConnections(): Promise<Connection[]> {
    const networkUserIds = await this.loadNetworkUserIds();
    const localUser = await this.users.getUser();
    const directoryUsers = await this.directoryUsers.listUsers();
    const autoNetworkUserIds = getAutoNetworkMemberIdsForPhone(localUser.phoneNumber);
    const localHuddleNetworkUserIds = await this.loadLocalHuddleNetworkUserIds(directoryUsers);
    const networkUserIdSet = new Set([
      ...networkUserIds,
      ...autoNetworkUserIds,
      ...localHuddleNetworkUserIds
    ]);

    return Array.from(networkUserIdSet)
      .map((networkEntry) => resolveNetworkEntry(networkEntry, directoryUsers))
      .filter((connection): connection is Connection => Boolean(connection))
      .sort((a, b) => getConnectionDisplayName(a).localeCompare(getConnectionDisplayName(b)));
  }

  async addConnection(identifier: string): Promise<Connection> {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const directoryUsers = await this.directoryUsers.listUsers();
    const user = findDirectoryUser(directoryUsers, normalizedIdentifier);

    if (!normalizedIdentifier) {
      throw new Error("User could not be found.");
    }

    const connection = user ? userToConnection(user) : createPhoneConnection(normalizedIdentifier);
    const networkEntry = user ? user.id : connection.id;
    const networkUserIds = await this.loadNetworkUserIds();

    if (!networkUserIds.includes(networkEntry)) {
      this.networkUserIds = [...networkUserIds, networkEntry];
      await this.saveNetworkUserIds();
    }

    return connection;
  }

  async resetLocalData(): Promise<void> {
    this.networkUserIds = [];
    this.networkUserIdsPromise = Promise.resolve(this.networkUserIds);
    await this.storage.remove(networkStorageKey);
  }

  private async loadNetworkUserIds(): Promise<string[]> {
    if (!this.networkUserIdsPromise) {
      this.networkUserIdsPromise = this.storage
        .read<unknown>(networkStorageKey)
        .then((storedUserIds) => {
          if (isNetworkUserIds(storedUserIds)) {
            this.networkUserIds = storedUserIds;
          }

          return this.networkUserIds;
        });
    }

    return this.networkUserIdsPromise;
  }

  private async saveNetworkUserIds() {
    this.networkUserIdsPromise = Promise.resolve(this.networkUserIds);
    await this.storage.write(networkStorageKey, this.networkUserIds);
  }

  private async loadLocalHuddleNetworkUserIds(directoryUsers: Awaited<ReturnType<DirectoryUserService["listUsers"]>>) {
    const localUser = await this.users.getUser();
    const storedTopics = await this.storage.read<unknown>(topicStorageKey);

    if (!Array.isArray(storedTopics) || !storedTopics.every(isStoredTopic)) {
      return [];
    }

    const localMemberIds = getLocalMemberIds(localUser, directoryUsers);

    return Array.from(new Set(
      storedTopics
        .filter((topic) => topicIsVisibleToUser(topic, localUser, directoryUsers))
        .flatMap((topic) => topic.memberIds)
        .filter((memberId) => !localMemberIds.has(memberId))
    ));
  }
}

function resolveNetworkEntry(
  networkEntry: string,
  directoryUsers: Awaited<ReturnType<DirectoryUserService["listUsers"]>>
) {
  const userById = getDirectoryConnectionForMemberId(directoryUsers, networkEntry);

  if (userById) {
    return userById;
  }

  if (isPhoneIdentifier(networkEntry)) {
    return createPhoneConnection(networkEntry);
  }

  return null;
}

function isPhoneIdentifier(identifier: string) {
  return /^#\d+$/.test(identifier) || /^phone:#\d+$/.test(identifier);
}

function createPhoneConnection(identifier: string): Connection {
  const phoneNumber = identifier.startsWith("phone:")
    ? identifier.slice("phone:".length)
    : identifier;

  if (!/^#\d+$/.test(phoneNumber)) {
    throw new Error("User could not be found.");
  }

  return {
    id: `phone:${phoneNumber}`,
    displayName: "",
    tag: "",
    phoneNumber,
    createdAt: new Date("2026-07-15T12:00:00.000Z").toISOString()
  };
}

function isStoredTopic(value: unknown): value is Topic {
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
    typeof value.createdAt === "string"
  );
}

export const connectionService = new LocalConnectionService();
