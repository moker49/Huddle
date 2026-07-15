import assert from "node:assert/strict";

import { getConnectionDisplayName } from "@/models/connectionDisplay";
import { formatPublicIdentifier } from "@/models/identifierDisplay";

declare function test(name: string, run: () => Promise<void> | void): void;

test("public identifier display strips internal phone and tag prefixes", () => {
  assert.equal(formatPublicIdentifier("phone:#27"), "#27");
  assert.equal(formatPublicIdentifier("tag:@mytag"), "@mytag");
});

test("connection display fallback strips internal identifier prefixes", () => {
  assert.equal(
    getConnectionDisplayName({ displayName: "", tag: "tag:@mytag", phoneNumber: "" }),
    "@mytag"
  );
  assert.equal(
    getConnectionDisplayName({ displayName: "", tag: "", phoneNumber: "phone:#27" }),
    "#27"
  );
});
