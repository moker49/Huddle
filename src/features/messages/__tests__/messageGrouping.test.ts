import assert from "node:assert/strict";

import { groupMessages } from "@/features/messages/messageGrouping";
import { Message } from "@/models/message";

declare function test(name: string, run: () => Promise<void> | void): void;

test("adjacent user messages from the same author and minute render as one group", () => {
  const groups = groupMessages([
    message({ id: "first", body: "First", createdAt: "2026-07-21T12:00:01.000Z" }),
    message({ id: "second", body: "Second", createdAt: "2026-07-21T12:00:45.000Z" })
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].messages.map((currentMessage) => currentMessage.body), ["First", "Second"]);
});

test("message grouping preserves author, minute, activity, and unread boundaries", () => {
  const groups = groupMessages([
    message({ id: "first", createdAt: "2026-07-21T12:00:01.000Z" }),
    message({ id: "unread", createdAt: "2026-07-21T12:00:45.000Z", isUnread: true }),
    message({ id: "later", createdAt: "2026-07-21T12:01:00.000Z", isUnread: true }),
    message({ id: "system", kind: "system", authorId: undefined, authorName: "System" })
  ]);

  assert.deepEqual(groups.map((group) => group.messages.map((currentMessage) => currentMessage.id)), [
    ["first"],
    ["unread"],
    ["later"],
    ["system"]
  ]);
});

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: "message",
    topicId: "topic-1",
    body: "Message",
    kind: "user",
    authorId: "author-1",
    authorName: "Andre",
    createdAt: "2026-07-21T12:00:00.000Z",
    isUnread: false,
    ...overrides
  };
}
