import { CreateMessageInput, Message } from "@/models/message";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { createId } from "@/utils/createId";

export interface MessageService {
  setAccountScope(accountId: string | null): void;
  listMessages(topicId: string): Promise<Message[]>;
  listMessagePage(topicId: string, options?: MessagePageOptions): Promise<MessagePage>;
  createMessage(input: CreateMessageInput): Promise<Message>;
  updateMessage(messageId: string, body: string): Promise<Message>;
  deleteMessage(messageId: string): Promise<Message>;
  createActivity(input: CreateActivityInput): Promise<Message>;
  getDraft(topicId: string): Promise<string>;
  saveDraft(topicId: string, body: string): Promise<void>;
  clearDraft(topicId: string): Promise<void>;
  subscribeToMessages(topicId: string, onChange: () => void): Promise<() => void>;
  resetLocalData(): Promise<void>;
}

export interface MessageCursor {
  createdAt: string;
  id: string;
}

export interface MessagePageOptions {
  before?: MessageCursor;
  limit?: number;
}

export interface MessagePage {
  messages: Message[];
  hasOlderMessages: boolean;
}

export interface CreateActivityInput {
  topicId: string;
  body: string;
  activityType: NonNullable<Message["activityType"]>;
}

export interface SupabaseMessageRow {
  id: string;
  huddle_id: string;
  body: string;
  kind: "user" | "system";
  activity_type: Message["activityType"] | null;
  author_id: string | null;
  author_name: string;
  author_avatar_url?: string | null;
  created_at: string;
  reply_to_message_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  is_unread: boolean;
}

export interface SupabaseMessageRepository {
  listMessages(topicId: string): Promise<SupabaseMessageRow[]>;
  listMessagePage(topicId: string, options: MessagePageOptions & { limit: number }): Promise<SupabaseMessageRow[]>;
  createMessage(topicId: string, body: string, replyToMessageId?: string): Promise<SupabaseMessageRow>;
  updateMessage(messageId: string, body: string): Promise<SupabaseMessageRow>;
  deleteMessage(messageId: string): Promise<SupabaseMessageRow>;
}

const initialMessages: Message[] = [];
export const messagePageSize = 100;

const messageStorageKey = "huddle:messages:v2";
const draftStorageKeyPrefix = "huddle:message-drafts:v1";

class MessageDraftStore {
  private accountScope: string | null = null;
  private draftsByScope = new Map<string, Promise<Record<string, string>>>();
  private writeChain = Promise.resolve();

  constructor(private readonly storage: JsonStorage) {}

  setAccountScope(accountId: string | null) {
    this.accountScope = accountId;
  }

  async getDraft(topicId: string): Promise<string> {
    return (await this.loadDrafts())[topicId] ?? "";
  }

  async saveDraft(topicId: string, body: string): Promise<void> {
    const scope = this.getScope();

    const write = this.writeChain.then(async () => {
      const drafts = await this.loadDrafts(scope);

      if (body) {
        drafts[topicId] = body;
      } else {
        delete drafts[topicId];
      }

      await this.storage.write(this.getStorageKey(scope), drafts);
    });

    this.writeChain = write.catch(() => undefined);
    await write;
  }

  async clearDraft(topicId: string): Promise<void> {
    await this.saveDraft(topicId, "");
  }

  async reset() {
    await this.writeChain;
    await this.storage.remove(this.getStorageKey(this.getScope()));
    this.draftsByScope.clear();
    this.writeChain = Promise.resolve();
  }

  private getScope() {
    return this.accountScope ?? "local";
  }

  private async loadDrafts(scope = this.getScope()) {
    let drafts = this.draftsByScope.get(scope);

    if (!drafts) {
      drafts = this.storage.read<unknown>(this.getStorageKey(scope)).then((storedDrafts) => {
        if (!isDraftMap(storedDrafts)) {
          return {};
        }

        return storedDrafts;
      });
      this.draftsByScope.set(scope, drafts);
    }

    return drafts;
  }

  private getStorageKey(scope: string) {
    return `${draftStorageKeyPrefix}:${scope}`;
  }
}

function isDraftMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((draft) => typeof draft === "string")
  );
}

function isMessage(value: unknown): value is Message {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "topicId" in value &&
    "body" in value &&
    "authorName" in value &&
    "createdAt" in value &&
    typeof value.id === "string" &&
    typeof value.topicId === "string" &&
    typeof value.body === "string" &&
    (!("kind" in value) || value.kind === "user" || value.kind === "system") &&
    (!("activityType" in value) || typeof value.activityType === "string") &&
    typeof value.authorName === "string" &&
    typeof value.createdAt === "string"
    && (!("editedAt" in value) || typeof value.editedAt === "string")
    && (!("replyToMessageId" in value) || typeof value.replyToMessageId === "string")
    && (!("isDeleted" in value) || typeof value.isDeleted === "boolean")
  );
}

export class LocalMessageService implements MessageService {
  private messages = [...initialMessages];
  private messagesPromise: Promise<Message[]> | null = null;
  private accountScope: string | null = null;
  private readonly drafts: MessageDraftStore;

  constructor(private readonly storage: JsonStorage = localJsonStorage) {
    this.drafts = new MessageDraftStore(storage);
  }

  setAccountScope(accountId: string | null): void {
    this.accountScope = accountId;
    this.drafts.setAccountScope(accountId);
  }

  async listMessages(topicId: string): Promise<Message[]> {
    const messages = await this.loadMessages();
    return messages
      .filter((message) => message.topicId === topicId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listMessagePage(topicId: string, options: MessagePageOptions = {}): Promise<MessagePage> {
    const limit = options.limit ?? messagePageSize;
    const messages = await this.listMessages(topicId);
    const beforeIndex = options.before
      ? messages.findIndex((message) => message.id === options.before?.id)
      : messages.length;
    const endIndex = beforeIndex < 0 ? messages.length : beforeIndex;
    const startIndex = Math.max(0, endIndex - limit);

    return {
      messages: messages.slice(startIndex, endIndex),
      hasOlderMessages: startIndex > 0
    };
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const body = input.body.trim();

    if (!body) {
      throw new Error("Message is required.");
    }

    if (input.replyToMessageId) {
      const replyTarget = (await this.loadMessages()).find(
        (message) => message.id === input.replyToMessageId
      );

      if (!replyTarget || replyTarget.topicId !== input.topicId) {
        throw new Error("Reply target could not be found.");
      }
    }

    const message: Message = {
      id: createId(),
      topicId: input.topicId,
      body,
      kind: "user",
      authorId: input.authorId,
      authorName: input.authorName,
      authorAvatarUrl: input.authorAvatarUrl,
      createdAt: new Date().toISOString(),
      replyToMessageId: input.replyToMessageId
    };

    await this.appendMessage(message);

    return message;
  }

  async createActivity(input: CreateActivityInput): Promise<Message> {
    const body = input.body.trim();

    if (!body) {
      throw new Error("Activity message is required.");
    }

    const message: Message = {
      id: createId(),
      topicId: input.topicId,
      body,
      kind: "system",
      activityType: input.activityType,
      authorName: "System",
      createdAt: new Date().toISOString()
    };

    await this.appendMessage(message);

    return message;
  }

  async updateMessage(messageId: string, body: string): Promise<Message> {
    const nextBody = body.trim();

    if (!nextBody) {
      throw new Error("Message is required.");
    }

    const message = await this.getOwnedUserMessage(messageId);

    if (message.isDeleted) {
      throw new Error("Deleted messages cannot be edited.");
    }

    const editedAt = new Date().toISOString();
    const nextMessage: Message = {
      ...message,
      body: nextBody,
      editedAt: isDifferentMinute(message.createdAt, editedAt) ? editedAt : message.editedAt
    };

    await this.replaceMessage(nextMessage);

    return nextMessage;
  }

  async deleteMessage(messageId: string): Promise<Message> {
    const message = await this.getOwnedUserMessage(messageId);
    const nextMessage: Message = {
      ...message,
      body: "[deleted]",
      editedAt: undefined,
      isDeleted: true
    };

    await this.replaceMessage(nextMessage);

    return nextMessage;
  }

  async getDraft(topicId: string): Promise<string> {
    return this.drafts.getDraft(topicId);
  }

  async saveDraft(topicId: string, body: string): Promise<void> {
    await this.drafts.saveDraft(topicId, body);
  }

  async clearDraft(topicId: string): Promise<void> {
    await this.drafts.clearDraft(topicId);
  }

  async subscribeToMessages(_topicId: string, _onChange: () => void): Promise<() => void> {
    return () => undefined;
  }

  async resetLocalData(): Promise<void> {
    this.messages = [...initialMessages];
    this.messagesPromise = Promise.resolve(this.messages);
    await this.storage.remove(messageStorageKey);
    await this.drafts.reset();
  }

  private async loadMessages(): Promise<Message[]> {
    if (!this.messagesPromise) {
      this.messagesPromise = this.storage.read<unknown>(messageStorageKey).then((storedMessages) => {
        if (Array.isArray(storedMessages) && storedMessages.every(isMessage)) {
          this.messages = storedMessages;
        }

        return this.messages;
      });
    }

    return this.messagesPromise;
  }

  private async appendMessage(message: Message) {
    this.messages = [...(await this.loadMessages()), message];
    this.messagesPromise = Promise.resolve(this.messages);
    await this.storage.write(messageStorageKey, this.messages);
  }

  private async getOwnedUserMessage(messageId: string) {
    const message = (await this.loadMessages()).find((currentMessage) => currentMessage.id === messageId);

    if (!message || message.kind !== "user") {
      throw new Error("Message could not be found.");
    }

    if (this.accountScope && message.authorId !== this.accountScope) {
      throw new Error("You can only update your own messages.");
    }

    return message;
  }

  private async replaceMessage(nextMessage: Message) {
    this.messages = (await this.loadMessages()).map((message) => (
      message.id === nextMessage.id ? nextMessage : message
    ));
    this.messagesPromise = Promise.resolve(this.messages);
    await this.storage.write(messageStorageKey, this.messages);
  }
}

class SupabaseMessageRepositoryClient implements SupabaseMessageRepository {
  async listMessages(topicId: string): Promise<SupabaseMessageRow[]> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase.rpc("list_huddle_messages", { p_huddle_id: topicId });

    if (error) {
      throw error;
    }

    return (data ?? []) as SupabaseMessageRow[];
  }

  async listMessagePage(
    topicId: string,
    { before, limit }: MessagePageOptions & { limit: number }
  ): Promise<SupabaseMessageRow[]> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase.rpc("list_huddle_messages", {
      p_huddle_id: topicId,
      p_before_created_at: before?.createdAt ?? null,
      p_before_id: before?.id ?? null,
      p_limit: limit + 1
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as SupabaseMessageRow[];
  }

  async createMessage(
    topicId: string,
    body: string,
    replyToMessageId?: string
  ): Promise<SupabaseMessageRow> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase.rpc("create_huddle_message", {
      p_huddle_id: topicId,
      p_body: body,
      p_reply_to_message_id: replyToMessageId ?? null
    });
    const message = Array.isArray(data) ? data[0] : null;

    if (error || !message) {
      throw error ?? new Error("Message could not be sent.");
    }

    return message as SupabaseMessageRow;
  }

  async updateMessage(messageId: string, body: string): Promise<SupabaseMessageRow> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase.rpc("update_huddle_message", {
      p_message_id: messageId,
      p_body: body
    });
    const message = Array.isArray(data) ? data[0] : null;

    if (error || !message) {
      throw error ?? new Error("Message could not be updated.");
    }

    return message as SupabaseMessageRow;
  }

  async deleteMessage(messageId: string): Promise<SupabaseMessageRow> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase.rpc("delete_huddle_message", { p_message_id: messageId });
    const message = Array.isArray(data) ? data[0] : null;

    if (error || !message) {
      throw error ?? new Error("Message could not be deleted.");
    }

    return message as SupabaseMessageRow;
  }
}

export class SupabaseMessageService implements MessageService {
  private readonly drafts: MessageDraftStore;

  constructor(
    private readonly repository: SupabaseMessageRepository = new SupabaseMessageRepositoryClient(),
    storage: JsonStorage = localJsonStorage
  ) {
    this.drafts = new MessageDraftStore(storage);
  }

  setAccountScope(accountId: string | null): void {
    this.drafts.setAccountScope(accountId);
  }

  async listMessages(topicId: string): Promise<Message[]> {
    return (await this.repository.listMessages(topicId)).map(mapSupabaseMessage);
  }

  async listMessagePage(topicId: string, options: MessagePageOptions = {}): Promise<MessagePage> {
    const limit = options.limit ?? messagePageSize;
    const rows = await this.repository.listMessagePage(topicId, {
      before: options.before,
      limit
    });
    const messages = rows.map(mapSupabaseMessage);
    const hasOlderMessages = messages.length > limit;

    return {
      messages: hasOlderMessages ? messages.slice(1) : messages,
      hasOlderMessages
    };
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const body = input.body.trim();

    if (!body) {
      throw new Error("Message is required.");
    }

    return mapSupabaseMessage(await this.repository.createMessage(
      input.topicId,
      body,
      input.replyToMessageId
    ));
  }

  async updateMessage(messageId: string, body: string): Promise<Message> {
    const nextBody = body.trim();

    if (!nextBody) {
      throw new Error("Message is required.");
    }

    return mapSupabaseMessage(await this.repository.updateMessage(messageId, nextBody));
  }

  async deleteMessage(messageId: string): Promise<Message> {
    return mapSupabaseMessage(await this.repository.deleteMessage(messageId));
  }

  async createActivity(_input: CreateActivityInput): Promise<Message> {
    throw new Error("Huddle activities are created with huddle changes.");
  }

  async getDraft(topicId: string): Promise<string> {
    return this.drafts.getDraft(topicId);
  }

  async saveDraft(topicId: string, body: string): Promise<void> {
    await this.drafts.saveDraft(topicId, body);
  }

  async clearDraft(topicId: string): Promise<void> {
    await this.drafts.clearDraft(topicId);
  }

  async subscribeToMessages(topicId: string, onChange: () => void): Promise<() => void> {
    const { supabase } = await import("@/services/supabaseClient");
    const channel = supabase
      .channel(`huddle-messages:${topicId}:${createId()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "huddle_messages", filter: `huddle_id=eq.${topicId}` },
        onChange
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "huddle_messages", filter: `huddle_id=eq.${topicId}` },
        onChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  async resetLocalData(): Promise<void> {
    await this.drafts.reset();
  }
}

export function mapSupabaseMessage(row: SupabaseMessageRow): Message {
  return {
    id: row.id,
    topicId: row.huddle_id,
    body: row.body,
    kind: row.kind,
    activityType: row.activity_type ?? undefined,
    authorId: row.author_id ?? undefined,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url ?? undefined,
    createdAt: row.created_at,
    replyToMessageId: row.reply_to_message_id ?? undefined,
    editedAt: row.edited_at ?? undefined,
    isDeleted: Boolean(row.deleted_at),
    // Some mutation RPCs do not include the derived unread flag. Treat an
    // omitted value as false so their optimistic replacement keeps its group.
    isUnread: row.is_unread === true
  };
}

function isDifferentMinute(first: string, second: string) {
  const firstTime = new Date(first).getTime();
  const secondTime = new Date(second).getTime();

  return Number.isNaN(firstTime) || Number.isNaN(secondTime)
    ? first !== second
    : Math.floor(firstTime / 60_000) !== Math.floor(secondTime / 60_000);
}

export const localMessageService = new LocalMessageService();
export const messageService = new SupabaseMessageService();
