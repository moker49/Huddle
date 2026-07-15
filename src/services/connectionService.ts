import { Connection } from "@/models/connection";
import { getConnectionDisplayName } from "@/models/connectionDisplay";
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

    return Array.from(networkUserIdSet)
      .map(resolveNetworkEntry)
      .filter((connection): connection is Connection => Boolean(connection))
      .sort((a, b) => getConnectionDisplayName(a).localeCompare(getConnectionDisplayName(b)));
  }

  async addConnection(identifier: string): Promise<Connection> {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const user = findDirectoryUser(normalizedIdentifier);

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
}

function findDirectoryUser(normalizedIdentifier: string) {
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

function resolveNetworkEntry(networkEntry: string) {
  const userById = defaultUsers.find((user) => user.id === networkEntry);

  if (userById) {
    return userToConnection(userById);
  }

  const userByIdentifier = findDirectoryUser(networkEntry);

  if (userByIdentifier) {
    return userToConnection(userByIdentifier);
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
