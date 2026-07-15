import { LocalUser, LocalUserProfileInput } from "@/models/user";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { createId } from "@/utils/createId";

export interface UserService {
  getUser(): Promise<LocalUser>;
  updateIdentifiers(identifiers: Pick<LocalUserProfileInput, "tag" | "phoneNumber">): Promise<LocalUser>;
  updateProfile(profile: LocalUserProfileInput): Promise<LocalUser>;
  updateDisplayName(displayName: string): Promise<LocalUser>;
  resetLocalData(): Promise<void>;
}

const userStorageKey = "huddle:local-user";

function isLocalUser(value: unknown): value is LocalUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "displayName" in value &&
    typeof value.displayName === "string"
  );
}

function normalizeLocalUser(value: LocalUser): LocalUser {
  return {
    id: value.id,
    displayName: value.displayName,
    tag: typeof value.tag === "string" ? value.tag : "",
    phoneNumber: typeof value.phoneNumber === "string" ? value.phoneNumber : ""
  };
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

  async updateProfile(profile: LocalUserProfileInput): Promise<LocalUser> {
    const nextDisplayName = profile.displayName.trim();
    const nextTag = normalizeTag(profile.tag);
    const nextPhoneNumber = normalizePhoneNumber(profile.phoneNumber);

    if (!nextDisplayName) {
      throw new Error("Display name is required.");
    }

    if (!nextTag && !nextPhoneNumber) {
      throw new Error("Tag or phone number is required.");
    }

    const currentUser = await this.getUser();
    const nextUser: LocalUser = {
      ...currentUser,
      displayName: nextDisplayName,
      tag: nextTag,
      phoneNumber: nextPhoneNumber
    };

    this.userPromise = Promise.resolve(nextUser);
    await this.storage.write(userStorageKey, nextUser);

    return nextUser;
  }

  async updateIdentifiers(
    identifiers: Pick<LocalUserProfileInput, "tag" | "phoneNumber">
  ): Promise<LocalUser> {
    const nextTag = normalizeTag(identifiers.tag);
    const nextPhoneNumber = normalizePhoneNumber(identifiers.phoneNumber);

    if (!nextTag && !nextPhoneNumber) {
      throw new Error("Tag or phone number is required.");
    }

    const currentUser = await this.getUser();
    const nextUser: LocalUser = {
      ...currentUser,
      tag: nextTag,
      phoneNumber: nextPhoneNumber
    };

    this.userPromise = Promise.resolve(nextUser);
    await this.storage.write(userStorageKey, nextUser);

    return nextUser;
  }

  async updateDisplayName(displayName: string): Promise<LocalUser> {
    const currentUser = await this.getUser();

    return this.updateProfile({
      displayName,
      tag: currentUser.tag,
      phoneNumber: currentUser.phoneNumber
    });
  }

  async resetLocalData(): Promise<void> {
    this.userPromise = null;
    await this.storage.remove(userStorageKey);
  }

  private async loadUser(): Promise<LocalUser> {
    const storedUser = await this.storage.read<unknown>(userStorageKey);

    if (isLocalUser(storedUser)) {
      const normalizedUser = normalizeLocalUser(storedUser);

      if (
        normalizedUser.tag !== storedUser.tag ||
        normalizedUser.phoneNumber !== storedUser.phoneNumber
      ) {
        await this.storage.write(userStorageKey, normalizedUser);
      }

      return normalizedUser;
    }

    const user: LocalUser = {
      id: createId(),
      displayName: "",
      tag: "",
      phoneNumber: ""
    };

    await this.storage.write(userStorageKey, user);

    return user;
  }
}

function normalizeTag(value: string) {
  const tag = value.trim().replace(/^@+/, "");

  return tag ? `@${tag}` : "";
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  return digits ? `#${digits}` : "";
}

export const userService = new LocalUserService();
