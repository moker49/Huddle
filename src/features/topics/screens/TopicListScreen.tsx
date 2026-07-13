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
  Surface,
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
  const connectionNameById = useMemo(() => {
    return connections.reduce<Record<string, string>>((nameById, connection) => {
      nameById[connection.id] = connection.displayName;
      return nameById;
    }, {});
  }, [connections]);
  const filteredTopics = useMemo(() => {
    if (isPeopleMode || !normalizedQuery) {
      return topics;
    }

    return topics.filter((topic) =>
      topic.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [isPeopleMode, normalizedQuery, topics]);
  const visibleTopics = useMemo(() => {
    if (selectedConnectionIds.length === 0) {
      return filteredTopics;
    }

    return filteredTopics.filter((topic) =>
      selectedConnectionIds.every((connectionId) => topic.connectionIds.includes(connectionId))
    );
  }, [filteredTopics, selectedConnectionIds]);
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
  const peopleDropdownIsVisible = isPeopleMode && trimmedQuery.length > 0;

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

  function getConnectionSummary(connectionIds: string[]) {
    const names = connectionIds
      .map((connectionId) => connectionNameById[connectionId])
      .filter((name): name is string => Boolean(name));

    return names.length > 0 ? names.join(", ") : "No people yet";
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
        {peopleDropdownIsVisible ? (
          <PeopleDropdown
            connections={filteredConnections}
            errorMessage={connectionErrorMessage}
            isLoading={connectionsAreLoading}
            onSelectConnection={handleSelectConnection}
          />
        ) : null}
        {selectedConnections.length > 0 ? (
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
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator accessibilityLabel="Loading huddles" />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
              {errorMessage}
            </Text>
          </View>
        ) : topics.length === 0 && !trimmedQuery && selectedConnections.length === 0 ? (
          <View style={styles.centerContent}>
            <Text variant="titleMedium">No huddles yet</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Search for what you want to talk about, then create the first huddle.
            </Text>
          </View>
        ) : visibleTopics.length === 0 ? (
          <View style={styles.centerContent}>
            <Text variant="titleMedium">No matching huddles</Text>
            {selectedConnections.length > 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Try removing a person or changing your search.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.topicList}>
            {visibleTopics.map((topic, index) => (
              <View key={topic.id}>
                <TopicListItem
                  topic={topic}
                  connectionSummary={getConnectionSummary(topic.connectionIds)}
                  onPress={() => router.push(`/topics/${topic.id}`)}
                />
                {index < visibleTopics.length - 1 ? <Divider /> : null}
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

interface PeopleDropdownProps {
  connections: Connection[];
  errorMessage: string | null;
  isLoading: boolean;
  onSelectConnection: (connection: Connection) => void;
}

function PeopleDropdown({
  connections,
  errorMessage,
  isLoading,
  onSelectConnection
}: PeopleDropdownProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Surface elevation={2} style={[styles.peopleDropdown, styles.peopleDropdownState]}>
        <ActivityIndicator accessibilityLabel="Loading connections" />
      </Surface>
    );
  }

  if (errorMessage) {
    return (
      <Surface elevation={2} style={[styles.peopleDropdown, styles.peopleDropdownState]}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          {errorMessage}
        </Text>
      </Surface>
    );
  }

  if (connections.length === 0) {
    return (
      <Surface elevation={2} style={[styles.peopleDropdown, styles.peopleDropdownState]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No matching people
        </Text>
      </Surface>
    );
  }

  return (
    <Surface elevation={2} style={styles.peopleDropdown}>
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
    </Surface>
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
  peopleDropdown: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: 12,
    overflow: "hidden",
    paddingVertical: spacing.xxs
  },
  peopleDropdownState: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
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
