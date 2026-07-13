import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Divider,
  List,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";

import { Screen } from "@/components/Screen";
import { TopicListItem } from "@/features/topics/components/TopicListItem";
import { useTopics } from "@/features/topics/TopicProvider";
import { layout, spacing } from "@/theme/tokens";

export function TopicListScreen() {
  const theme = useTheme();
  const { createTopic, topics, isLoading, errorMessage } = useTopics();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLocaleLowerCase();
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) {
      return topics;
    }

    return topics.filter((topic) =>
      topic.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, topics]);
  const hasExactMatch = topics.some(
    (topic) => topic.name.trim().toLocaleLowerCase() === normalizedQuery
  );
  const canCreateFromQuery =
    trimmedQuery.length > 0 && !hasExactMatch && !isCreating && !isLoading;

  async function handleCreateFromQuery() {
    if (!canCreateFromQuery) {
      return;
    }

    setIsCreating(true);

    try {
      const topic = await createTopic({ name: trimmedQuery });
      setQuery("");
      router.push(`/topics/${topic.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Screen
      title={
        <View
          style={[
            styles.searchShell,
            { backgroundColor: theme.colors.surfaceVariant }
          ]}
        >
          <Button
            compact
            mode="text"
            textColor={theme.colors.onSurfaceVariant}
            contentStyle={styles.modeButtonContent}
            labelStyle={styles.modeButtonLabel}
            onPress={() => undefined}
            accessibilityLabel="Topic search mode"
          >
            talk about
          </Button>
          <TextInput
            dense
            mode="flat"
            value={query}
            onChangeText={setQuery}
            placeholder="League"
            accessibilityLabel="Search topics"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={styles.searchInput}
            contentStyle={styles.searchInputContent}
          />
        </View>
      }
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
        ) : topics.length === 0 && !trimmedQuery ? (
          <View style={styles.centerContent}>
            <Text variant="titleMedium">No topics yet</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Search for what you want to talk about, then create the first topic.
            </Text>
          </View>
        ) : filteredTopics.length === 0 ? (
          <View style={styles.centerContent}>
            <Text variant="titleMedium">No matching topics</Text>
          </View>
        ) : (
          <View style={styles.topicList}>
            {filteredTopics.map((topic, index) => (
              <View key={topic.id}>
                <TopicListItem
                  topic={topic}
                  onPress={() => router.push(`/topics/${topic.id}`)}
                />
                {index < filteredTopics.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </View>
        )}
        <View style={styles.createArea}>
          <Divider />
          {trimmedQuery ? (
            hasExactMatch ? (
              <View style={styles.exactMatchRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  A topic with this name already exists.
                </Text>
              </View>
            ) : (
              <List.Item
                title={`Create "${trimmedQuery}"`}
                left={(props) => <List.Icon {...props} icon="plus" />}
                right={(props) => <List.Icon {...props} icon="arrow-right" />}
                onPress={handleCreateFromQuery}
                disabled={!canCreateFromQuery}
                accessibilityLabel={`Create topic ${trimmedQuery}`}
              />
            )
          ) : (
            <View style={styles.createHintRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Start typing to create a topic.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchShell: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  modeButtonContent: {
    minHeight: layout.appBarActionSize,
    paddingHorizontal: spacing.xs
  },
  modeButtonLabel: {
    marginHorizontal: spacing.none
  },
  searchInput: {
    flex: 1,
    backgroundColor: "transparent"
  },
  searchInputContent: {
    minHeight: layout.minTouchTarget,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md
  },
  container: {
    flex: 1
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  topicList: {
    flexShrink: 1,
    paddingTop: spacing.sm
  },
  createArea: {
    marginTop: "auto"
  },
  createHintRow: {
    minHeight: layout.appBarHeight,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  exactMatchRow: {
    minHeight: layout.appBarHeight,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  }
});
