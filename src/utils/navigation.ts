import { router, type Href } from "expo-router";

export function goBackOrReplace(fallbackHref: Href = "/") {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // Some router contexts cannot answer canGoBack imperatively. Fall through.
  }

  router.replace(fallbackHref);
}
