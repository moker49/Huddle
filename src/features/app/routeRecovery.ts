export const lastHuddleRouteStorageKey = "huddle:last-huddle-route";

interface ReloadRouteRecoveryInput {
  currentPath: string;
  lastHuddleRoute: string | null;
  navigationType: string | undefined;
}

export function getReloadRouteRecovery({
  currentPath,
  lastHuddleRoute,
  navigationType
}: ReloadRouteRecoveryInput) {
  if (
    currentPath !== "/" ||
    navigationType !== "reload" ||
    !lastHuddleRoute ||
    !isHuddleRoute(lastHuddleRoute)
  ) {
    return null;
  }

  return lastHuddleRoute;
}

function isHuddleRoute(path: string) {
  return /^\/topics\/[^/]+(?:\/settings)?$/.test(path);
}
