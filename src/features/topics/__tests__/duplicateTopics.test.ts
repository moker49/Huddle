import assert from "node:assert/strict";

import {
  duplicatePreventThreshold,
  duplicateWarnThreshold,
  findDuplicateTopicMatch,
  getTitleSimilarity
} from "@/features/topics/duplicateTopics";
import { Topic } from "@/models/topic";

declare function test(name: string, run: () => Promise<void> | void): void;

test("exact normalized title matches prevent duplicate huddle creation", () => {
  const existingTopic = createTopic("Camping 2027");
  const match = findDuplicateTopicMatch(" camping, 2027 ", [existingTopic]);

  assert.equal(match?.level, "prevent");
  assert.equal(match?.topic.id, existingTopic.id);
  assert.equal(match?.score, 1);
});

test("title similarity at or above 90 percent prevents duplicate huddle creation", () => {
  const existingTopic = createTopic("Camping 2027");
  const match = findDuplicateTopicMatch("Camping 2028", [existingTopic]);

  assert.equal(match?.level, "prevent");
  assert.equal((match?.score ?? 0) >= duplicatePreventThreshold, true);
});

test("title similarity at or above 75 percent warns about duplicate huddles", () => {
  const existingTopic = createTopic("Camping 2027");
  const match = findDuplicateTopicMatch("Camping 27", [existingTopic]);

  assert.equal(match?.level, "warn");
  assert.equal((match?.score ?? 0) >= duplicateWarnThreshold, true);
  assert.equal((match?.score ?? 0) < duplicatePreventThreshold, true);
});

test("title similarity below warning threshold allows huddle creation", () => {
  const match = findDuplicateTopicMatch("Dinner", [createTopic("Camping 2027")]);

  assert.equal(match, null);
});

test("duplicate comparison only uses the huddles passed to the matcher", () => {
  const visibleTopic = createTopic("Dinner");
  const hiddenDuplicateTopic = createTopic("Camping 2027");

  assert.equal(findDuplicateTopicMatch("Camping 2027", [visibleTopic]), null);
  assert.equal(
    findDuplicateTopicMatch("Camping 2027", [visibleTopic, hiddenDuplicateTopic])?.level,
    "prevent"
  );
});

test("title similarity ignores punctuation and repeated spacing", () => {
  assert.equal(getTitleSimilarity("Camping: 2027", "camping   2027"), 1);
});

function createTopic(title: string): Topic {
  return {
    id: title.toLocaleLowerCase().replace(/\s+/g, "-"),
    title,
    memberIds: ["user-1"],
    createdAt: "2026-07-15T12:00:00.000Z"
  };
}
