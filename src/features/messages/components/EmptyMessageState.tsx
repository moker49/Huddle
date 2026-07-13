import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import { spacing } from "@/theme/tokens";

export function EmptyMessageState() {
  const theme = useTheme();

  return (
    <View style={styles.container} accessibilityRole="summary">
      <Icon source="message-outline" size={40} color={theme.colors.onSurfaceVariant} />
      <Text variant="titleMedium" style={styles.title}>
        No messages yet
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        Send the first message to start the huddle.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs
  },
  title: {
    textAlign: "center"
  },
  description: {
    textAlign: "center"
  }
});
