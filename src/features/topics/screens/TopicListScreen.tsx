import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
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

type SearchMode = "huddles" | "network";

interface FocusHandle {
  focus(): void;
}

interface PreventableEvent {
  preventDefault(): void;
}

const keepSearchInputFocusedProps =
  Platform.OS === "web"
    ? {
      onMouseDown: (event: PreventableEvent) => event.preventDefault(),
      onPointerDown: (event: PreventableEvent) => event.preventDefault(),
      onTouchStart: (event: PreventableEvent) => event.preventDefault()
    }
    : undefined;

export function TopicListScreen() {
  const theme = useTheme();
  const { createTopic, errorMessage, isLoading, lastCreatedTopicId, topics } = useTopics();
  const {
    connections,
    errorMessage: connectionErrorMessage,
    isLoading: connectionsAreLoading
  } = useConnections();
  const searchInputRef = useRef<FocusHandle | null>(null);
  const observedCreatedTopicIdRef = useRef(lastCreatedTopicId);
  const [searchMode, setSearchMode] = useState<SearchMode>("huddles");
  const [query, setQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLocaleLowerCase();
  const isNetworkMode = searchMode === "network";
  const searchModeLabel = isNetworkMode ? "talk with" : "talk about";
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
    if (isNetworkMode || !normalizedQuery) {
      return topics;
    }

    return topics.filter((topic) =>
      topic.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [isNetworkMode, normalizedQuery, topics]);
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
        connection.displayName.toLocaleLowerCase().startsWith(normalizedQuery) ||
        handle.toLocaleLowerCase().startsWith(normalizedQuery)
      );
    });
  }, [connections, normalizedQuery, selectedConnectionIdSet]);
  const inferredConnectionIds = useMemo(() => {
    if (!isNetworkMode || trimmedQuery.length === 0 || filteredConnections.length !== 1) {
      return [];
    }

    return [filteredConnections[0].id];
  }, [filteredConnections, isNetworkMode, trimmedQuery.length]);
  const inferredConnection = inferredConnectionIds.length === 1 ? filteredConnections[0] : null;
  const networkDropdownIsVisible =
    isNetworkMode && trimmedQuery.length > 0 && !inferredConnection;
  const activeConnectionIds = useMemo(() => {
    return Array.from(new Set([...selectedConnectionIds, ...inferredConnectionIds]));
  }, [inferredConnectionIds, selectedConnectionIds]);
  const visibleTopics = useMemo(() => {
    if (activeConnectionIds.length === 0) {
      return filteredTopics;
    }

    return filteredTopics.filter((topic) =>
      activeConnectionIds.every((connectionId) => topic.memberIds.includes(connectionId))
    );
  }, [activeConnectionIds, filteredTopics]);
  const impliedTopicTitle = isNetworkMode ? "" : trimmedQuery;
  const createHasTitle = impliedTopicTitle.length > 0;
  const createHasMembers = activeConnectionIds.length > 0;
  const canShowCreateOption = createHasTitle || createHasMembers;
  const canCreateImmediately = createHasTitle && createHasMembers && !isCreating && !isLoading;

  useEffect(() => {
    if (!lastCreatedTopicId || observedCreatedTopicIdRef.current === lastCreatedTopicId) {
      return;
    }

    observedCreatedTopicIdRef.current = lastCreatedTopicId;
    setQuery("");
    setSelectedConnectionIds([]);
  }, [lastCreatedTopicId]);

  function handleToggleMode() {
    setSearchMode((currentMode) => (currentMode === "huddles" ? "network" : "huddles"));
    setQuery("");
  }

  function handleClearQuery() {
    setQuery("");
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
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
    if (isNetworkMode && nextQuery.endsWith(" ")) {
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
          connection.displayName.toLocaleLowerCase().startsWith(nextNormalizedQuery) ||
          handle.toLocaleLowerCase().startsWith(nextNormalizedQuery)
        );
      });

      if (matchingConnections.length === 1) {
        handleSelectConnection(matchingConnections[0]);
        return;
      }
    }

    setQuery(nextQuery);
  }

  function openCreateScreen() {
    router.push({
      pathname: "/topics/new",
      params: {
        name: impliedTopicTitle,
        memberIds: activeConnectionIds.join(",")
      }
    });
  }

  async function handleCreateHuddle() {
    if (!canCreateImmediately) {
      openCreateScreen();
      return;
    }

    setIsCreating(true);

    try {
      const topic = await createTopic({
        name: impliedTopicTitle,
        memberIds: activeConnectionIds
      });
      setQuery("");
      setSelectedConnectionIds([]);
      router.push(`/topics/${topic.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  function getMemberSummary(memberIds: string[]) {
    const names = memberIds
      .map((memberId) => connectionNameById[memberId])
      .filter((name): name is string => Boolean(name));

    return names.length > 0 ? names.join(", ") : "No members yet";
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
            {...keepSearchInputFocusedProps}
            compact
            mode="text"
            textColor={theme.colors.onSurfaceVariant}
            contentStyle={styles.modeButtonContent}
            labelStyle={styles.modeButtonLabel}
            onPress={handleToggleMode}
            accessibilityLabel={`Search mode: ${searchModeLabel}`}
            focusable={false}
          >
            {searchModeLabel}
          </Button>
          <TextInput
            ref={(instance: FocusHandle | null) => {
              searchInputRef.current = instance;
            }}
            dense
            mode="flat"
            value={query}
            onChangeText={handleChangeQuery}
            placeholder={isNetworkMode ? "Kevin" : "League"}
            accessibilityLabel={isNetworkMode ? "Search network" : "Search huddles"}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            right={
              query ? (
                <TextInput.Icon
                  icon="close"
                  onPress={handleClearQuery}
                  accessibilityLabel="Clear search"
                />
              ) : undefined
            }
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
        {networkDropdownIsVisible ? (
          <NetworkDropdown
            connections={filteredConnections}
            errorMessage={connectionErrorMessage}
            isLoading={connectionsAreLoading}
            onSelectConnection={handleSelectConnection}
          />
        ) : null}
        {selectedConnections.length > 0 || inferredConnection ? (
          <View style={styles.recipientArea}>
            <View style={styles.chipRow}>
              {selectedConnections.map((connection) => (
                <Chip
                  {...keepSearchInputFocusedProps}
                  key={connection.id}
                  mode="flat"
                  closeIcon="close"
                  onClose={() => handleRemoveConnection(connection.id)}
                  accessibilityLabel={`Remove member ${connection.displayName}`}
                  closeIconAccessibilityLabel={`Remove ${connection.displayName}`}
                  focusable={false}
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
              {inferredConnection ? (
                <Chip
                  {...keepSearchInputFocusedProps}
                  key={`inferred-${inferredConnection.id}`}
                  mode="outlined"
                  icon="account-outline"
                  onPress={() => handleSelectConnection(inferredConnection)}
                  accessibilityLabel={`Inferred member ${inferredConnection.displayName}`}
                  focusable={false}
                  style={[
                    styles.recipientChip,
                    styles.inferredRecipientChip,
                    { borderColor: theme.colors.primary }
                  ]}
                  textStyle={[
                    styles.recipientChipText,
                    { color: theme.colors.primary }
                  ]}
                >
                  {inferredConnection.displayName}
                </Chip>
              ) : null}
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
        ) : (
          <View style={styles.topicList}>
            {visibleTopics.map((topic) => (
              <View key={topic.id}>
                <TopicListItem
                  topic={topic}
                  memberSummary={getMemberSummary(topic.memberIds)}
                  onPress={() => router.push(`/topics/${topic.id}`)}
                />
              </View>
            ))}
            {canShowCreateOption ? (
              <List.Item
                title={createHasTitle ? `Create huddle "${impliedTopicTitle}"` : "Create huddle"}
                description={
                  createHasMembers
                    ? getMemberSummary(activeConnectionIds)
                    : ""
                }
                left={(props) => <List.Icon {...props} icon="plus" />}
                right={(props) => <List.Icon {...props} icon="arrow-right" />}
                onPress={handleCreateHuddle}
                disabled={isCreating || isLoading}
                accessibilityLabel="Create huddle"
              />
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

interface NetworkDropdownProps {
  connections: Connection[];
  errorMessage: string | null;
  isLoading: boolean;
  onSelectConnection: (connection: Connection) => void;
}

function NetworkDropdown({
  connections,
  errorMessage,
  isLoading,
  onSelectConnection
}: NetworkDropdownProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Surface elevation={2} style={[styles.networkDropdown, styles.networkDropdownState]}>
        <ActivityIndicator accessibilityLabel="Loading connections" />
      </Surface>
    );
  }

  if (errorMessage) {
    return (
      <Surface elevation={2} style={[styles.networkDropdown, styles.networkDropdownState]}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          {errorMessage}
        </Text>
      </Surface>
    );
  }

  if (connections.length === 0) {
    return (
      <Surface elevation={2} style={[styles.networkDropdown, styles.networkDropdownState]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No matching network members
        </Text>
      </Surface>
    );
  }

  return (
    <Surface elevation={2} style={styles.networkDropdown}>
      {connections.map((connection, index) => (
        <View key={connection.id}>
          <List.Item
            {...keepSearchInputFocusedProps}
            title={connection.displayName}
            description={connection.handle ? `@${connection.handle}` : undefined}
            left={(props) => <List.Icon {...props} icon="account-outline" />}
            right={(props) => <List.Icon {...props} icon="plus" />}
            onPress={() => onSelectConnection(connection)}
            accessibilityLabel={`Network member ${connection.displayName}`}
            focusable={false}
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
  inferredRecipientChip: {
    backgroundColor: "transparent",
    borderStyle: "dashed"
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
  networkDropdown: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: 12,
    overflow: "hidden",
    paddingVertical: spacing.xxs
  },
  networkDropdownState: {
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
  }
});
