import { LocalUser, LocalUserProfileInput } from "@/models/user";
import {
  DirectoryUserService,
  directoryUserService
} from "@/services/directoryUsers";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { createId } from "@/utils/createId";

export interface UserService {
  setAccountScope(accountId: string | null): void;
  getUser(): Promise<LocalUser>;
  updateIdentifiers(identifiers: Pick<LocalUserProfileInput, "tag" | "phoneNumber">): Promise<LocalUser>;
  updateProfile(profile: LocalUserProfileInput): Promise<LocalUser>;
  updateDisplayName(displayName: string): Promise<LocalUser>;
  updateAvatarUrl(avatarUrl: string): Promise<LocalUser>;
  resetLocalData(): Promise<void>;
}

const userStorageKeyPrefix = "huddle:local-user";

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
    displayName: normalizeDisplayName(value.displayName),
    tag: typeof value.tag === "string" ? normalizeTag(value.tag) : "",
    phoneNumber: typeof value.phoneNumber === "string" ? normalizePhoneNumber(value.phoneNumber) : "",
    avatarUrl: normalizeAvatarUrl(value.avatarUrl)
  };
}

export class LocalUserService implements UserService {
  private userPromise: Promise<LocalUser> | null = null;
  private accountScope: string | null = null;

  constructor(
    private readonly storage: JsonStorage = localJsonStorage,
    private readonly directoryUsers: DirectoryUserService = directoryUserService
  ) {}

  setAccountScope(accountId: string | null): void {
    if (this.accountScope === accountId) {
      return;
    }

    this.accountScope = accountId;
    this.userPromise = null;
  }

  async getUser(): Promise<LocalUser> {
    if (!this.userPromise) {
      this.userPromise = this.loadUser();
    }

    return this.userPromise;
  }

  async updateProfile(profile: LocalUserProfileInput): Promise<LocalUser> {
    const nextDisplayName = normalizeDisplayName(profile.displayName);
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
    await this.storage.write(this.getStorageKey(), nextUser);
    await this.directoryUsers.upsertLocalUser(nextUser);

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
    await this.storage.write(this.getStorageKey(), nextUser);
    await this.directoryUsers.upsertLocalUser(nextUser);

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

  async updateAvatarUrl(avatarUrl: string): Promise<LocalUser> {
    const currentUser = await this.getUser();
    const nextUser = { ...currentUser, avatarUrl: normalizeAvatarUrl(avatarUrl) };

    this.userPromise = Promise.resolve(nextUser);
    await this.storage.write(this.getStorageKey(), nextUser);
    await this.directoryUsers.upsertLocalUser(nextUser);

    return nextUser;
  }

  async resetLocalData(): Promise<void> {
    this.userPromise = null;
    await this.storage.remove(this.getStorageKey());
  }

  private async loadUser(): Promise<LocalUser> {
    const storedUser = await this.storage.read<unknown>(this.getStorageKey());

    if (isLocalUser(storedUser)) {
      const normalizedUser = normalizeLocalUser(storedUser);

      if (
        normalizedUser.displayName !== storedUser.displayName ||
        normalizedUser.tag !== storedUser.tag ||
        normalizedUser.phoneNumber !== storedUser.phoneNumber ||
        normalizedUser.avatarUrl !== storedUser.avatarUrl
      ) {
        await this.storage.write(this.getStorageKey(), normalizedUser);
      }

      return normalizedUser;
    }

    const user: LocalUser = {
      id: this.accountScope ?? createId(),
      displayName: "",
      tag: "",
      phoneNumber: ""
    };

    await this.storage.write(this.getStorageKey(), user);

    return user;
  }

  private getStorageKey(): string {
    return this.accountScope
      ? `${userStorageKeyPrefix}:${this.accountScope}`
      : userStorageKeyPrefix;
  }
}

function normalizeTag(value: string) {
  const tag = value
    .trim()
    .replace(/^tag:/i, "")
    .replace(/[@#]/g, "");

  return tag ? `@${tag}` : "";
}

function normalizeDisplayName(value: string) {
  return value.replace(/[#@]/g, "").trim();
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  return digits ? `#${digits}` : "";
}

function normalizeAvatarUrl(value: string | undefined) {
  return typeof value === "string" && /^https:\/\//i.test(value) ? value : "";
}

export class SupabaseUserService implements UserService {
  private accountScope: string | null = null;
  private userPromise: Promise<LocalUser> | null = null;

  setAccountScope(accountId: string | null): void {
    if (this.accountScope === accountId) {
      return;
    }

    this.accountScope = accountId;
    this.userPromise = null;
  }

  async getUser(): Promise<LocalUser> {
    if (!this.accountScope) {
      throw new Error("An authenticated account is required.");
    }

    if (!this.userPromise) {
      this.userPromise = this.loadUser();
    }

    return this.userPromise;
  }

  async updateProfile(profile: LocalUserProfileInput): Promise<LocalUser> {
    const nextDisplayName = normalizeDisplayName(profile.displayName);
    const nextTag = normalizeTag(profile.tag);
    const nextPhoneNumber = normalizePhoneNumber(profile.phoneNumber);

    if (!nextDisplayName) {
      throw new Error("Display name is required.");
    }

    if (!nextTag && !nextPhoneNumber) {
      throw new Error("Tag or phone number is required.");
    }

    return this.saveUser({
      ...(await this.getUser()),
      displayName: nextDisplayName,
      tag: nextTag,
      phoneNumber: nextPhoneNumber
    });
  }

  async updateIdentifiers(
    identifiers: Pick<LocalUserProfileInput, "tag" | "phoneNumber">
  ): Promise<LocalUser> {
    const nextTag = normalizeTag(identifiers.tag);
    const nextPhoneNumber = normalizePhoneNumber(identifiers.phoneNumber);

    if (!nextTag && !nextPhoneNumber) {
      throw new Error("Tag or phone number is required.");
    }

    return this.saveUser({
      ...(await this.getUser()),
      tag: nextTag,
      phoneNumber: nextPhoneNumber
    });
  }

  async updateDisplayName(displayName: string): Promise<LocalUser> {
    const currentUser = await this.getUser();

    return this.updateProfile({
      displayName,
      tag: currentUser.tag,
      phoneNumber: currentUser.phoneNumber
    });
  }

  async updateAvatarUrl(avatarUrl: string): Promise<LocalUser> {
    return this.saveUser({
      ...(await this.getUser()),
      avatarUrl: normalizeAvatarUrl(avatarUrl)
    });
  }

  async resetLocalData(): Promise<void> {
    this.userPromise = null;
  }

  private async loadUser(): Promise<LocalUser> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, tag, phone_number, avatar_url, created_at")
      .eq("id", this.accountScope)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return mapProfile(data);
    }

    const user: LocalUser = {
      id: this.accountScope as string,
      displayName: "",
      tag: "",
      phoneNumber: ""
    };

    return this.saveUser(user);
  }

  private async saveUser(user: LocalUser): Promise<LocalUser> {
    const { supabase } = await import("@/services/supabaseClient");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: user.displayName,
      tag: user.tag,
      phone_number: user.phoneNumber,
      avatar_url: user.avatarUrl ?? ""
    });

    if (error) {
      throw error;
    }

    this.userPromise = Promise.resolve(user);
    return user;
  }
}

function mapProfile(value: {
  id: string;
  display_name: string | null;
  tag: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}): LocalUser {
  return {
    id: value.id,
    displayName: normalizeDisplayName(value.display_name ?? ""),
    tag: normalizeTag(value.tag ?? ""),
    phoneNumber: normalizePhoneNumber(value.phone_number ?? ""),
    avatarUrl: normalizeAvatarUrl(value.avatar_url ?? "")
  };
}

export const localUserService = new LocalUserService();
export const userService = new SupabaseUserService();
