import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Divider, FAB, Text, useTheme } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { TopicListItem } from "@/features/topics/components/TopicListItem";
import { useTopics } from "@/features/topics/TopicProvider";
import { spacing } from "@/theme/tokens";

export function TopicListScreen() {
  const theme = useTheme();
  const { topics, isLoading, errorMessage } = useTopics();

  return (
    <Screen
      title="Topics"
      scroll={false}
      navigation={<Appbar.Action icon="menu" onPress={() => undefined} accessibilityLabel="Menu" />}
      action={
        <Appbar.Action
          icon="account-circle-outline"
          onPress={() => router.push("/profile")}
          accessibilityLabel="Profile"
        />
      }
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator accessibilityLabel="Loading topics" />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
              {errorMessage}
            </Text>
          </View>
        ) : topics.length === 0 ? (
          <View style={styles.centerContent}>
            <Text variant="titleMedium">No topics yet</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Create the first topic to start a focused discussion.
            </Text>
          </View>
        ) : (
          <View>
            {topics.map((topic, index) => (
              <View key={topic.id}>
                <TopicListItem
                  topic={topic}
                  onPress={() => router.push(`/topics/${topic.id}`)}
                />
                {index < topics.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </View>
        )}
      </View>
      <FAB
        icon="plus"
        label="New topic"
        onPress={() => router.push("/topics/new")}
        style={styles.fab}
        accessibilityLabel="Create topic"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.lg
  }
});
