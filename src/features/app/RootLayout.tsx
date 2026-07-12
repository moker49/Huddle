import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MessageProvider } from "@/features/messages/MessageProvider";
import { TopicProvider } from "@/features/topics/TopicProvider";
import { darkTheme, lightTheme } from "@/theme/theme";

export function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const paperTheme = isDark ? darkTheme : lightTheme;

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
