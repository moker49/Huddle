import assert from "node:assert/strict";

import { JsonStorage } from "@/services/localJsonStorage";
import {
  LocalMessageService,
  messagePageSize,
  SupabaseMessageRepository,
  SupabaseMessageRow,
  SupabaseMessageService
} from "@/services/messageService";

declare function test(name: string, run: () => Promise<void> | void): void;

class MemoryJsonStorage implements JsonStorage {
  private values = new Map<string, string>();

  async read<T>(key: string): Promise<T | null> {
    const rawValue = this.values.get(key);

    return rawValue ? JSON.parse(rawValue) as T : null;
  }

  async write<T>(key: string, value: T): Promise<void> {
    this.values.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }

  async clearNamespace(namespace: string): Promise<void> {
    Array.from(this.values.keys())
      .filter((key) => key.startsWith(namespace))
      .forEach((key) => this.values.delete(key));
  }
}

test("creating a message stores it under its huddle", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());

  const message = await messages.createMessage({
    topicId: "topic-1",
    body: "  hello huddle  ",
    authorId: "user-1",
    authorName: "Efren"
  });
  const topicMessages = await messages.listMessages("topic-1");

  assert.equal(topicMessages.length, 1);
  assert.equal(topicMessages[0].id, message.id);
  assert.equal(topicMessages[0].body, "hello huddle");
  assert.equal(topicMessages[0].authorId, "user-1");
  assert.equal(topicMessages[0].authorName, "Efren");
});

test("messages from one huddle do not appear in another huddle", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());

  await messages.createMessage({
    topicId: "topic-1",
    body: "topic one",
    authorId: "user-1",
    authorName: "Efren"
  });
  await messages.createMessage({
    topicId: "topic-2",
    body: "topic two",
    authorId: "user-2",
    authorName: "Jay"
  });

  const topicOneMessages = await messages.listMessages("topic-1");
  const topicTwoMessages = await messages.listMessages("topic-2");

  assert.deepEqual(topicOneMessages.map((message) => message.body), ["topic one"]);
  assert.deepEqual(topicTwoMessages.map((message) => message.body), ["topic two"]);
});

test("message pages return the newest 100 messages and report older history", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());

  for (let index = 0; index < messagePageSize + 1; index += 1) {
    await messages.createMessage({
      topicId: "topic-1",
      body: `Message ${index}`,
      authorId: "user-1",
      authorName: "Efren"
    });
  }

  const newestPage = await messages.listMessagePage("topic-1");
  const olderPage = await messages.listMessagePage("topic-1", {
    before: {
      id: newestPage.messages[0].id,
      createdAt: newestPage.messages[0].createdAt
    }
  });

  assert.equal(newestPage.messages.length, messagePageSize);
  assert.equal(newestPage.hasOlderMessages, true);
  assert.equal(olderPage.messages.length, 1);
  assert.equal(olderPage.hasOlderMessages, false);
});

test("replies retain their source message and reject sources from another huddle", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());
  const source = await messages.createMessage({
    topicId: "topic-1",
    body: "Original message",
    authorId: "user-1",
    authorName: "Efren"
  });
  const reply = await messages.createMessage({
    topicId: "topic-1",
    body: "Reply message",
    authorId: "user-2",
    authorName: "Jay",
    replyToMessageId: source.id
  });

  assert.equal(reply.replyToMessageId, source.id);
  await assert.rejects(
    messages.createMessage({
      topicId: "topic-2",
      body: "Wrong huddle",
      authorId: "user-2",
      authorName: "Jay",
      replyToMessageId: source.id
    }),
    /Reply target could not be found/
  );
});

test("message drafts are isolated by huddle and authenticated account", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());

  messages.setAccountScope("account-a");
  await messages.saveDraft("topic-1", "A private draft");
  await messages.saveDraft("topic-2", "Another huddle draft");

  assert.equal(await messages.getDraft("topic-1"), "A private draft");
  assert.equal(await messages.getDraft("topic-2"), "Another huddle draft");

  messages.setAccountScope("account-b");
  assert.equal(await messages.getDraft("topic-1"), "");

  messages.setAccountScope("account-a");
  await messages.clearDraft("topic-1");
  assert.equal(await messages.getDraft("topic-1"), "");
  assert.equal(await messages.getDraft("topic-2"), "Another huddle draft");
});

test("resetting local message data clears messages", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());

  await messages.createMessage({
    topicId: "topic-1",
    body: "temporary",
    authorId: "user-1",
    authorName: "Efren"
  });
  await messages.saveDraft("topic-1", "Temporary draft");

  await messages.resetLocalData();

  assert.deepEqual(await messages.listMessages("topic-1"), []);
  assert.equal(await messages.getDraft("topic-1"), "");
});

test("cloud messages retain backend ordering and system activity data", async () => {
  const repository = new MemorySupabaseMessageRepository([
    messageRow({
      id: "message-1",
      kind: "system",
      activity_type: "huddle_created",
      author_id: null,
      author_name: "System"
    }),
    messageRow({
      id: "message-2",
      kind: "user",
      activity_type: null,
      author_id: "author-1",
      author_name: "Andre",
      author_avatar_url: "https://example.com/andre.jpg"
    })
  ]);
  const messages = new SupabaseMessageService(repository);

  const result = await messages.listMessages("topic-1");

  assert.deepEqual(result.map((message) => message.id), ["message-1", "message-2"]);
  assert.equal(result[0].activityType, "huddle_created");
  assert.equal(result[0].authorId, undefined);
  assert.equal(result[1].authorName, "Andre");
  assert.equal(result[1].authorId, "author-1");
  assert.equal(result[1].authorAvatarUrl, "https://example.com/andre.jpg");
  assert.equal(result[1].isUnread, false);
});

test("cloud message creation trims text and uses the backend-resolved author", async () => {
  const repository = new MemorySupabaseMessageRepository();
  const messages = new SupabaseMessageService(repository);

  const created = await messages.createMessage({
    topicId: "topic-1",
    body: "  Ready when you are.  ",
    authorId: "untrusted-client-author",
    authorName: "Untrusted client name",
    replyToMessageId: "source-message"
  });

  assert.equal(repository.createdBodies[0], "Ready when you are.");
  assert.equal(repository.createdReplyTargets[0], "source-message");
  assert.equal(created.authorId, "profile-1");
  assert.equal(created.authorName, "Server profile");
});

test("cloud messages reject blank text and client-created activities", async () => {
  const messages = new SupabaseMessageService(new MemorySupabaseMessageRepository());

  await assert.rejects(
    messages.createMessage({ topicId: "topic-1", body: "   ", authorId: "author-1", authorName: "Andre" }),
    /Message is required/
  );
  await assert.rejects(
    messages.createActivity({ topicId: "topic-1", body: "Huddle created", activityType: "huddle_created" }),
    /created with huddle changes/
  );
});

test("local messages preserve edits outside their original minute and leave tombstones", async () => {
  const storage = new MemoryJsonStorage();
  const messages = new LocalMessageService(storage);

  await storage.write("huddle:messages:v2", [
    {
      id: "message-1",
      topicId: "topic-1",
      body: "Original message",
      kind: "user",
      authorId: "author-1",
      authorName: "Andre",
      createdAt: "2026-07-21T12:00:00.000Z"
    }
  ]);
  messages.setAccountScope("author-1");

  const edited = await messages.updateMessage("message-1", "Updated message");
  const deleted = await messages.deleteMessage("message-1");

  assert.equal(edited.body, "Updated message");
  assert.equal(typeof edited.editedAt, "string");
  assert.equal(deleted.body, "[deleted]");
  assert.equal(deleted.isDeleted, true);
  assert.equal(deleted.editedAt, undefined);
});

test("cloud message mutations map edited and deleted state", async () => {
  const repository = new MemorySupabaseMessageRepository();
  const messages = new SupabaseMessageService(repository);

  const edited = await messages.updateMessage("message-1", "Updated message");
  const deleted = await messages.deleteMessage("message-1");

  assert.equal(repository.updatedBodies[0], "Updated message");
  assert.equal(edited.editedAt, "2026-07-21T12:05:00.000Z");
  assert.equal(deleted.body, "[deleted]");
  assert.equal(deleted.isDeleted, true);
});

test("cloud message pages retain the newest 100 rows and expose older history", async () => {
  const rows = Array.from({ length: 101 }, (_, index) =>
    messageRow({
      id: `message-${String(index).padStart(3, "0")}`,
      huddle_id: "topic-1",
      created_at: `2026-07-21T12:${String(index).padStart(2, "0")}:00.000Z`
    })
  );
  const messages = new SupabaseMessageService(new MemorySupabaseMessageRepository(rows));

  const newestPage = await messages.listMessagePage("topic-1");
  const olderPage = await messages.listMessagePage("topic-1", {
    before: {
      id: newestPage.messages[0].id,
      createdAt: newestPage.messages[0].createdAt
    }
  });

  assert.equal(newestPage.messages.length, messagePageSize);
  assert.equal(newestPage.messages[0].id, "message-001");
  assert.equal(newestPage.hasOlderMessages, true);
  assert.equal(olderPage.messages.length, 1);
  assert.equal(olderPage.messages[0].id, "message-000");
  assert.equal(olderPage.hasOlderMessages, false);
});

test("targeted cloud message segments use the same newest-first 100-message boundaries", async () => {
  const rows = Array.from({ length: 250 }, (_, index) =>
    messageRow({
      id: `message-${String(index).padStart(3, "0")}`,
      huddle_id: "topic-1",
      created_at: new Date(Date.UTC(2026, 6, 21, 12, 0, index)).toISOString()
    })
  );
  const messages = new SupabaseMessageService(new MemorySupabaseMessageRepository(rows));

  const segment = await messages.listMessageSegment("topic-1", "message-050");

  assert.equal(segment.length, messagePageSize);
  assert.equal(segment[0].id, "message-050");
  assert.equal(segment.at(-1)?.id, "message-149");
});

test("local message subscriptions are safe no-ops", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());
  const unsubscribe = await messages.subscribeToMessages("topic-1", () => {
    throw new Error("A local message subscription should not emit.");
  });

  unsubscribe();
});

class MemorySupabaseMessageRepository implements SupabaseMessageRepository {
  readonly createdBodies: string[] = [];
  readonly createdReplyTargets: (string | undefined)[] = [];
  readonly updatedBodies: string[] = [];

  constructor(private readonly rows: SupabaseMessageRow[] = []) {}

  async listMessages(_topicId: string): Promise<SupabaseMessageRow[]> {
    return this.rows;
  }

  async listMessagePage(
    topicId: string,
    { before, limit }: { before?: { createdAt: string; id: string }; limit: number }
  ): Promise<SupabaseMessageRow[]> {
    const messages = this.rows
      .filter((message) => message.huddle_id === topicId)
      .sort((first, second) => first.created_at.localeCompare(second.created_at) || first.id.localeCompare(second.id));
    const endIndex = before
      ? messages.findIndex((message) => message.id === before.id)
      : messages.length;

    return messages.slice(Math.max(0, endIndex < 0 ? messages.length - limit - 1 : endIndex - limit - 1), endIndex < 0 ? messages.length : endIndex);
  }

  async listMessageSegment(
    topicId: string,
    messageId: string,
    limit: number
  ): Promise<SupabaseMessageRow[]> {
    const messages = this.rows
      .filter((message) => message.huddle_id === topicId)
      .sort((first, second) => first.created_at.localeCompare(second.created_at) || first.id.localeCompare(second.id));
    const messageIndex = messages.findIndex((message) => message.id === messageId);

    if (messageIndex < 0) {
      return [];
    }

    const segmentOffsetFromNewest = Math.floor((messages.length - 1 - messageIndex) / limit);
    const endIndex = messages.length - segmentOffsetFromNewest * limit;
    const startIndex = Math.max(0, endIndex - limit);

    return messages.slice(startIndex, endIndex);
  }

  async createMessage(
    topicId: string,
    body: string,
    replyToMessageId?: string
  ): Promise<SupabaseMessageRow> {
    this.createdBodies.push(body);
    this.createdReplyTargets.push(replyToMessageId);

    return messageRow({
      id: "created-message",
      huddle_id: topicId,
      body,
      reply_to_message_id: replyToMessageId ?? null,
      author_id: "profile-1",
      author_name: "Server profile"
    });
  }

  async updateMessage(messageId: string, body: string): Promise<SupabaseMessageRow> {
    this.updatedBodies.push(body);

    return messageRow({
      id: messageId,
      body,
      edited_at: "2026-07-21T12:05:00.000Z"
    });
  }

  async deleteMessage(messageId: string): Promise<SupabaseMessageRow> {
    return messageRow({
      id: messageId,
      body: "[deleted]",
      deleted_at: "2026-07-21T12:05:00.000Z"
    });
  }
}

function messageRow(overrides: Partial<SupabaseMessageRow> = {}): SupabaseMessageRow {
  return {
    id: "message",
    huddle_id: "topic-1",
    body: "Message body",
    kind: "user",
    activity_type: null,
    author_id: "profile-1",
    author_name: "Andre",
    created_at: "2026-07-21T12:00:00.000Z",
    is_unread: false,
    ...overrides
  };
}
