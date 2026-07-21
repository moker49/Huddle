import { CreateMessageInput, Message } from "@/models/message";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";
import { createId } from "@/utils/createId";

export interface MessageService {
  listMessages(topicId: string): Promise<Message[]>;
  createMessage(input: CreateMessageInput): Promise<Message>;
  createActivity(input: CreateActivityInput): Promise<Message>;
  subscribeToMessages(topicId: string, onChange: () => void): Promise<() => void>;
  resetLocalData(): Promise<void>;
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
  created_at: string;
}

export interface SupabaseMessageRepository {
  listMessages(topicId: string): Promise<SupabaseMessageRow[]>;
  createMessage(topicId: string, body: string): Promise<SupabaseMessageRow>;
}

const initialMessages: Message[] = [];

const messageStorageKey = "huddle:messages:v2";

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
  );
}

export class LocalMessageService implements MessageService {
  private messages = [...initialMessages];
  private messagesPromise: Promise<Message[]> | null = null;

  constructor(private readonly storage: JsonStorage = localJsonStorage) {}

  async listMessages(topicId: string): Promise<Message[]> {
    const messages = await this.loadMessages();
    return messages
      .filter((message) => message.topicId === topicId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const body = input.body.trim();

    if (!body) {
      throw new Error("Message is required.");
    }

    const message: Message = {
      id: createId(),
      topicId: input.topicId,
      body,
      kind: "user",
      authorId: input.authorId,
      authorName: input.authorName,
      createdAt: new Date().toISOString()
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

  async subscribeToMessages(_topicId: string, _onChange: () => void): Promise<() => void> {
    return () => undefined;
  }

  async resetLocalData(): Promise<void> {
    this.messages = [...initialMessages];
    this.messagesPromise = Promise.resolve(this.messages);
    await this.storage.remove(messageStorageKey);
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
}

class SupabaseMessageRepositoryClient implements SupabaseMessageRepository {
  async listMessages(topicId: string): Promise<SupabaseMessageRow[]> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase
      .from("huddle_messages")
      .select("id, huddle_id, body, kind, activity_type, author_id, author_name, created_at")
      .eq("huddle_id", topicId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as SupabaseMessageRow[];
  }

  async createMessage(topicId: string, body: string): Promise<SupabaseMessageRow> {
    const { supabase } = await import("@/services/supabaseClient");
    const { data, error } = await supabase.rpc("create_huddle_message", {
      p_huddle_id: topicId,
      p_body: body
    });
    const message = Array.isArray(data) ? data[0] : null;

    if (error || !message) {
      throw error ?? new Error("Message could not be sent.");
    }

    return message as SupabaseMessageRow;
  }
}

export class SupabaseMessageService implements MessageService {
  constructor(
    private readonly repository: SupabaseMessageRepository = new SupabaseMessageRepositoryClient()
  ) {}

  async listMessages(topicId: string): Promise<Message[]> {
    return (await this.repository.listMessages(topicId)).map(mapSupabaseMessage);
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const body = input.body.trim();

    if (!body) {
      throw new Error("Message is required.");
    }

    return mapSupabaseMessage(await this.repository.createMessage(input.topicId, body));
  }

  async createActivity(_input: CreateActivityInput): Promise<Message> {
    throw new Error("Huddle activities are created with huddle changes.");
  }

  async subscribeToMessages(topicId: string, onChange: () => void): Promise<() => void> {
    const { supabase } = await import("@/services/supabaseClient");
    const channel = supabase
      .channel(`huddle-messages:${topicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "huddle_messages", filter: `huddle_id=eq.${topicId}` },
        onChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  async resetLocalData(): Promise<void> {}
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
    createdAt: row.created_at
  };
}

export const localMessageService = new LocalMessageService();
export const messageService = new SupabaseMessageService();
