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
  setAccountScope(accountId: string | null): void;
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

  setAccountScope(_accountId: string | null): void {}

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

export class SupabaseConnectionService implements ConnectionService {
  private accountScope: string | null = null;

  constructor(private readonly directoryUsers: DirectoryUserService = directoryUserService) {}

  setAccountScope(accountId: string | null): void {
    this.accountScope = accountId;
  }

  async listConnections(): Promise<Connection[]> {
    const ownerId = this.requireAccountScope();
    const { supabase } = await import("@/services/supabaseClient");
    const { error: synchronizationError } = await supabase.rpc(
      "sync_current_user_huddle_network"
    );

    if (synchronizationError) {
      throw synchronizationError;
    }

    const { data, error } = await supabase
      .from("network_members")
      .select("member_id, member_tag, member_phone_number, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const users = await this.directoryUsers.listUsers();

    return (data ?? [])
      .map((entry) => resolveCloudConnection(entry, users))
      .filter((connection): connection is Connection => Boolean(connection))
      .sort((a, b) => getConnectionDisplayName(a).localeCompare(getConnectionDisplayName(b)));
  }

  async addConnection(identifier: string): Promise<Connection> {
    const ownerId = this.requireAccountScope();
    const { supabase } = await import("@/services/supabaseClient");
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (!normalizedIdentifier) {
      throw new Error("User could not be found.");
    }

    const users = await this.directoryUsers.listUsers();
    const user = findDirectoryUser(users, normalizedIdentifier);
    const memberTag = !user && normalizedIdentifier.startsWith("@") ? normalizedIdentifier : null;
    const memberPhoneNumber = !user && normalizedIdentifier.startsWith("#")
      ? normalizedIdentifier
      : null;
    const { data: existingEntries, error: existingError } = await supabase
      .from("network_members")
      .select("id")
      .eq("owner_id", ownerId)
      .or(
        user
          ? `member_id.eq.${user.id}`
          : memberTag
            ? `member_tag.eq.${memberTag}`
            : `member_phone_number.eq.${memberPhoneNumber}`
      );

    if (existingError) {
      throw existingError;
    }

    if (!existingEntries?.length) {
      const { error } = await supabase.from("network_members").insert({
        owner_id: ownerId,
        member_id: user?.id ?? null,
        member_tag: memberTag,
        member_phone_number: memberPhoneNumber
      });

      if (error) {
        throw error;
      }
    }

    return user ? userToConnection(user) : createPhoneConnection(normalizedIdentifier);
  }

  async resetLocalData(): Promise<void> {}

  private requireAccountScope() {
    if (!this.accountScope) {
      throw new Error("An authenticated account is required.");
    }

    return this.accountScope;
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

function resolveCloudConnection(
  entry: {
    member_id: string | null;
    member_tag: string | null;
    member_phone_number: string | null;
    created_at: string;
  },
  users: Awaited<ReturnType<DirectoryUserService["listUsers"]>>
) {
  const user = entry.member_id
    ? getDirectoryConnectionForMemberId(users, entry.member_id)
    : entry.member_tag
      ? getDirectoryConnectionForMemberId(users, entry.member_tag)
      : entry.member_phone_number
        ? getDirectoryConnectionForMemberId(users, entry.member_phone_number)
        : null;

  if (user) {
    return user;
  }

  const identifier = entry.member_tag ?? entry.member_phone_number;

  if (!identifier || entry.member_tag) {
    return null;
  }

  return {
    ...createPhoneConnection(identifier),
    createdAt: entry.created_at
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

export const localConnectionService = new LocalConnectionService();
export const connectionService = new SupabaseConnectionService();
