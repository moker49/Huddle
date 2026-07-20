import assert from "node:assert/strict";

import { findDirectoryUser } from "@/services/directoryUsers";

declare function test(name: string, run: () => Promise<void> | void): void;

test("directory users resolve profile UUIDs without treating them as tags", () => {
  const profileId = "46bb2d34-6eb8-4695-bbdd-1d8d4697db36";
  const user = {
    id: profileId,
    displayName: "Account B",
    tag: "@accountb",
    phoneNumber: "#2",
    createdAt: "2026-07-20T00:00:00.000Z"
  };

  assert.equal(findDirectoryUser([user], profileId)?.id, profileId);
});
