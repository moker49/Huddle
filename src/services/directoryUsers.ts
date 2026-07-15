import { Connection } from "@/models/connection";
import { DirectoryUser } from "@/models/directoryUser";
import { LocalUser } from "@/models/user";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";

export interface DirectoryUserService {
  listUsers(): Promise<DirectoryUser[]>;
  upsertLocalUser(user: LocalUser): Promise<void>;
  resetLocalData(): Promise<void>;
}

export const defaultUsers: DirectoryUser[] = [
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

const directoryStorageKey = "huddle:directory-users";

function isDirectoryUsers(value: unknown): value is DirectoryUser[] {
  return (
    Array.isArray(value) &&
    value.every((user) => (
      typeof user === "object" &&
      user !== null &&
      "id" in user &&
      "displayName" in user &&
      "tag" in user &&
      "phoneNumber" in user &&
      "createdAt" in user &&
      typeof user.id === "string" &&
      typeof user.displayName === "string" &&
      typeof user.tag === "string" &&
      typeof user.phoneNumber === "string" &&
      typeof user.createdAt === "string"
    ))
  );
}

export class LocalDirectoryUserService implements DirectoryUserService {
  private users = [...defaultUsers];
  private usersPromise: Promise<DirectoryUser[]> | null = null;

  constructor(private readonly storage: JsonStorage = localJsonStorage) {}

  async listUsers(): Promise<DirectoryUser[]> {
    if (!this.usersPromise) {
      this.usersPromise = this.storage.read<unknown>(directoryStorageKey).then((storedUsers) => {
        if (isDirectoryUsers(storedUsers)) {
          this.users = mergeDirectoryUsers(defaultUsers, storedUsers);
        }

        return this.users;
      });
    }

    return this.usersPromise;
  }

  async upsertLocalUser(user: LocalUser): Promise<void> {
    const users = await this.listUsers();
    const matchingUser = users.find((currentUser) => usersIdentifySamePerson(
      currentUser,
      localUserToDirectoryUser(user)
    ));
    const directoryUser = localUserToDirectoryUser(user, matchingUser?.id);

    this.users = mergeDirectoryUsers(
      users.filter((currentUser) => !usersIdentifySamePerson(currentUser, directoryUser)),
      [directoryUser]
    );
    this.usersPromise = Promise.resolve(this.users);
    await this.storage.write(directoryStorageKey, this.users);
  }

  async resetLocalData(): Promise<void> {
    this.users = [...defaultUsers];
    this.usersPromise = Promise.resolve(this.users);
    await this.storage.remove(directoryStorageKey);
  }
}

export function findDirectoryUser(users: DirectoryUser[], identifier: string) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  if (!normalizedIdentifier) {
    return null;
  }

  return users.find((user) => (
    user.id.toLocaleLowerCase() === normalizedIdentifier ||
    user.tag.toLocaleLowerCase() === normalizedIdentifier ||
    user.phoneNumber.toLocaleLowerCase() === normalizedIdentifier
  )) ?? null;
}

export function getDirectoryUserIdForIdentifier(users: DirectoryUser[], identifier: string) {
  return findDirectoryUser(users, identifier)?.id ?? null;
}

export function getDirectoryConnectionById(users: DirectoryUser[], id: string) {
  const user = users.find((directoryUser) => directoryUser.id === id);

  return user ? userToConnection(user) : null;
}

export function getDirectoryConnectionForMemberId(users: DirectoryUser[], memberId: string) {
  return getDirectoryConnectionById(users, memberId) ?? userToConnectionOrNull(
    findDirectoryUser(users, memberId)
  );
}

export function normalizeIdentifier(identifier: string) {
  const trimmedIdentifier = identifier.trim().toLocaleLowerCase();

  if (!trimmedIdentifier) {
    return "";
  }

  if (trimmedIdentifier.startsWith("phone:")) {
    return normalizeIdentifier(trimmedIdentifier.slice("phone:".length));
  }

  if (trimmedIdentifier.startsWith("@") || trimmedIdentifier.startsWith("#")) {
    return trimmedIdentifier;
  }

  return /^\d/.test(trimmedIdentifier)
    ? `#${trimmedIdentifier}`
    : `@${trimmedIdentifier}`;
}

export function userToConnection(user: DirectoryUser): Connection {
  return {
    id: user.id,
    displayName: user.displayName,
    tag: user.tag,
    phoneNumber: user.phoneNumber,
    createdAt: user.createdAt
  };
}

function localUserToDirectoryUser(user: LocalUser, id: string = user.id): DirectoryUser {
  return {
    id,
    displayName: user.displayName,
    tag: user.tag,
    phoneNumber: user.phoneNumber,
    createdAt: new Date("2026-07-15T12:00:00.000Z").toISOString()
  };
}

function mergeDirectoryUsers(baseUsers: DirectoryUser[], nextUsers: DirectoryUser[]) {
  return Array.from(
    new Map([...baseUsers, ...nextUsers].map((user) => [user.id, user])).values()
  );
}

function userToConnectionOrNull(user: DirectoryUser | null) {
  return user ? userToConnection(user) : null;
}

function usersIdentifySamePerson(left: DirectoryUser, right: DirectoryUser) {
  return (
    left.id === right.id ||
    Boolean(left.tag && right.tag && left.tag === right.tag) ||
    Boolean(left.phoneNumber && right.phoneNumber && left.phoneNumber === right.phoneNumber)
  );
}

export const directoryUserService = new LocalDirectoryUserService();
