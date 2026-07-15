import assert from "node:assert/strict";

import { JsonStorage } from "@/services/localJsonStorage";
import { LocalMessageService } from "@/services/messageService";

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
