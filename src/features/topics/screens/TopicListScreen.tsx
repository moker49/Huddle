import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Text,
  useTheme
} from "react-native-paper";

import { Screen } from "@/components/Screen";
import { MemberAvatar } from "@/components/MemberAvatar";
import { MemberRail } from "@/features/connections/components/MemberRail";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { TopicActionSheet } from "@/features/topics/components/TopicActionSheet";
import { TopicListItem } from "@/features/topics/components/TopicListItem";
import { getNextTopicArchiveTime, isTopicArchived } from "@/features/topics/topicArchive";
import { useTopics } from "@/features/topics/TopicProvider";
import { useUser } from "@/features/users/UserProvider";
import { Connection } from "@/models/connection";
import { getConnectionMemberAliases } from "@/models/connectionAliases";
import { connectionMatchesText, getConnectionDisplayName } from "@/models/connectionDisplay";
import { Topic } from "@/models/topic";
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
const webInputFocusReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as object)
  : undefined;
const drawerWidth = 304;

export function TopicListScreen() {
  const theme = useTheme();
  const { errorMessage, isLoading, lastCreatedTopicId, leaveTopic, topics } = useTopics();
  const {
    connections,
    errorMessage: connectionErrorMessage,
    isLoading: connectionsAreLoading
  } = useConnections();
  const { user } = useUser();
  const searchInputRef = useRef<FocusHandle | null>(null);
  const observedCreatedTopicIdRef = useRef(lastCreatedTopicId);
  const leaveDialogHistoryEntryIsActiveRef = useRef(false);
  const leaveDialogScrollRestorationRef = useRef<History["scrollRestoration"] | null>(null);
  const drawerAnimation = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [drawerIsMounted, setDrawerIsMounted] = useState(false);
  const [topicForActions, setTopicForActions] = useState<Topic | null>(null);
  const [topicToLeave, setTopicToLeave] = useState<Topic | null>(null);
  const [leaveError, setLeaveError] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLocaleLowerCase();
  const hasNetworkMembers = connections.length > 0;
  const shouldShowNetworkCta = !connectionsAreLoading && !connectionErrorMessage && !hasNetworkMembers;
  const connectionNameById = useMemo(() => {
    return connections.reduce<Record<string, string>>((nameById, connection) => {
      getConnectionMemberAliases(connection).forEach((alias) => {
        nameById[alias] = getConnectionDisplayName(connection);
      });
      return nameById;
    }, {});
  }, [connections]);
  const connectionAliasesById = useMemo(() => {
    return connections.reduce<Record<string, string[]>>((aliasesById, connection) => {
      aliasesById[connection.id] = getConnectionMemberAliases(connection);
      return aliasesById;
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
      selectedConnectionIds.every((connectionId) =>
        connectionAliasesById[connectionId]?.some((alias) => topic.memberIds.includes(alias))
      )
    );
  }, [connectionAliasesById, filteredTopics, selectedConnectionIds]);
  const impliedTopicTitle = trimmedQuery;
  const createHasMembers = selectedConnectionIds.length > 0;
  const activeTopics = useMemo(
    () => visibleTopics.filter((topic) => !isTopicArchived(topic.autoArchiveAt, currentTime)),
    [currentTime, visibleTopics]
  );
  const archivedTopics = useMemo(
    () => visibleTopics.filter((topic) => isTopicArchived(topic.autoArchiveAt, currentTime)),
    [currentTime, visibleTopics]
  );
  const nextArchiveTime = useMemo(
    () => getNextTopicArchiveTime(visibleTopics, currentTime),
    [currentTime, visibleTopics]
  );
  const canShowCreateOption = hasNetworkMembers;
  const activeListItemCount = activeTopics.length + (canShowCreateOption ? 1 : 0);

  useEffect(() => {
    if (!lastCreatedTopicId || observedCreatedTopicIdRef.current === lastCreatedTopicId) {
      return;
    }

    observedCreatedTopicIdRef.current = lastCreatedTopicId;
    setQuery("");
    setSelectedConnectionIds([]);
  }, [lastCreatedTopicId]);

  useEffect(() => {
    if (!nextArchiveTime) {
      return;
    }

    const maximumTimerDelay = 2_147_483_647;
    const delay = Math.min(Math.max(0, nextArchiveTime - Date.now()), maximumTimerDelay);
    const timer = setTimeout(() => setCurrentTime(Date.now()), delay);

    return () => clearTimeout(timer);
  }, [nextArchiveTime]);

  const dismissLeaveDialog = useCallback(() => {
    if (Platform.OS === "web" && leaveDialogHistoryEntryIsActiveRef.current) {
      leaveDialogHistoryEntryIsActiveRef.current = false;
      window.history.back();
    }

    setLeaveError("");
    setTopicToLeave(null);
  }, []);

  useEffect(() => {
    if (!topicToLeave) {
      return;
    }

    if (Platform.OS === "web") {
      const handlePopState = () => {
        leaveDialogHistoryEntryIsActiveRef.current = false;
        setLeaveError("");
        setTopicToLeave(null);
      };

      leaveDialogScrollRestorationRef.current = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      window.history.pushState({ leaveHuddleDialog: true }, "");
      leaveDialogHistoryEntryIsActiveRef.current = true;
      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);

        if (leaveDialogScrollRestorationRef.current) {
          window.history.scrollRestoration = leaveDialogScrollRestorationRef.current;
          leaveDialogScrollRestorationRef.current = null;
        }
      };
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      dismissLeaveDialog();
      return true;
    });

    return () => subscription.remove();
  }, [dismissLeaveDialog, topicToLeave]);

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

  const handleDismissTopicActions = useCallback(() => {
    setTopicForActions(null);
  }, []);

  const handleRequestLeave = useCallback((topic: Topic) => {
    setLeaveError("");
    setTopicToLeave(topic);
  }, []);

  const handleConfirmLeave = useCallback(async () => {
    if (!topicToLeave || isLeaving) {
      return;
    }

    setIsLeaving(true);
    setLeaveError("");

    try {
      await leaveTopic(topicToLeave.id);
      dismissLeaveDialog();
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : "Huddle could not be left.");
    } finally {
      setIsLeaving(false);
    }
  }, [dismissLeaveDialog, isLeaving, leaveTopic, topicToLeave]);

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

  function closeSideMenu(onClosed?: () => void) {
    Animated.timing(drawerAnimation, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setDrawerIsMounted(false);
        onClosed?.();
      }
    });
  }

  function getMemberSummary(memberIds: string[]) {
    const names = memberIds
      .map((memberId) => connectionNameById[memberId])
      .filter((name): name is string => Boolean(name));

    if (names.length > 0) {
      return names.join(", ");
    }

    const userIsMember = user && getUserMemberAliases(user).some((alias) => memberIds.includes(alias));
    if (user && (userIsMember || memberIds.length === 0)) {
      return user.displayName || user.tag || user.phoneNumber;
    }

    return user?.displayName || user?.tag || user?.phoneNumber || "Member details unavailable";
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
          <NativeTextInput
            ref={(instance: FocusHandle | null) => {
              searchInputRef.current = instance;
            }}
            value={query}
            onChangeText={handleChangeQuery}
            placeholder="Search huddles and members"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            accessibilityLabel="Search huddles and members"
            style={[styles.searchInput, webInputFocusReset, { color: theme.colors.onSurface }]}
          />
          {query ? (
            <IconButton
              {...keepSearchInputFocusedProps}
              icon="close"
              size={24}
              onPress={handleClearQuery}
              accessibilityLabel="Clear search"
              focusable={false}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.searchAdornment}
            />
          ) : (
            <Pressable
              {...keepSearchInputFocusedProps}
              onPress={() => router.push("/profile")}
              accessibilityLabel="Profile"
              accessibilityRole="button"
              focusable={false}
              style={styles.profileAdornment}
            >
              <MemberAvatar
                avatarUrl={user?.avatarUrl}
                label={user?.displayName || user?.tag || "Profile"}
                size={32}
              />
            </Pressable>
          )}
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
        {!connectionsAreLoading && !connectionErrorMessage && !hasNetworkMembers ? null : (
          <MemberRail
            connections={filteredConnections}
            errorMessage={connectionErrorMessage}
            isLoading={connectionsAreLoading}
            onToggleConnection={handleToggleConnection}
            selectedConnectionIds={selectedConnectionIds}
          />
        )}
        {isLoading || connectionsAreLoading ? (
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
                  onLongPress={setTopicForActions}
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
                        mutedIcon
                        position={getTopicListItemPosition(index, archivedTopics.length)}
                        onPress={() => router.push(`/topics/${topic.id}`)}
                        onLongPress={setTopicForActions}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
        {!isLoading && !errorMessage && shouldShowNetworkCta ? (
          <View pointerEvents="box-none" style={styles.networkCtaLayer}>
            <Pressable
              onPress={() => router.push({
                pathname: "/profile",
                params: { addNetwork: "1" }
              })}
              accessibilityLabel="Add people"
              accessibilityRole="button"
              style={[
                styles.networkCta,
                { borderColor: theme.colors.outlineVariant }
              ]}
            >
              <View
                style={[
                  styles.networkCtaIcon,
                  { backgroundColor: theme.colors.surfaceVariant }
                ]}
              >
                <Icon
                  source="account-plus"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
              <View style={styles.networkCtaCopy}>
                <Text
                  variant="titleMedium"
                  numberOfLines={1}
                  style={{ color: theme.colors.onSurface }}
                >
                  Add people
                </Text>
                <Text
                  variant="bodyMedium"
                  numberOfLines={2}
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Build your network to create huddles.
                </Text>
              </View>
              <Icon
                source="arrow-right"
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>
          </View>
        ) : null}
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
                onPress={() => closeSideMenu()}
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
              <Pressable
                onPress={() => closeSideMenu(() => router.push("/abandoned-huddles" as never))}
                accessibilityLabel="View abandoned huddles"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.drawerItem,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent"
                  }
                ]}
              >
                <Icon source="history" size={24} color={theme.colors.onSurfaceVariant} />
                <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
                  Abandoned huddles
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
        <Dialog
          visible={Boolean(topicToLeave)}
          onDismiss={() => {
            if (!isLeaving) {
              dismissLeaveDialog();
            }
          }}
        >
          <Dialog.Title>Leave huddle?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              You will lose access to this huddle and its message history.
            </Text>
            {leaveError ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {leaveError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={dismissLeaveDialog} disabled={isLeaving}>Cancel</Button>
            <Button onPress={handleConfirmLeave} loading={isLeaving} disabled={isLeaving}>
              Leave
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <TopicActionSheet
        topic={topicForActions}
        onDismiss={handleDismissTopicActions}
        onLeave={handleRequestLeave}
      />
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

function connectionMatchesQuery(connection: Connection, normalizedQuery: string) {
  if (!normalizedQuery) {
    return false;
  }

  return connectionMatchesText(connection, normalizedQuery);
}

function getUserMemberAliases(user: {
  id: string;
  phoneNumber: string;
  tag: string;
}) {
  const tagId = user.tag.startsWith("@") ? user.tag.slice(1) : user.tag;

  return [
    user.id,
    user.tag,
    tagId,
    user.phoneNumber,
    user.phoneNumber ? `phone:${user.phoneNumber}` : ""
  ].filter(Boolean);
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
    height: layout.minTouchTarget,
    paddingTop: spacing.none,
    paddingRight: spacing.xs,
    paddingBottom: spacing.none,
    paddingLeft: spacing.md,
    fontSize: 16,
    backgroundColor: "transparent"
  },
  searchAdornment: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    marginTop: spacing.none,
    marginRight: spacing.none,
    marginBottom: spacing.none,
    marginLeft: spacing.none
  },
  profileAdornment: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: "center",
    justifyContent: "center"
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
  networkCtaLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: "33%",
    paddingHorizontal: spacing.none
  },
  networkCta: {
    minHeight: 168,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: shape.large
  },
  networkCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  networkCtaCopy: {
    flex: 1,
    minWidth: 0
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
  },
  drawerItem: {
    minHeight: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md
  }
});
