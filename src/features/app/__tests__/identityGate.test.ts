import assert from "node:assert/strict";

import { getIdentityGateState } from "@/features/app/identityGate";

declare function test(name: string, run: () => Promise<void> | void): void;

test("authenticated home navigation waits for the profile load instead of redirecting", () => {
  const state = getIdentityGateState({
    hasSession: true,
    isProfileLoading: true,
    profileErrorMessage: null,
    profileIsCurrentRoute: false,
    user: null
  });

  assert.equal(state.shouldRedirectToProfile, false);
  assert.equal(state.shouldShowLoading, true);
});

test("an authenticated user with a loaded incomplete profile is redirected to profile", () => {
  const state = getIdentityGateState({
    hasSession: true,
    isProfileLoading: false,
    profileErrorMessage: null,
    profileIsCurrentRoute: false,
    user: {
      id: "account-1",
      displayName: "",
      tag: "",
      phoneNumber: ""
    }
  });

  assert.equal(state.shouldRedirectToProfile, true);
  assert.equal(state.shouldShowLoading, true);
});
