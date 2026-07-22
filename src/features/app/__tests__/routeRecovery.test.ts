import assert from "node:assert/strict";

import { getReloadRouteRecovery } from "@/features/app/routeRecovery";

declare function test(name: string, run: () => Promise<void> | void): void;

test("a browser reload at home restores the last huddle route", () => {
  assert.equal(
    getReloadRouteRecovery({
      currentPath: "/",
      lastHuddleRoute: "/topics/huddle-1",
      navigationType: "reload"
    }),
    "/topics/huddle-1"
  );
});

test("route recovery never overrides normal navigation or non-huddle routes", () => {
  assert.equal(
    getReloadRouteRecovery({
      currentPath: "/",
      lastHuddleRoute: "/topics/huddle-1",
      navigationType: "navigate"
    }),
    null
  );
  assert.equal(
    getReloadRouteRecovery({
      currentPath: "/profile",
      lastHuddleRoute: "/topics/huddle-1",
      navigationType: "reload"
    }),
    null
  );
  assert.equal(
    getReloadRouteRecovery({
      currentPath: "/",
      lastHuddleRoute: "/profile",
      navigationType: "reload"
    }),
    null
  );
});
