export const lastHuddleRouteStorageKey = "huddle:last-huddle-route";

interface ReloadRouteRecoveryInput {
  currentPath: string;
  lastHuddleRoute: string | null;
}

export function getReloadRouteRecovery({
  currentPath,
  lastHuddleRoute
}: ReloadRouteRecoveryInput) {
  if (
    currentPath !== "/" ||
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
