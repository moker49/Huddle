import { LocalUser } from "@/models/user";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { createId } from "@/utils/createId";

export interface UserService {
  getUser(): Promise<LocalUser>;
  updateDisplayName(displayName: string): Promise<LocalUser>;
}

const userStorageKey = "huddle:local-user";

function isLocalUser(value: unknown): value is LocalUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "displayName" in value &&
    typeof value.id === "string" &&
    typeof value.displayName === "string"
  );
}

export class LocalUserService implements UserService {
  private userPromise: Promise<LocalUser> | null = null;

  constructor(private readonly storage: JsonStorage = localJsonStorage) {}

  async getUser(): Promise<LocalUser> {
    if (!this.userPromise) {
      this.userPromise = this.loadUser();
    }

    return this.userPromise;
  }

  async updateDisplayName(displayName: string): Promise<LocalUser> {
    const nextDisplayName = displayName.trim();

    if (!nextDisplayName) {
      throw new Error("Display name is required.");
    }

    const currentUser = await this.getUser();
    const nextUser: LocalUser = {
      ...currentUser,
      displayName: nextDisplayName
    };

    this.userPromise = Promise.resolve(nextUser);
    await this.storage.write(userStorageKey, nextUser);

    return nextUser;
  }

  private async loadUser(): Promise<LocalUser> {
    const storedUser = await this.storage.read<unknown>(userStorageKey);

    if (isLocalUser(storedUser)) {
      return storedUser;
    }

    const user: LocalUser = {
      id: createId(),
      displayName: ""
    };

    await this.storage.write(userStorageKey, user);

    return user;
  }
}

export const userService = new LocalUserService();
