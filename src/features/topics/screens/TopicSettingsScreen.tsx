import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

interface TopicSettingsScreenProps {
  topicId?: string;
}

export function TopicSettingsScreen({ topicId }: TopicSettingsScreenProps) {
  const theme = useTheme();
  const { connections } = useConnections();
  const { getTopic, isLoading } = useTopics();
  const topic = topicId ? getTopic(topicId) : undefined;
  const memberNames = topic
    ? topic.memberIds
        .map((memberId) => (
          connections.find((connection) => connection.id === memberId)?.displayName
        ))
        .filter((name): name is string => Boolean(name))
    : [];

  if (isLoading) {
    return (
      <Screen title="Huddle settings" onBack={() => goBackOrReplace("/")}>
        <View style={styles.centerState}>
          <ActivityIndicator accessibilityLabel="Loading huddle settings" />
        </View>
      </Screen>
    );
  }

  if (!topic) {
    return (
      <Screen title="Huddle settings" onBack={() => goBackOrReplace("/")}>
        <View style={styles.centerState}>
          <Text variant="titleMedium">Huddle not found</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            This huddle may no longer be available in the current app session.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Huddle settings" onBack={() => goBackOrReplace(`/topics/${topic.id}`)}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Title
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {topic.title}
          </Text>
        </View>
        <View style={styles.section}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Members
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            {memberNames.length > 0 ? memberNames.join(", ") : "No members"}
          </Text>
        </View>
        <View style={styles.section}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Auto-archive
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            {topic.autoArchiveAt ? formatAutoArchiveDate(topic.autoArchiveAt) : "Off"}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function formatAutoArchiveDate(autoArchiveAt: string) {
  const date = new Date(autoArchiveAt);

  if (Number.isNaN(date.getTime())) {
    return "Off";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingTop: spacing.sm
  },
  section: {
    gap: spacing.xxs
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg
  }
});
