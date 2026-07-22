import { Stack, router, usePathname } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { PropsWithChildren, useEffect, useRef } from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { ActivityIndicator, PaperProvider, useTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ConnectionProvider } from "@/features/connections/ConnectionProvider";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import {
  getReloadRouteRecovery,
  lastHuddleRouteStorageKey
} from "@/features/app/routeRecovery";
import { MessageProvider } from "@/features/messages/MessageProvider";
import { TopicProvider } from "@/features/topics/TopicProvider";
import { getIdentityGateState } from "@/features/app/identityGate";
import { UserProvider, useUser } from "@/features/users/UserProvider";
import { darkTheme, lightTheme } from "@/theme/theme";

export function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const paperTheme = isDark ? darkTheme : lightTheme;
  const [iconsLoaded] = useFonts(MaterialCommunityIcons.font);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const backgroundColor = paperTheme.colors.background;
    const root = document.getElementById("root");
    const viewport =
      document.querySelector<HTMLMetaElement>('meta[name="viewport"]') ??
      document.createElement("meta");
    const themeColor =
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ??
      document.createElement("meta");

    viewport.name = "viewport";
    viewport.content =
      "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
    themeColor.name = "theme-color";
    themeColor.content = backgroundColor;

    if (!viewport.parentElement) {
      document.head.appendChild(viewport);
    }

    if (!themeColor.parentElement) {
      document.head.appendChild(themeColor);
    }

    document.documentElement.style.backgroundColor = backgroundColor;
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.overscrollBehaviorY = "none";

    if (root) {
      root.style.backgroundColor = backgroundColor;
    }
  }, [paperTheme.colors.background]);

  if (!iconsLoaded) {
    return <View style={[styles.identityGate, { backgroundColor: paperTheme.colors.background }]} />;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <UserProvider>
            <AuthGate>
              <IdentityGate>
                <WebRouteRecovery>
                  <ConnectionProvider>
                    <TopicProvider>
                      <MessageProvider>
                        <StatusBar style={isDark ? "light" : "dark"} />
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: paperTheme.colors.background }
                          }}
                        />
                      </MessageProvider>
                    </TopicProvider>
                  </ConnectionProvider>
                </WebRouteRecovery>
              </IdentityGate>
            </AuthGate>
          </UserProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

function AuthGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const theme = useTheme();
  const { errorMessage, isLoading, session } = useAuth();
  const authIsCurrentRoute = pathname === "/auth";

  useEffect(() => {
    if (!isLoading && !errorMessage && !session && !authIsCurrentRoute) {
      router.replace("/auth" as never);
    }

    if (!isLoading && !errorMessage && session && authIsCurrentRoute) {
      router.replace("/" as never);
    }
  }, [authIsCurrentRoute, errorMessage, isLoading, session]);

  if (isLoading || (!session && !authIsCurrentRoute) || (session && authIsCurrentRoute)) {
    return (
      <View style={[styles.identityGate, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator accessibilityLabel="Loading authentication" />
      </View>
    );
  }

  return <>{children}</>;
}

function IdentityGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const theme = useTheme();
  const { session } = useAuth();
  const { errorMessage, isLoading, user } = useUser();
  const profileIsCurrentRoute = pathname === "/profile";
  const { shouldRedirectToProfile, shouldShowLoading } = getIdentityGateState({
    hasSession: Boolean(session),
    isProfileLoading: isLoading,
    profileErrorMessage: errorMessage,
    profileIsCurrentRoute,
    user
  });

  useEffect(() => {
    if (shouldRedirectToProfile) {
      router.replace("/profile");
    }
  }, [shouldRedirectToProfile]);

  if (shouldShowLoading) {
    return (
      <View style={[styles.identityGate, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator accessibilityLabel="Loading profile" />
      </View>
    );
  }

  return <>{children}</>;
}

function WebRouteRecovery({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const hasCheckedInitialRouteRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    if (!hasCheckedInitialRouteRef.current) {
      hasCheckedInitialRouteRef.current = true;
      const navigationEntry = window.performance
        .getEntriesByType("navigation")
        .at(0) as PerformanceNavigationTiming | undefined;
      const recoveredRoute = getReloadRouteRecovery({
        currentPath: pathname,
        lastHuddleRoute: window.sessionStorage.getItem(lastHuddleRouteStorageKey),
        navigationType: navigationEntry?.type
      });

      if (recoveredRoute) {
        router.replace(recoveredRoute as never);
        return;
      }
    }

    if (/^\/topics\/[^/]+(?:\/settings)?$/.test(pathname)) {
      window.sessionStorage.setItem(lastHuddleRouteStorageKey, pathname);
    } else if (pathname === "/") {
      window.sessionStorage.removeItem(lastHuddleRouteStorageKey);
    }
  }, [pathname]);

  return <>{children}</>;
}

const styles = StyleSheet.create({
  identityGate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});
