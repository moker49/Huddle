import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from "react-native";
import { Divider, FAB, Text, useTheme } from "react-native-paper";
import { FlashList, FlashListRef, ListRenderItemInfo, ViewToken } from "@shopify/flash-list";

import { EmptyMessageState } from "@/features/messages/components/EmptyMessageState";
import { MessageActionSheet } from "@/features/messages/components/MessageActionSheet";
import { MessageBubble } from "@/features/messages/components/MessageBubble";
import { formatMessageDay, getMessageDayKey } from "@/features/messages/messageDates";
import { groupMessages } from "@/features/messages/messageGrouping";
import { Message } from "@/models/message";
import { spacing } from "@/theme/tokens";

interface MessageListProps {
  messages: Message[];
  cachedMessages?: Message[];
  hasLoaded: boolean;
  errorMessage: string | null;
  initialAnchorMessageId?: string;
  onVisibleMessageChange?: (messageId?: string) => void;
  composerIsFocused?: boolean;
  currentUserId?: string;
  getAuthorAvatarUrl?: (message: Message) => string | undefined;
  onDeleteMessage?: (messageId: string) => Promise<Message>;
  olderPreloadBoundaryMessageId?: string | null;
  onReachOlderPreloadBoundary?: () => void;
  newerPreloadBoundaryMessageId?: string | null;
  onReachNewerPreloadBoundary?: () => void;
  onViewableReplySourceIds?: (messageIds: string[]) => void;
  onRequestMessageFocus?: (messageId: string) => void;
  onRequestConversationBottom?: () => Promise<void>;
  messageToFocus?: { id: string; requestId: number } | null;
  onPinMessage?: (message: Message) => void;
  onRequestEdit?: (message: Message) => void;
  onRequestReply?: (message: Message) => void;
  onPressAuthor?: (message: Message) => void;
}

interface MessageRow {
  id: string;
  type: "date-divider" | "message" | "unread-marker";
  label?: string;
  messages?: Message[];
}

export function MessageList({
  messages,
  cachedMessages = messages,
  hasLoaded,
  errorMessage,
  initialAnchorMessageId,
  onVisibleMessageChange,
  composerIsFocused = false,
  currentUserId,
  getAuthorAvatarUrl,
  onDeleteMessage,
  olderPreloadBoundaryMessageId,
  onReachOlderPreloadBoundary,
  newerPreloadBoundaryMessageId,
  onReachNewerPreloadBoundary,
  onViewableReplySourceIds,
  onRequestMessageFocus,
  onRequestConversationBottom,
  messageToFocus,
  onPinMessage,
  onRequestEdit,
  onRequestReply,
  onPressAuthor
}: MessageListProps) {
  const theme = useTheme();
  const listRef = useRef<FlashListRef<MessageRow>>(null);
  const focusMessageRef = useRef<(messageId: string) => void>(() => undefined);
  const positionedInitialAnchorMessageIdRef = useRef<string | undefined>(undefined);
  const positionedUnreadMarkerIdRef = useRef<string | null>(null);
  const isAtConversationBottomRef = useRef(true);
  const isNearConversationBottomRef = useRef(true);
  const shouldStickToConversationBottomRef = useRef(false);
  const previousScrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const olderPreloadBoundaryMessageIdRef = useRef(olderPreloadBoundaryMessageId);
  const onReachOlderPreloadBoundaryRef = useRef(onReachOlderPreloadBoundary);
  const newerPreloadBoundaryMessageIdRef = useRef(newerPreloadBoundaryMessageId);
  const onReachNewerPreloadBoundaryRef = useRef(onReachNewerPreloadBoundary);
  const onViewableReplySourceIdsRef = useRef(onViewableReplySourceIds);
  const onRequestMessageFocusRef = useRef(onRequestMessageFocus);
  const onVisibleMessageChangeRef = useRef(onVisibleMessageChange);
  const loadedMessageIdsRef = useRef(new Set<string>());
  const newestMessageRef = useRef<Message | undefined>(undefined);
  const visibleRowIdsRef = useRef(new Set<string>());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewableItemsChanged = useRef(({
    viewableItems
  }: {
    viewableItems: ViewToken<MessageRow>[];
  }) => {
    const rows = viewableItems.map((viewableItem) => viewableItem.item);
    visibleRowIdsRef.current = new Set(rows.map((row) => row.id));
    const firstVisibleMessage = rows.find((row) => row.type === "message")?.messages?.[0];

    if (!isAtConversationBottomRef.current && firstVisibleMessage) {
      onVisibleMessageChangeRef.current?.(firstVisibleMessage.id);
    }

    const boundaryMessageId = olderPreloadBoundaryMessageIdRef.current;

    if (boundaryMessageId && rows.some((row) => (
      row.messages?.some((message) => message.id === boundaryMessageId)
    ))) {
      onReachOlderPreloadBoundaryRef.current?.();
    }

    const newerBoundaryMessageId = newerPreloadBoundaryMessageIdRef.current;

    if (newerBoundaryMessageId && rows.some((row) => (
      row.messages?.some((message) => message.id === newerBoundaryMessageId)
    ))) {
      onReachNewerPreloadBoundaryRef.current?.();
    }

    const missingReplySourceIds = new Set<string>();
    rows.forEach((row) => row.messages?.forEach((message) => {
      if (message.replyToMessageId && !loadedMessageIdsRef.current.has(message.replyToMessageId)) {
        missingReplySourceIds.add(message.replyToMessageId);
      }
    }));

    if (missingReplySourceIds.size > 0) {
      onViewableReplySourceIdsRef.current?.(Array.from(missingReplySourceIds));
    }
  }).current;
  const [unreadMarkerIsPositioned, setUnreadMarkerIsPositioned] = useState(false);
  const [isListReady, setIsListReady] = useState(false);
  const [initialAnchorIsPositioned, setInitialAnchorIsPositioned] = useState(!initialAnchorMessageId);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [contextMessage, setContextMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const rows = useMemo(() => getMessageRows(messages), [messages]);
  const cachedMessagesById = useMemo(
    () => new Map(cachedMessages.map((message) => [message.id, message])),
    [cachedMessages]
  );
  loadedMessageIdsRef.current = new Set(cachedMessagesById.keys());
  const unreadMarkerIndex = rows.findIndex((row) => row.type === "unread-marker");
  const unreadMarkerId = unreadMarkerIndex >= 0 ? rows[unreadMarkerIndex].id : null;
  const initialAnchorRowIndex = initialAnchorMessageId
    ? rows.findIndex((row) => row.messages?.some((message) => message.id === initialAnchorMessageId))
    : -1;
  const newestMessage = messages.at(-1);
  olderPreloadBoundaryMessageIdRef.current = olderPreloadBoundaryMessageId;
  onReachOlderPreloadBoundaryRef.current = onReachOlderPreloadBoundary;
  newerPreloadBoundaryMessageIdRef.current = newerPreloadBoundaryMessageId;
  onReachNewerPreloadBoundaryRef.current = onReachNewerPreloadBoundary;
  onViewableReplySourceIdsRef.current = onViewableReplySourceIds;
  onRequestMessageFocusRef.current = onRequestMessageFocus;
  onVisibleMessageChangeRef.current = onVisibleMessageChange;

  useEffect(() => {
    if (
      !hasLoaded ||
      !isListReady ||
      !unreadMarkerId ||
      unreadMarkerIndex < 0 ||
      positionedUnreadMarkerIdRef.current === unreadMarkerId
    ) {
      return;
    }

    positionedUnreadMarkerIdRef.current = unreadMarkerId;
    setUnreadMarkerIsPositioned(false);
    isAtConversationBottomRef.current = false;
    isNearConversationBottomRef.current = false;

    requestAnimationFrame(() => {
      const list = listRef.current;

      if (!list) {
        return;
      }

      void list.scrollToIndex({
        index: unreadMarkerIndex,
        viewPosition: 0.5,
        animated: false
      }).finally(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setUnreadMarkerIsPositioned(true));
        });
      });
    });
  }, [hasLoaded, isListReady, unreadMarkerId, unreadMarkerIndex]);

  useEffect(() => {
    if (
      !isListReady ||
      !initialAnchorMessageId ||
      positionedInitialAnchorMessageIdRef.current === initialAnchorMessageId
    ) {
      return;
    }

    if (initialAnchorRowIndex < 0) {
      setInitialAnchorIsPositioned(true);
      return;
    }

    positionedInitialAnchorMessageIdRef.current = initialAnchorMessageId;
    isAtConversationBottomRef.current = false;
    requestAnimationFrame(() => setInitialAnchorIsPositioned(true));
  }, [initialAnchorMessageId, initialAnchorRowIndex, isListReady]);

  useEffect(() => {
    if (!composerIsFocused) {
      shouldStickToConversationBottomRef.current = false;
      return;
    }

    if (!isListReady || !isNearConversationBottomRef.current) {
      return;
    }

    shouldStickToConversationBottomRef.current = true;

    const animationFrame = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [composerIsFocused, isListReady]);

  useEffect(() => {
    const previousNewestMessage = newestMessageRef.current;
    newestMessageRef.current = newestMessage;
    const activeWindowMovedBackward = Boolean(
      previousNewestMessage &&
      newestMessage &&
      (
        previousNewestMessage.createdAt.localeCompare(newestMessage.createdAt) > 0 ||
        (
          previousNewestMessage.createdAt === newestMessage.createdAt &&
          previousNewestMessage.id.localeCompare(newestMessage.id) > 0
        )
      )
    );

    if (
      !isListReady ||
      !previousNewestMessage ||
      previousNewestMessage.id === newestMessage?.id ||
      newestMessage?.kind !== "user" ||
      !isAtConversationBottomRef.current ||
      activeWindowMovedBackward
    ) {
      if (activeWindowMovedBackward) {
        isAtConversationBottomRef.current = false;
      }
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [isListReady, newestMessage]);

  function handleDelete(message: Message) {
    void onDeleteMessage?.(message.id);
  }

  const highlightMessage = useCallback((messageId: string) => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    setHighlightedMessageId(messageId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
      highlightTimerRef.current = null;
    }, 700);
  }, []);

  const handlePressReply = useCallback((messageId: string) => {
    const rowIndex = rows.findIndex((row) => row.messages?.some((message) => message.id === messageId));

    if (rowIndex < 0) {
      onRequestMessageFocusRef.current?.(messageId);
      return;
    }

    if (visibleRowIdsRef.current.has(rows[rowIndex].id)) {
      highlightMessage(messageId);
      return;
    }

    const list = listRef.current;

    if (!list) {
      return;
    }

    void list.scrollToIndex({
      index: rowIndex,
      viewPosition: 0.5,
      animated: false
    }).then(() => {
      requestAnimationFrame(() => highlightMessage(messageId));
    }).catch(() => undefined);
  }, [highlightMessage, rows]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollOffset = contentOffset.y;
    viewportHeightRef.current = layoutMeasurement.height;
    const isAtBottom = scrollOffset + layoutMeasurement.height >= contentSize.height - spacing.sm;
    const isAtLeastOneViewportAway = contentSize.height - (scrollOffset + layoutMeasurement.height) > layoutMeasurement.height;
    const isNearOlderBoundary = scrollOffset <= layoutMeasurement.height;
    const isNearNewerBoundary = contentSize.height - (scrollOffset + layoutMeasurement.height) <= layoutMeasurement.height;
    const isScrollingAwayFromBottom = scrollOffset < previousScrollOffsetRef.current - 1;
    const isScrollingTowardBottom = scrollOffset > previousScrollOffsetRef.current + 1;

    isNearConversationBottomRef.current = !isAtLeastOneViewportAway;

    if (!isNearConversationBottomRef.current) {
      shouldStickToConversationBottomRef.current = false;
    }

    if (isNearOlderBoundary && olderPreloadBoundaryMessageIdRef.current) {
      onReachOlderPreloadBoundaryRef.current?.();
    }

    if (isNearNewerBoundary && newerPreloadBoundaryMessageIdRef.current) {
      onReachNewerPreloadBoundaryRef.current?.();
    }

    if (isScrollingTowardBottom && isAtLeastOneViewportAway) {
      setShowScrollToBottom(true);
    } else if (isScrollingAwayFromBottom) {
      setShowScrollToBottom(false);
    }

    if (isAtBottom) {
      setShowScrollToBottom(false);
    }

    previousScrollOffsetRef.current = scrollOffset;
    if (isAtConversationBottomRef.current !== isAtBottom) {
      isAtConversationBottomRef.current = isAtBottom;

      if (isAtBottom) {
        onVisibleMessageChangeRef.current?.();
      }

    }
  }

  function handleListLayout() {
    if (composerIsFocused && shouldStickToConversationBottomRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
    }
  }

  async function scrollToConversationBottom() {
    setShowScrollToBottom(false);
    await onRequestConversationBottom?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
    });
  }

  focusMessageRef.current = handlePressReply;

  useEffect(() => {
    if (messageToFocus) {
      focusMessageRef.current(messageToFocus.id);
    }
  }, [messageToFocus]);

  useEffect(() => () => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

  }, []);

  const handleDismissActionSheet = useCallback(() => {
    setContextMessage(null);
  }, []);

  const renderMessageRow = useCallback(({ item }: ListRenderItemInfo<MessageRow>) => (
    item.type === "date-divider" ? (
      <View accessibilityRole="header" style={styles.dateDivider}>
        <Divider style={styles.dateDividerLine} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {item.label}
        </Text>
        <Divider style={styles.dateDividerLine} />
      </View>
    ) : item.type === "unread-marker" ? (
      <View accessibilityLabel="Unread messages begin here" style={styles.unreadMarker}>
        <Divider style={styles.unreadDivider} />
        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
          Unread
        </Text>
        <Divider style={styles.unreadDivider} />
      </View>
    ) : (
      <MessageBubble
        messages={item.messages ?? []}
        avatarUrl={item.messages?.[0] ? getAuthorAvatarUrl?.(item.messages[0]) : undefined}
        getAuthorAvatarUrl={getAuthorAvatarUrl}
        getReplyToMessage={(message) => (
          message.replyToMessageId ? cachedMessagesById.get(message.replyToMessageId) : undefined
        )}
        highlightedMessageId={highlightedMessageId}
        onLongPress={setContextMessage}
        onPressAuthor={onPressAuthor}
        onPressReply={handlePressReply}
      />
    )
  ), [cachedMessagesById, getAuthorAvatarUrl, handlePressReply, highlightedMessageId, onPressAuthor, theme.colors]);

  if (errorMessage) {
    return (
      <View style={styles.centerContent}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          {errorMessage}
        </Text>
      </View>
    );
  }

  if (!hasLoaded) {
    return null;
  }

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContent}>
        <EmptyMessageState />
      </View>
    );
  }

  return (
    <>
      <FlashList
      ref={listRef}
      data={rows}
      initialScrollIndex={initialAnchorRowIndex >= 0 ? initialAnchorRowIndex : undefined}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.type}
      renderItem={renderMessageRow}
      maintainVisibleContentPosition={{
        startRenderingFromBottom: initialAnchorRowIndex < 0
      }}
      ItemSeparatorComponent={MessageRowSeparator}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      onLoad={() => setIsListReady(true)}
      onLayout={handleListLayout}
      style={StyleSheet.flatten([
        styles.list,
        unreadMarkerId && !unreadMarkerIsPositioned ? styles.hiddenList : undefined,
        initialAnchorMessageId && !initialAnchorIsPositioned ? styles.hiddenList : undefined
      ])}
        contentContainerStyle={styles.listContent}
      />
      {showScrollToBottom ? (
        <View style={[styles.scrollToBottomLayer, { pointerEvents: "box-none" }]}>
          <FAB
            icon="chevron-down"
            size="small"
            variant="primary"
            mode="elevated"
            onPress={scrollToConversationBottom}
            accessibilityLabel="Scroll to newest messages"
          />
        </View>
      ) : null}
      <MessageActionSheet
        currentUserId={currentUserId}
        message={contextMessage}
        onDelete={handleDelete}
        onDismiss={handleDismissActionSheet}
        onEdit={(message) => onRequestEdit?.(message)}
        onPin={onPinMessage}
        onReply={(message) => onRequestReply?.(message)}
      />
    </>
  );
}

function getMessageRows(messages: Message[]) {
  const messageGroups = groupMessages(messages);
  const rows: MessageRow[] = [];
  let previousDayKey: string | null = null;

  messageGroups.forEach((messageGroup, index) => {
    const firstMessage = messageGroup.messages[0];
    const previousGroup = messageGroups[index - 1];
    const dayKey = getMessageDayKey(firstMessage.createdAt);
    const isFirstUnread = firstMessage.isUnread && !previousGroup?.messages[0].isUnread;

    if (dayKey !== previousDayKey) {
      rows.push({
        id: `date-${dayKey}`,
        type: "date-divider",
        label: formatMessageDay(firstMessage.createdAt)
      });
      previousDayKey = dayKey;
    }

    if (isFirstUnread) {
      rows.push({ id: `unread-${firstMessage.id}`, type: "unread-marker" });
    }

    rows.push({ id: firstMessage.id, type: "message", messages: messageGroup.messages });
  });

  return rows;
}

function MessageRowSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl
  },
  emptyContent: {
    flex: 1,
    justifyContent: "flex-end"
  },
  list: {
    flex: 1,
    marginHorizontal: -spacing.lg
  },
  hiddenList: {
    opacity: 0
  },
  listContent: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.lg
  },
  separator: {
    height: spacing.md
  },
  scrollToBottomLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.md,
    alignItems: "center"
  },
  unreadMarker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  unreadDivider: {
    flex: 1
  },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  dateDividerLine: {
    flex: 1
  }
});
