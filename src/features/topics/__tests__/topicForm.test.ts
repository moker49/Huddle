import assert from "node:assert/strict";

import { Connection } from "@/models/connection";
import { getConnectionIdsForTopicMemberIds } from "@/features/topics/topicForm";

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
