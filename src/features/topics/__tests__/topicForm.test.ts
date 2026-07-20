import assert from "node:assert/strict";

import { Connection } from "@/models/connection";
import {
  getConnectionIdsForTopicMemberIds,
  getTopicMemberIdsWithoutConnections
} from "@/features/topics/topicForm";

declare function test(name: string, run: () => Promise<void> | void): void;

test("topic settings resolves pending phone members to selectable connection IDs", () => {
  const connections: Connection[] = [
    {
      id: "phone:#27",
      displayName: "",
      tag: "",
      phoneNumber: "#27",
      createdAt: "2026-07-20T00:00:00.000Z"
    }
  ];

  assert.deepEqual(
    getConnectionIdsForTopicMemberIds(["#27"], connections),
    ["phone:#27"]
  );
});

test("topic settings retains huddle members that are not editable network connections", () => {
  const connections: Connection[] = [
    {
      id: "account-a",
      displayName: "Account A",
      tag: "@accounta",
      phoneNumber: "#1",
      createdAt: "2026-07-20T00:00:00.000Z"
    }
  ];

  assert.deepEqual(
    getTopicMemberIdsWithoutConnections(["account-a", "account-b"], connections),
    ["account-b"]
  );
});
