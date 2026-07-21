import assert from "node:assert/strict";

import { getNextTopicArchiveTime, isTopicArchived } from "@/features/topics/topicArchive";
import { Topic } from "@/models/topic";

declare function test(name: string, run: () => Promise<void> | void): void;

const now = Date.parse("2026-07-21T12:00:00.000Z");

test("a huddle moves to archived at its auto-archive time", () => {
  assert.equal(isTopicArchived("2026-07-21T11:59:59.999Z", now), true);
  assert.equal(isTopicArchived("2026-07-21T12:00:00.000Z", now), true);
  assert.equal(isTopicArchived("2026-07-21T12:00:00.001Z", now), false);
});

test("huddles without an auto-archive date remain active", () => {
  assert.equal(isTopicArchived(undefined, now), false);
  assert.equal(isTopicArchived("not-a-date", now), false);
});

test("the list refreshes at the nearest future auto-archive time", () => {
  const topics: Topic[] = [
    topic({ id: "first", autoArchiveAt: "2026-07-21T14:00:00.000Z" }),
    topic({ id: "second", autoArchiveAt: "2026-07-21T13:00:00.000Z" }),
    topic({ id: "active", autoArchiveAt: undefined })
  ];

  assert.equal(getNextTopicArchiveTime(topics, now), Date.parse("2026-07-21T13:00:00.000Z"));
});

function topic(overrides: Partial<Topic>): Topic {
  return {
    id: "topic",
    title: "Test huddle",
    memberIds: ["member"],
    createdAt: "2026-07-21T00:00:00.000Z",
    ...overrides
  };
}
