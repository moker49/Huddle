import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  IconButton,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";

import { Screen } from "@/components/Screen";
import { MemberRail } from "@/features/connections/components/MemberRail";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { TopicListItem } from "@/features/topics/components/TopicListItem";
import { useTopics } from "@/features/topics/TopicProvider";
import { Connection } from "@/models/connection";
import { layout, spacing } from "@/theme/tokens";

type TopicListItemPosition = "single" | "first" | "middle" | "last";

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
  const [query, setQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLocaleLowerCase();
  const connectionNameById = useMemo(() => {
    return connections.reduce<Record<string, string>>((nameById, connection) => {
      nameById[connection.id] = connection.displayName;
      return nameById;
    }, {});
  }, [connections]);
  const filteredTopics = useMemo(() => {
    if (!normalizedQuery) {
      return topics;
    }

    return topics.filter((topic) =>
      topic.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, topics]);
  const filteredConnections = useMemo(() => {
    const matchingConnections = connections.filter((connection) => {
      if (selectedConnectionIds.includes(connection.id)) {
        return true;
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

    return normalizedQuery && matchingConnections.length === 0
      ? connections
      : matchingConnections;
  }, [connections, normalizedQuery, selectedConnectionIds]);
  const visibleTopics = useMemo(() => {
    if (selectedConnectionIds.length === 0) {
      return filteredTopics;
    }

    return filteredTopics.filter((topic) =>
      selectedConnectionIds.every((connectionId) => topic.memberIds.includes(connectionId))
    );
  }, [filteredTopics, selectedConnectionIds]);
  const impliedTopicTitle = trimmedQuery;
  const createHasTitle = impliedTopicTitle.length > 0;
  const createHasMembers = selectedConnectionIds.length > 0;
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

  function handleClearQuery() {
    setQuery("");
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }

  function handleToggleConnection(connection: Connection) {
    setSelectedConnectionIds((currentIds) => {
      if (currentIds.includes(connection.id)) {
        return currentIds.filter((currentId) => currentId !== connection.id);
      }

      return [...currentIds, connection.id];
    });
    setQuery("");
  }

  function handleChangeQuery(nextQuery: string) {
    setQuery(nextQuery);
  }

  function openCreateScreen() {
    router.push({
      pathname: "/topics/new",
      params: {
        name: impliedTopicTitle,
        memberIds: selectedConnectionIds.join(",")
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
        memberIds: selectedConnectionIds
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
            { backgroundColor: theme.colors.elevation.level2 }
          ]}
        >
          <TextInput
            ref={(instance: FocusHandle | null) => {
              searchInputRef.current = instance;
            }}
            dense
            mode="flat"
            value={query}
            onChangeText={handleChangeQuery}
            placeholder="Search huddles and members"
            accessibilityLabel="Search huddles and members"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={styles.searchInput}
            contentStyle={styles.searchInputContent}
          />
          <IconButton
            {...keepSearchInputFocusedProps}
            icon={query ? "close" : "account-circle-outline"}
            size={24}
            onPress={query ? handleClearQuery : () => router.push("/profile")}
            accessibilityLabel={query ? "Clear search" : "Profile"}
            focusable={false}
            iconColor={theme.colors.onSurfaceVariant}
            style={styles.searchAdornment}
          />
        </View>
      }
      scroll={false}
      navigation={<Appbar.Action icon="menu" onPress={() => undefined} accessibilityLabel="Menu" />}
      action={<View style={styles.trailingSearchInset} />}
    >
      <View style={styles.container}>
        <MemberRail
          connections={filteredConnections}
          errorMessage={connectionErrorMessage}
          isLoading={connectionsAreLoading}
          onToggleConnection={handleToggleConnection}
          selectedConnectionIds={selectedConnectionIds}
        />
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
            {visibleTopics.map((topic, index) => (
              <View key={topic.id}>
                <TopicListItem
                  topic={topic}
                  memberSummary={getMemberSummary(topic.memberIds)}
                  position={getTopicListItemPosition(index, visibleTopics.length)}
                  onPress={() => router.push(`/topics/${topic.id}`)}
                />
              </View>
            ))}
            {canShowCreateOption ? (
              <Pressable
                onPress={handleCreateHuddle}
                disabled={isCreating || isLoading}
                accessibilityLabel="Create huddle"
                accessibilityRole="button"
                style={[
                  styles.createCard,
                  { backgroundColor: theme.colors.elevation.level1 }
                ]}
              >
                <View
                  style={[
                    styles.createThumbnail,
                    { backgroundColor: theme.colors.surfaceVariant }
                  ]}
                >
                  <IconButton
                    icon="plus"
                    size={24}
                    iconColor={theme.colors.onSurfaceVariant}
                    style={styles.createIcon}
                  />
                </View>
                <View style={styles.createCopy}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Create huddle
                  </Text>
                  {createHasMembers ? (
                    <Text
                      variant="bodySmall"
                      numberOfLines={1}
                      style={[styles.createMembers, { color: theme.colors.onSurfaceVariant }]}
                    >
                      {getMemberSummary(selectedConnectionIds)}
                    </Text>
                  ) : null}
                </View>
                <IconButton
                  icon="arrow-right"
                  size={24}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.createArrow}
                />
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
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
  searchShell: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  searchInput: {
    flex: 1,
    minWidth: 88,
    backgroundColor: "transparent"
  },
  searchInputContent: {
    minHeight: layout.minTouchTarget,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs
  },
  searchAdornment: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    marginTop: spacing.none,
    marginRight: spacing.none,
    marginBottom: spacing.none,
    marginLeft: spacing.none
  },
  trailingSearchInset: {
    width: spacing.xs
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
    gap: spacing.xxs,
    paddingTop: spacing.sm
  },
  createCard: {
    minHeight: 76,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  createThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  createIcon: {
    width: 48,
    height: 48,
    margin: spacing.none
  },
  createCopy: {
    flex: 1,
    minWidth: 0
  },
  createMembers: {
    marginTop: spacing.xxs
  },
  createArrow: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    margin: spacing.none
  }
});
