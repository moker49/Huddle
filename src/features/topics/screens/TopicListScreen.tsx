import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Dialog,
  Drawer,
  Icon,
  IconButton,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";

import { Screen } from "@/components/Screen";
import { MemberRail } from "@/features/connections/components/MemberRail";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useMessages } from "@/features/messages/MessageProvider";
import { TopicListItem } from "@/features/topics/components/TopicListItem";
import { useTopics } from "@/features/topics/TopicProvider";
import { useUser } from "@/features/users/UserProvider";
import { Connection } from "@/models/connection";
import { clearLocalAppData } from "@/services/localDataService";
import { layout, shape, spacing } from "@/theme/tokens";

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
const drawerWidth = 304;

export function TopicListScreen() {
  const theme = useTheme();
  const { errorMessage, isLoading, lastCreatedTopicId, reloadTopics, topics } = useTopics();
  const {
    connections,
    errorMessage: connectionErrorMessage,
    isLoading: connectionsAreLoading,
    reloadConnections
  } = useConnections();
  const { clearLoadedMessages } = useMessages();
  const { reloadUser } = useUser();
  const searchInputRef = useRef<FocusHandle | null>(null);
  const observedCreatedTopicIdRef = useRef(lastCreatedTopicId);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [drawerIsMounted, setDrawerIsMounted] = useState(false);
  const [clearDialogIsVisible, setClearDialogIsVisible] = useState(false);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [localDataMessage, setLocalDataMessage] = useState("");
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
      topic.title.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, topics]);
  const filteredConnections = useMemo(() => {
    const queryMatchesConnections = normalizedQuery
      ? connections.some((connection) => connectionMatchesQuery(connection, normalizedQuery))
      : false;

    if (normalizedQuery && !queryMatchesConnections) {
      return connections;
    }

    const matchingConnections = connections.filter((connection) => {
      if (selectedConnectionIds.includes(connection.id)) {
        return true;
      }

      if (!normalizedQuery) {
        return true;
      }

      return connectionMatchesQuery(connection, normalizedQuery);
    });

    return matchingConnections;
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
  const activeTopics = useMemo(
    () => visibleTopics.filter((topic) => !topicIsArchived(topic.autoArchiveAt)),
    [visibleTopics]
  );
  const archivedTopics = useMemo(
    () => visibleTopics.filter((topic) => topicIsArchived(topic.autoArchiveAt)),
    [visibleTopics]
  );
  const canShowCreateOption = createHasTitle || createHasMembers || activeTopics.length === 0;
  const activeListItemCount = activeTopics.length + (canShowCreateOption ? 1 : 0);

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
  }

  function handleClearSelectedConnections() {
    setSelectedConnectionIds([]);
  }

  function handleToggleConnection(connection: Connection) {
    setSelectedConnectionIds((currentIds) => {
      if (currentIds.includes(connection.id)) {
        return currentIds.filter((currentId) => currentId !== connection.id);
      }

      return [...currentIds, connection.id];
    });

    if (connectionMatchesQuery(connection, normalizedQuery)) {
      setQuery("");
    }
  }

  function handleChangeQuery(nextQuery: string) {
    setQuery(nextQuery);
  }

  function openCreateScreen() {
    router.push({
      pathname: "/topics/new",
      params: {
        title: impliedTopicTitle,
        memberIds: selectedConnectionIds.join(",")
      }
    });
  }

  function openSideMenu() {
    setDrawerIsMounted(true);
    requestAnimationFrame(() => {
      Animated.timing(drawerAnimation, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    });
  }

  function closeSideMenu() {
    Animated.timing(drawerAnimation, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setDrawerIsMounted(false);
      }
    });
  }

  async function handleClearLocalData() {
    setIsClearingLocalData(true);
    setLocalDataMessage("");

    try {
      await clearLocalAppData();
      clearLoadedMessages();
      await Promise.all([reloadConnections(), reloadTopics(), reloadUser()]);
      setQuery("");
      setSelectedConnectionIds([]);
      setClearDialogIsVisible(false);
      closeSideMenu();
      setLocalDataMessage("Local data cleared.");
    } catch {
      setLocalDataMessage("Local data could not be cleared.");
    } finally {
      setIsClearingLocalData(false);
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
      contentStyle={styles.screenContent}
      navigation={
        selectedConnectionIds.length > 0 ? (
          <Appbar.Action
            icon="arrow-left"
            onPress={handleClearSelectedConnections}
            accessibilityLabel="Clear selected members"
          />
        ) : (
          <Appbar.Action
            icon="menu"
            onPress={openSideMenu}
            accessibilityLabel="Open menu"
          />
        )
      }
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
          <ScrollView
            style={styles.topicScroller}
            contentContainerStyle={styles.topicList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {activeTopics.map((topic, index) => (
              <View key={topic.id}>
                <TopicListItem
                  topic={topic}
                  memberSummary={getMemberSummary(topic.memberIds)}
                  position={getTopicListItemPosition(index, activeListItemCount)}
                  onPress={() => router.push(`/topics/${topic.id}`)}
                />
              </View>
            ))}
            {canShowCreateOption ? (
              <Pressable
                onPress={openCreateScreen}
                accessibilityLabel="Create huddle"
                accessibilityRole="button"
                style={[
                  styles.createCard,
                  getTopicListItemCornerStyle(
                    getTopicListItemPosition(activeTopics.length, activeListItemCount)
                  ),
                  { borderColor: theme.colors.outlineVariant }
                ]}
              >
                <View
                  style={[
                    styles.createThumbnail,
                    { backgroundColor: theme.colors.surfaceVariant }
                  ]}
                >
                  <Icon
                    source="plus"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
                <View style={styles.createCopy}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={{ color: theme.colors.onSurface }}
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
                <View style={styles.createArrow}>
                  <Icon
                    source="arrow-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
            ) : null}
            {archivedTopics.length > 0 ? (
              <View style={styles.archivedSection}>
                <Text
                  variant="labelLarge"
                  style={[styles.archivedHeader, { color: theme.colors.onSurfaceVariant }]}
                >
                  Archived
                </Text>
                <View style={styles.archivedList}>
                  {archivedTopics.map((topic, index) => (
                    <View key={topic.id}>
                      <TopicListItem
                        topic={topic}
                        memberSummary={getMemberSummary(topic.memberIds)}
                        position={getTopicListItemPosition(index, archivedTopics.length)}
                        onPress={() => router.push(`/topics/${topic.id}`)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
      <Portal>
        {drawerIsMounted ? (
          <View style={styles.drawerLayer}>
            <Animated.View
              style={[
                styles.drawerScrim,
                { opacity: drawerAnimation }
              ]}
            >
              <Pressable
                accessibilityLabel="Close menu"
                accessibilityRole="button"
                onPress={closeSideMenu}
                style={styles.drawerScrimPressable}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.drawer,
                {
                  backgroundColor: theme.colors.elevation.level2,
                  transform: [
                    {
                      translateX: drawerAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-drawerWidth, 0]
                      })
                    }
                  ]
                }
              ]}
            >
              <Text
                variant="titleMedium"
                style={[styles.drawerTitle, { color: theme.colors.onSurface }]}
              >
                Huddle
              </Text>
              <Drawer.Item
                icon="delete-outline"
                label="Clear local storage"
                onPress={() => setClearDialogIsVisible(true)}
                accessibilityLabel="Clear local storage"
              />
            </Animated.View>
          </View>
        ) : null}
        <Dialog
          visible={clearDialogIsVisible}
          onDismiss={() => {
            if (!isClearingLocalData) {
              setClearDialogIsVisible(false);
            }
          }}
        >
          <Dialog.Title>Clear local storage?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This resets huddles, messages, network members, and profile data stored on this device.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setClearDialogIsVisible(false)}
              disabled={isClearingLocalData}
            >
              Cancel
            </Button>
            <Button
              onPress={handleClearLocalData}
              loading={isClearingLocalData}
              disabled={isClearingLocalData}
            >
              Clear
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar
        visible={Boolean(localDataMessage)}
        onDismiss={() => setLocalDataMessage("")}
      >
        {localDataMessage}
      </Snackbar>
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

function getTopicListItemCornerStyle(position: TopicListItemPosition) {
  switch (position) {
    case "single":
      return styles.singleCard;
    case "first":
      return styles.firstCard;
    case "last":
      return styles.lastCard;
    case "middle":
      return styles.middleCard;
  }
}

function topicIsArchived(autoArchiveAt: string | undefined) {
  if (!autoArchiveAt) {
    return false;
  }

  const archiveDate = new Date(autoArchiveAt);

  return !Number.isNaN(archiveDate.getTime()) && archiveDate.getTime() <= Date.now();
}

function connectionMatchesQuery(connection: Connection, normalizedQuery: string) {
  if (!normalizedQuery) {
    return false;
  }

  const handle = connection.handle ?? "";

  return (
    connection.displayName.toLocaleLowerCase().startsWith(normalizedQuery) ||
    handle.toLocaleLowerCase().startsWith(normalizedQuery)
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
  screenContent: {
    paddingBottom: spacing.none
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  topicScroller: {
    flex: 1
  },
  topicList: {
    gap: spacing.xxs,
    paddingBottom: spacing.lg
  },
  archivedSection: {
    paddingTop: spacing.md
  },
  archivedHeader: {
    paddingBottom: spacing.xs
  },
  archivedList: {
    gap: spacing.xxs
  },
  createCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderStyle: "dashed"
  },
  singleCard: {
    borderRadius: shape.large
  },
  firstCard: {
    borderTopLeftRadius: shape.large,
    borderTopRightRadius: shape.large,
    borderBottomLeftRadius: spacing.xxs,
    borderBottomRightRadius: spacing.xxs
  },
  middleCard: {
    borderRadius: spacing.xxs
  },
  lastCard: {
    borderTopLeftRadius: spacing.xxs,
    borderTopRightRadius: spacing.xxs,
    borderBottomLeftRadius: shape.large,
    borderBottomRightRadius: shape.large
  },
  createThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
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
    alignItems: "center",
    justifyContent: "center"
  },
  drawerLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row"
  },
  drawerScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.32)"
  },
  drawerScrimPressable: {
    flex: 1
  },
  drawer: {
    width: drawerWidth,
    maxWidth: "86%",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xs
  },
  drawerTitle: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs
  }
});
