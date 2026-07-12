import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MessageProvider } from "@/features/messages/MessageProvider";
import { TopicProvider } from "@/features/topics/TopicProvider";
import { darkTheme, lightTheme } from "@/theme/theme";

export function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const paperTheme = isDark ? darkTheme : lightTheme;

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

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
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
      </PaperProvider>
    </SafeAreaProvider>
  );
}
