import { CreateTopicInput, Topic, UpdateTopicInput } from "@/models/topic";
import { DirectoryUser } from "@/models/directoryUser";
import { formatPublicIdentifier } from "@/models/identifierDisplay";
import {
  DirectoryUserService,
  directoryUserService,
  findDirectoryUser,
  getDirectoryConnectionForMemberId,
  getDirectoryUserIdForIdentifier,
  normalizeIdentifier
} from "@/services/directoryUsers";
import { getVisibleInboundHuddleTopics } from "@/services/inboundHuddleFixtures";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { MessageService, messageService } from "@/services/messageService";
import { topicIsVisibleToUser } from "@/services/topicVisibility";
import { UserService, userService } from "@/services/userService";
import { createId } from "@/utils/createId";

export interface TopicService {
  setAccountScope(accountId: string | null): void;
  listTopics(): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | null>;
  createTopic(input: CreateTopicInput): Promise<Topic>;
  updateTopic(id: string, input: UpdateTopicInput): Promise<Topic>;
  leaveTopic(id: string): Promise<void>;
  deleteTopic(id: string): Promise<void>;
  markTopicRead(id: string): Promise<void>;
  subscribeToTopicChanges(onChange: () => void): Promise<() => void>;
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

  setAccountScope(_accountId: string | null): void {}

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
      memberIds: Array.from(new Set([
        getDirectoryUserIdForIdentifier(directoryUsers, localUser.tag) ??
          getDirectoryUserIdForIdentifier(directoryUsers, localUser.phoneNumber) ??
          localUser.id,
        ...input.memberIds
      ])),
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
    const nextMemberIds = Array.from(new Set(input.memberIds));
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

  async leaveTopic(id: string): Promise<void> {
    const topic = (await this.loadTopics()).find((currentTopic) => currentTopic.id === id);

    if (!topic) {
      throw new Error("Huddle could not be found.");
    }

    const localUser = await this.users.getUser();
    const memberName = localUser.displayName || localUser.tag || localUser.phoneNumber || "Member";

    await this.messages.createActivity({
      topicId: id,
      body: `Member left: ${formatPublicIdentifier(memberName)}`,
      activityType: "member_left"
    });
    this.topics = (await this.loadTopics()).filter((currentTopic) => currentTopic.id !== id);
    await this.saveTopics();
  }

  async markTopicRead(_id: string): Promise<void> {}

  async subscribeToTopicChanges(_onChange: () => void): Promise<() => void> {
    return () => undefined;
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

    if (previousTopic.autoArchiveAt !== nextTopic.autoArchiveAt) {
      await this.messages.createActivity({
        topicId: nextTopic.id,
        body: getAutoArchiveActivityBody(previousTopic.autoArchiveAt, nextTopic.autoArchiveAt),
        activityType: "auto_archive_updated"
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

function getAutoArchiveActivityBody(previousValue: string | undefined, nextValue: string | undefined) {
  if (!nextValue) {
    return "Auto-archive removed";
  }

  const nextDate = formatAutoArchiveActivityDate(nextValue);

  if (!previousValue) {
    return `Auto-archive set for ${nextDate}`;
  }

  return `Auto-archive updated from ${formatAutoArchiveActivityDate(previousValue)} to ${nextDate}`;
}

function formatAutoArchiveActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

interface SupabaseHuddleRow {
  id: string;
  title: string;
  owner_id: string;
  owner_tag: string | null;
  owner_phone_number: string | null;
  created_at: string;
  auto_archive_at: string | null;
  member_ids: string[];
  unread_count: number | null;
}

interface CloudMemberInput {
  member_id: string | null;
  member_tag: string | null;
  member_phone_number: string | null;
}

export class SupabaseTopicService implements TopicService {
  private accountScope: string | null = null;

  constructor(
    private readonly users: UserService = userService,
    private readonly directoryUsers: DirectoryUserService = directoryUserService
  ) {}

  setAccountScope(accountId: string | null): void {
    this.accountScope = accountId;
  }

  async listTopics(): Promise<Topic[]> {
    this.requireAccountScope();
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase.rpc("list_visible_huddles");

    if (error) {
      throw error;
    }

    return ((data ?? []) as SupabaseHuddleRow[])
      .map(mapSupabaseHuddle)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getTopic(id: string): Promise<Topic | null> {
    const topics = await this.listTopics();

    return topics.find((topic) => topic.id === id) ?? null;
  }

  async createTopic(input: CreateTopicInput): Promise<Topic> {
    const title = input.title.trim();
    const ownerId = this.requireAccountScope();
    const localUser = await this.users.getUser();
    const directoryUsers = await this.directoryUsers.listUsers();

    if (!title) {
      throw new Error("Huddle title is required.");
    }

    if (!input.memberIds || input.memberIds.length === 0) {
      throw new Error("At least one member is required.");
    }

    const memberInputs = getCloudMemberInputs(input.memberIds, directoryUsers);
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error: huddleError } = await supabase.rpc("create_huddle", {
      p_title: title,
      p_auto_archive_at: input.autoArchiveAt ?? null,
      p_members: memberInputs
    });
    const huddle = Array.isArray(data) ? data[0] : null;

    if (huddleError || !huddle) {
      throw huddleError ?? new Error("Huddle could not be created.");
    }

    return {
      id: huddle.id,
      title: huddle.title,
      memberIds: Array.from(new Set([ownerId, ...memberInputs.map(getCloudMemberReference)])),
      ownerId: huddle.owner_id,
      ownerTag: localUser.tag,
      ownerPhoneNumber: localUser.phoneNumber,
      createdAt: huddle.created_at,
      autoArchiveAt: huddle.auto_archive_at ?? undefined
    };
  }

  async updateTopic(id: string, input: UpdateTopicInput): Promise<Topic> {
    const title = input.title.trim();

    if (!title) {
      throw new Error("Huddle title is required.");
    }

    if (!input.memberIds || input.memberIds.length === 0) {
      throw new Error("At least one member is required.");
    }

    const currentTopic = await this.getTopic(id);

    if (!currentTopic) {
      throw new Error("Huddle could not be found.");
    }

    const directoryUsers = await this.directoryUsers.listUsers();
    const memberInputs = getCloudMemberInputs(input.memberIds, directoryUsers);
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error: huddleError } = await supabase.rpc("update_huddle", {
      p_huddle_id: id,
      p_title: title,
      p_auto_archive_at: input.autoArchiveAt ?? null,
      p_members: memberInputs
    });
    const huddle = Array.isArray(data) ? data[0] : null;

    if (huddleError || !huddle) {
      throw huddleError ?? new Error("Huddle could not be saved.");
    }

    return {
      ...currentTopic,
      title: huddle.title,
      memberIds: memberInputs.map(getCloudMemberReference),
      autoArchiveAt: huddle.auto_archive_at ?? undefined
    };
  }

  async deleteTopic(id: string): Promise<void> {
    this.requireAccountScope();
    const { supabase } = await import("@/services/supabaseClient");
    const { error } = await supabase.from("huddles").delete().eq("id", id);

    if (error) {
      throw error;
    }
  }

  async leaveTopic(id: string): Promise<void> {
    this.requireAccountScope();
    const { supabase } = await import("@/services/supabaseClient");
    const { error } = await supabase.rpc("leave_huddle", { p_huddle_id: id });

    if (error) {
      throw error;
    }
  }

  async markTopicRead(id: string): Promise<void> {
    this.requireAccountScope();
    const { supabase } = await import("@/services/supabaseClient");
    const { error } = await supabase.rpc("mark_huddle_read", { p_huddle_id: id });

    if (error) {
      throw error;
    }
  }

  async subscribeToTopicChanges(onChange: () => void): Promise<() => void> {
    const { supabase } = await import("@/services/supabaseClient");
    const channel = supabase
      .channel("huddle-topic-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "huddles" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "huddle_members" }, onChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "huddle_messages" }, onChange)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  async resetLocalData(): Promise<void> {}

  private requireAccountScope() {
    if (!this.accountScope) {
      throw new Error("An authenticated account is required.");
    }

    return this.accountScope;
  }
}

function getMemberDisplayName(memberId: string, directoryUsers: DirectoryUser[]) {
  const connection = getDirectoryConnectionForMemberId(directoryUsers, memberId);

  return (
    connection?.displayName ||
    formatPublicIdentifier(connection?.tag ?? "") ||
    formatPublicIdentifier(connection?.phoneNumber ?? "") ||
    formatPublicIdentifier(memberId)
  );
}

export const localTopicService = new LocalTopicService();
export const topicService = new SupabaseTopicService();

function mapSupabaseHuddle(row: SupabaseHuddleRow): Topic {
  return {
    id: row.id,
    title: row.title,
    memberIds: row.member_ids ?? [],
    ownerId: row.owner_id,
    ownerTag: row.owner_tag ?? undefined,
    ownerPhoneNumber: row.owner_phone_number ?? undefined,
    createdAt: row.created_at,
    autoArchiveAt: row.auto_archive_at ?? undefined,
    unreadCount: row.unread_count ?? 0
  };
}

function getCloudMemberInputs(
  inputMemberIds: string[],
  directoryUsers: DirectoryUser[]
): CloudMemberInput[] {
  const inputs = inputMemberIds.map((memberId) => {
    const directoryUser = getDirectoryUserForMemberId(memberId, directoryUsers);

    if (directoryUser) {
      return { member_id: directoryUser.id, member_tag: null, member_phone_number: null };
    }

    const normalizedMemberId = normalizeIdentifier(memberId);

    if (normalizedMemberId.startsWith("#") || /^\d/.test(normalizedMemberId)) {
      const phoneNumber = normalizedMemberId.startsWith("#")
        ? normalizedMemberId
        : `#${normalizedMemberId}`;

      return { member_id: null, member_tag: null, member_phone_number: phoneNumber };
    }

    throw new Error("Every huddle member must be in your network.");
  });

  return deduplicateCloudMembers(inputs);
}

function getDirectoryUserForMemberId(memberId: string, directoryUsers: DirectoryUser[]) {
  return findDirectoryUser(directoryUsers, memberId);
}

function deduplicateCloudMembers(members: CloudMemberInput[]) {
  const seen = new Set<string>();

  return members.filter((member) => {
    const reference = getCloudMemberReference(member);

    if (seen.has(reference)) {
      return false;
    }

    seen.add(reference);
    return true;
  });
}

function getCloudMemberReference(member: CloudMemberInput) {
  return member.member_id ?? member.member_tag ?? member.member_phone_number ?? "";
}
