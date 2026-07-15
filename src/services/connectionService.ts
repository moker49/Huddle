import { Connection } from "@/models/connection";
import { DirectoryUser } from "@/models/directoryUser";
import { getAutoNetworkMemberIdsForPhone } from "@/services/inboundHuddleFixtures";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { UserService, userService } from "@/services/userService";

export interface ConnectionService {
  listConnections(): Promise<Connection[]>;
  addConnection(identifier: string): Promise<Connection>;
  resetLocalData(): Promise<void>;
}

const defaultUsers: DirectoryUser[] = [
  createDefaultUser("erik", 1),
  createDefaultUser("hanna", 2),
  createDefaultUser("kevo", 3),
  createDefaultUser("andre", 4),
  createDefaultUser("karina", 5),
  createDefaultUser("russel", 6),
  createDefaultUser("kleb", 7),
  createDefaultUser("jay", 8),
  createDefaultUser("glenn", 9),
  createDefaultUser("kayla", 10)
];

const networkStorageKey = "huddle:network-user-ids";

function createDefaultUser(name: string, index: number): DirectoryUser {
  return {
    id: name,
    displayName: name,
    tag: `@${name}`,
    phoneNumber: `#${index}`,
    createdAt: new Date(`2026-07-11T13:${String(index - 1).padStart(2, "0")}:00.000Z`)
      .toISOString()
  };
}

function isNetworkUserIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((userId) => typeof userId === "string");
}

export class LocalConnectionService implements ConnectionService {
  private networkUserIds: string[] = [];
  private networkUserIdsPromise: Promise<string[]> | null = null;

  constructor(
    private readonly storage: JsonStorage = localJsonStorage,
    private readonly users: UserService = userService
  ) {}

  async listConnections(): Promise<Connection[]> {
    const networkUserIds = await this.loadNetworkUserIds();
    const localUser = await this.users.getUser();
    const autoNetworkUserIds = getAutoNetworkMemberIdsForPhone(localUser.phoneNumber);
    const networkUserIdSet = new Set([...networkUserIds, ...autoNetworkUserIds]);

    return defaultUsers
      .filter((user) => networkUserIdSet.has(user.id))
      .map(userToConnection)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async addConnection(identifier: string): Promise<Connection> {
    const user = findDirectoryUser(identifier);

    if (!user) {
      throw new Error("User could not be found.");
    }

    const networkUserIds = await this.loadNetworkUserIds();

    if (!networkUserIds.includes(user.id)) {
      this.networkUserIds = [...networkUserIds, user.id];
      await this.saveNetworkUserIds();
    }

    return userToConnection(user);
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
}

function findDirectoryUser(identifier: string) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    return null;
  }

  return defaultUsers.find((user) => (
    user.tag.toLocaleLowerCase() === normalizedIdentifier ||
    user.phoneNumber.toLocaleLowerCase() === normalizedIdentifier
  )) ?? null;
}

function normalizeIdentifier(identifier: string) {
  const trimmedIdentifier = identifier.trim().toLocaleLowerCase();

  if (!trimmedIdentifier) {
    return "";
  }

  if (trimmedIdentifier.startsWith("@") || trimmedIdentifier.startsWith("#")) {
    return trimmedIdentifier;
  }

  return /^\d/.test(trimmedIdentifier)
    ? `#${trimmedIdentifier}`
    : `@${trimmedIdentifier}`;
}

function userToConnection(user: DirectoryUser): Connection {
  return {
    id: user.id,
    displayName: user.displayName,
    tag: user.tag,
    phoneNumber: user.phoneNumber,
    createdAt: user.createdAt
  };
}

export const connectionService = new LocalConnectionService();
