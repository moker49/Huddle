import assert from "node:assert/strict";

import { JsonStorage } from "@/services/localJsonStorage";
import {
  LocalMessageService,
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

test("resetting local message data clears messages", async () => {
  const messages = new LocalMessageService(new MemoryJsonStorage());

  await messages.createMessage({
    topicId: "topic-1",
    body: "temporary",
    authorId: "user-1",
    authorName: "Efren"
  });

  await messages.resetLocalData();

  assert.deepEqual(await messages.listMessages("topic-1"), []);
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
      author_name: "Andre"
    })
  ]);
  const messages = new SupabaseMessageService(repository);

  const result = await messages.listMessages("topic-1");

  assert.deepEqual(result.map((message) => message.id), ["message-1", "message-2"]);
  assert.equal(result[0].activityType, "huddle_created");
  assert.equal(result[0].authorId, undefined);
  assert.equal(result[1].authorName, "Andre");
  assert.equal(result[1].authorId, "author-1");
});

test("cloud message creation trims text and uses the backend-resolved author", async () => {
  const repository = new MemorySupabaseMessageRepository();
  const messages = new SupabaseMessageService(repository);

  const created = await messages.createMessage({
    topicId: "topic-1",
    body: "  Ready when you are.  ",
    authorId: "untrusted-client-author",
    authorName: "Untrusted client name"
  });

  assert.equal(repository.createdBodies[0], "Ready when you are.");
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

class MemorySupabaseMessageRepository implements SupabaseMessageRepository {
  readonly createdBodies: string[] = [];

  constructor(private readonly rows: SupabaseMessageRow[] = []) {}

  async listMessages(_topicId: string): Promise<SupabaseMessageRow[]> {
    return this.rows;
  }

  async createMessage(topicId: string, body: string): Promise<SupabaseMessageRow> {
    this.createdBodies.push(body);

    return messageRow({
      id: "created-message",
      huddle_id: topicId,
      body,
      author_id: "profile-1",
      author_name: "Server profile"
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
    ...overrides
  };
}
