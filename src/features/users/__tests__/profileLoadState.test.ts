import assert from "node:assert/strict";

import { isProfileLoadingForAccount } from "@/features/users/profileLoadState";

declare function test(name: string, run: () => Promise<void> | void): void;

test("a restored session waits for its profile before identity routing", () => {
  assert.equal(
    isProfileLoadingForAccount({
      accountId: "account-1",
      isLoading: false,
      loadedAccountId: null
    }),
    true
  );
});

test("a loaded profile for the active account is not considered loading", () => {
  assert.equal(
    isProfileLoadingForAccount({
      accountId: "account-1",
      isLoading: false,
      loadedAccountId: "account-1"
    }),
    false
  );
});
