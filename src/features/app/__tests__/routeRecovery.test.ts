import assert from "node:assert/strict";

import { getReloadRouteRecovery } from "@/features/app/routeRecovery";

declare function test(name: string, run: () => Promise<void> | void): void;

test("a fresh app load at home restores the last huddle route", () => {
  assert.equal(
    getReloadRouteRecovery({
      currentPath: "/",
      lastHuddleRoute: "/topics/huddle-1"
    }),
    "/topics/huddle-1"
  );
});

test("route recovery ignores non-home paths and non-huddle routes", () => {
  assert.equal(
    getReloadRouteRecovery({
      currentPath: "/profile",
      lastHuddleRoute: "/topics/huddle-1"
    }),
    null
  );
  assert.equal(
    getReloadRouteRecovery({
      currentPath: "/",
      lastHuddleRoute: "/profile"
    }),
    null
  );
});
