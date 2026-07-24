import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Dialog, Portal, Text, useTheme } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { TopicListItem } from "@/features/topics/components/TopicListItem";
import { useTopics } from "@/features/topics/TopicProvider";
import { useUser } from "@/features/users/UserProvider";
import { getConnectionMemberAliases } from "@/models/connectionAliases";
import { getConnectionDisplayName } from "@/models/connectionDisplay";
import { Topic } from "@/models/topic";
import { spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

type TopicListItemPosition = "single" | "first" | "middle" | "last";

export function AbandonedTopicListScreen() {
  const theme = useTheme();
  const { connections } = useConnections();
  const { user } = useUser();
  const {
    abandonedErrorMessage,
    abandonedTopics,
    areAbandonedTopicsLoading,
    rejoinTopic,
    reloadAbandonedTopics
  } = useTopics();
  const [topicToRejoin, setTopicToRejoin] = useState<Topic | null>(null);
  const [isRejoining, setIsRejoining] = useState(false);
  const [rejoinError, setRejoinError] = useState("");
  const connectionNameById = useMemo(() => {
    return connections.reduce<Record<string, string>>((nameById, connection) => {
      getConnectionMemberAliases(connection).forEach((alias) => {
        nameById[alias] = getConnectionDisplayName(connection);
      });
      return nameById;
    }, {});
  }, [connections]);

  useEffect(() => {
    void reloadAbandonedTopics();
  }, [reloadAbandonedTopics]);

  function getMemberSummary(memberIds: string[]) {
    const names = memberIds
      .map((memberId) => connectionNameById[memberId])
      .filter((name): name is string => Boolean(name));

    if (names.length > 0) {
      return names.join(", ");
    }

    return user?.displayName || user?.tag || user?.phoneNumber || "Member details unavailable";
  }

  async function handleRejoin() {
    if (!topicToRejoin || isRejoining) {
      return;
    }

    setIsRejoining(true);
    setRejoinError("");

    try {
      await rejoinTopic(topicToRejoin.id);
      const topicId = topicToRejoin.id;
      setTopicToRejoin(null);
      router.replace(`/topics/${topicId}`);
    } catch (error) {
      setRejoinError(error instanceof Error ? error.message : "Huddle could not be rejoined.");
    } finally {
      setIsRejoining(false);
    }
  }

  return (
    <>
      <Screen title="Abandoned huddles" onBack={() => goBackOrReplace("/")} scroll={false}>
        {areAbandonedTopicsLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator accessibilityLabel="Loading abandoned huddles" />
          </View>
        ) : abandonedErrorMessage ? (
          <View style={styles.centerState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
              {abandonedErrorMessage}
            </Text>
          </View>
        ) : abandonedTopics.length === 0 ? (
          <View style={styles.centerState}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No abandoned huddles.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listScroller}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {abandonedTopics.map((topic, index) => (
              <TopicListItem
                key={topic.id}
                topic={topic}
                memberSummary={getMemberSummary(topic.memberIds)}
                position={getTopicListItemPosition(index, abandonedTopics.length)}
                showUnreadCount={false}
                onPress={() => {
                  setRejoinError("");
                  setTopicToRejoin(topic);
                }}
              />
            ))}
          </ScrollView>
        )}
      </Screen>
      <Portal>
        <Dialog visible={Boolean(topicToRejoin)} onDismiss={() => setTopicToRejoin(null)}>
          <Dialog.Title>Rejoin huddle?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {topicToRejoin
                ? `Rejoin "${topicToRejoin.title}" and regain access to its messages?`
                : ""}
            </Text>
            {rejoinError ? (
              <Text variant="bodySmall" style={[styles.dialogError, { color: theme.colors.error }]}>
                {rejoinError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setTopicToRejoin(null)} disabled={isRejoining}>Cancel</Button>
            <Button onPress={handleRejoin} disabled={isRejoining}>Rejoin</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function getTopicListItemPosition(index: number, itemCount: number): TopicListItemPosition {
  if (itemCount === 1) {
    return "single";
  }

  if (index === 0) {
    return "first";
  }

  if (index === itemCount - 1) {
    return "last";
  }

  return "middle";
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  list: {
    gap: spacing.xxs,
    paddingBottom: spacing.lg
  },
  listScroller: {
    flex: 1
  },
  dialogError: {
    marginTop: spacing.sm
  }
});
