import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Chip,
  Divider,
  List,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";

import { Screen } from "@/components/Screen";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { TopicListItem } from "@/features/topics/components/TopicListItem";
import { useTopics } from "@/features/topics/TopicProvider";
import { Connection } from "@/models/connection";
import { layout, spacing } from "@/theme/tokens";

type SearchMode = "huddles" | "people";

export function TopicListScreen() {
  const theme = useTheme();
  const { createTopic, topics, isLoading, errorMessage } = useTopics();
  const {
    connections,
    errorMessage: connectionErrorMessage,
    isLoading: connectionsAreLoading
  } = useConnections();
  const [searchMode, setSearchMode] = useState<SearchMode>("huddles");
  const [query, setQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLocaleLowerCase();
  const isPeopleMode = searchMode === "people";
  const searchModeLabel = isPeopleMode ? "talk with" : "talk about";
  const selectedConnectionIdSet = useMemo(
    () => new Set(selectedConnectionIds),
    [selectedConnectionIds]
  );
  const selectedConnections = useMemo(
    () => connections.filter((connection) => selectedConnectionIdSet.has(connection.id)),
    [connections, selectedConnectionIdSet]
  );
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) {
      return topics;
    }

    return topics.filter((topic) =>
      topic.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, topics]);
  const filteredConnections = useMemo(() => {
    return connections.filter((connection) => {
      if (selectedConnectionIdSet.has(connection.id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const handle = connection.handle ?? "";
      return (
        connection.displayName.toLocaleLowerCase().includes(normalizedQuery) ||
        handle.toLocaleLowerCase().includes(normalizedQuery)
      );
    });
  }, [connections, normalizedQuery, selectedConnectionIdSet]);
  const hasExactMatch = topics.some(
    (topic) => topic.name.trim().toLocaleLowerCase() === normalizedQuery
  );
  const canCreateFromQuery =
    !isPeopleMode && trimmedQuery.length > 0 && !hasExactMatch && !isCreating && !isLoading;

  function handleToggleMode() {
    setSearchMode((currentMode) => (currentMode === "huddles" ? "people" : "huddles"));
    setQuery("");
  }

  function handleSelectConnection(connection: Connection) {
    setSelectedConnectionIds((currentIds) => {
      if (currentIds.includes(connection.id)) {
        return currentIds;
      }

      return [...currentIds, connection.id];
    });
    setQuery("");
  }

  function handleRemoveConnection(connectionId: string) {
    setSelectedConnectionIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== connectionId)
    );
  }

  function handleChangeQuery(nextQuery: string) {
    if (isPeopleMode && nextQuery.endsWith(" ")) {
      const nextNormalizedQuery = nextQuery.trim().toLocaleLowerCase();
      const matchingConnections = connections.filter((connection) => {
        if (selectedConnectionIdSet.has(connection.id)) {
          return false;
        }

        if (!nextNormalizedQuery) {
          return false;
        }

        const handle = connection.handle ?? "";
        return (
          connection.displayName.toLocaleLowerCase().includes(nextNormalizedQuery) ||
          handle.toLocaleLowerCase().includes(nextNormalizedQuery)
        );
      });

      if (matchingConnections.length === 1) {
        handleSelectConnection(matchingConnections[0]);
        return;
      }
    }

    setQuery(nextQuery);
  }

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
            onPress={handleToggleMode}
            accessibilityLabel={`Search mode: ${searchModeLabel}`}
          >
            {searchModeLabel}
          </Button>
          <TextInput
            dense
            mode="flat"
            value={query}
            onChangeText={handleChangeQuery}
            placeholder={isPeopleMode ? "Kevin" : "League"}
            accessibilityLabel={isPeopleMode ? "Search people" : "Search huddles"}
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
        {isPeopleMode && selectedConnections.length > 0 ? (
          <View style={styles.recipientArea}>
            <View style={styles.chipRow}>
              {selectedConnections.map((connection) => (
                <Chip
                  key={connection.id}
                  mode="flat"
                  closeIcon="close"
                  onClose={() => handleRemoveConnection(connection.id)}
                  accessibilityLabel={`Remove ${connection.displayName}`}
                  closeIconAccessibilityLabel={`Remove ${connection.displayName}`}
                  style={[
                    styles.recipientChip,
                    { backgroundColor: theme.colors.secondaryContainer }
                  ]}
                  textStyle={[
                    styles.recipientChipText,
                    { color: theme.colors.onSecondaryContainer }
                  ]}
                >
                  {connection.displayName}
                </Chip>
              ))}
            </View>
          </View>
        ) : null}
        {isPeopleMode ? (
          <PeopleSearchResults
            connections={filteredConnections}
            errorMessage={connectionErrorMessage}
            isLoading={connectionsAreLoading}
            onSelectConnection={handleSelectConnection}
            query={trimmedQuery}
            selectedConnectionCount={selectedConnections.length}
          />
        ) : isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator accessibilityLabel="Loading huddles" />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
              {errorMessage}
            </Text>
          </View>
        ) : topics.length === 0 && !trimmedQuery ? (
          <View style={styles.centerContent}>
            <Text variant="titleMedium">No huddles yet</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Search for what you want to talk about, then create the first huddle.
            </Text>
          </View>
        ) : filteredTopics.length === 0 ? (
          <View style={styles.centerContent}>
            <Text variant="titleMedium">No matching huddles</Text>
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
        {isPeopleMode ? null : (
          <View style={styles.createArea}>
            <Divider />
            {trimmedQuery ? (
              hasExactMatch ? (
                <View style={styles.exactMatchRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    A huddle with this name already exists.
                  </Text>
                </View>
              ) : (
                <List.Item
                  title={`Create huddle "${trimmedQuery}"`}
                  left={(props) => <List.Icon {...props} icon="plus" />}
                  right={(props) => <List.Icon {...props} icon="arrow-right" />}
                  onPress={handleCreateFromQuery}
                  disabled={!canCreateFromQuery}
                  accessibilityLabel={`Create huddle ${trimmedQuery}`}
                />
              )
            ) : (
              <View style={styles.createHintRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Start typing to create a huddle.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

interface PeopleSearchResultsProps {
  connections: Connection[];
  errorMessage: string | null;
  isLoading: boolean;
  onSelectConnection: (connection: Connection) => void;
  query: string;
  selectedConnectionCount: number;
}

function PeopleSearchResults({
  connections,
  errorMessage,
  isLoading,
  onSelectConnection,
  query,
  selectedConnectionCount
}: PeopleSearchResultsProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator accessibilityLabel="Loading connections" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.centerContent}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          {errorMessage}
        </Text>
      </View>
    );
  }

  if (connections.length === 0) {
    const hasSelectedConnections = selectedConnectionCount > 0;

    return (
      <View style={styles.centerContent}>
        <Text variant="titleMedium">
          {query
            ? "No matching people"
            : hasSelectedConnections
              ? "All matching people selected"
              : "No connections yet"}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {hasSelectedConnections
            ? "Remove a chip to add that person again."
            : "People selection and shared huddles come next."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.topicList}>
      {connections.map((connection, index) => (
        <View key={connection.id}>
          <List.Item
            title={connection.displayName}
            description={connection.handle ? `@${connection.handle}` : undefined}
            left={(props) => <List.Icon {...props} icon="account-outline" />}
            right={(props) => <List.Icon {...props} icon="plus" />}
            onPress={() => onSelectConnection(connection)}
            accessibilityLabel={`Connection ${connection.displayName}`}
          />
          {index < connections.length - 1 ? <Divider /> : null}
        </View>
      ))}
    </View>
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
    paddingLeft: spacing.md,
    paddingRight: spacing.xs
  },
  modeButtonLabel: {
    marginHorizontal: spacing.none
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  recipientChip: {
    justifyContent: "center"
  },
  recipientChipText: {
    lineHeight: 20,
    textAlignVertical: "center"
  },
  searchInput: {
    flex: 1,
    minWidth: 88,
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
  recipientArea: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs
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
