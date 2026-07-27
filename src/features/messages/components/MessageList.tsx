import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from "react-native";
import { Divider, FAB, Text, useTheme } from "react-native-paper";

import { EmptyMessageState } from "@/features/messages/components/EmptyMessageState";
import { MessageActionSheet } from "@/features/messages/components/MessageActionSheet";
import { MessageBubble } from "@/features/messages/components/MessageBubble";
import { formatMessageDay, getMessageDayKey } from "@/features/messages/messageDates";
import { groupMessages } from "@/features/messages/messageGrouping";
import { Message } from "@/models/message";
import { spacing } from "@/theme/tokens";

interface MessageListProps {
  messages: Message[];
  hasLoaded: boolean;
  errorMessage: string | null;
  currentUserId?: string;
  getAuthorAvatarUrl?: (message: Message) => string | undefined;
  onDeleteMessage?: (messageId: string) => Promise<Message>;
  olderPreloadBoundaryMessageId?: string | null;
  onReachOlderPreloadBoundary?: () => void;
  onReachConversationBottom?: () => void;
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
  hasLoaded,
  errorMessage,
  currentUserId,
  getAuthorAvatarUrl,
  onDeleteMessage,
  olderPreloadBoundaryMessageId,
  onReachOlderPreloadBoundary,
  onReachConversationBottom,
  messageToFocus,
  onPinMessage,
  onRequestEdit,
  onRequestReply,
  onPressAuthor
}: MessageListProps) {
  const theme = useTheme();
  const listRef = useRef<FlatList<MessageRow>>(null);
  const focusMessageRef = useRef<(messageId: string) => void>(() => undefined);
  const positionedUnreadMarkerIdRef = useRef<string | null>(null);
  const isAtConversationBottomRef = useRef(true);
  const previousScrollOffsetRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const onReachConversationBottomRef = useRef(onReachConversationBottom);
  const olderPreloadBoundaryMessageIdRef = useRef(olderPreloadBoundaryMessageId);
  const onReachOlderPreloadBoundaryRef = useRef(onReachOlderPreloadBoundary);
  const visibleRowIdsRef = useRef(new Set<string>());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewableItemsChanged = useRef(({
    viewableItems
  }: {
    viewableItems: { item: unknown }[];
  }) => {
    const rows = viewableItems.map((viewableItem) => viewableItem.item as MessageRow);
    visibleRowIdsRef.current = new Set(rows.map((row) => row.id));
    const boundaryMessageId = olderPreloadBoundaryMessageIdRef.current;

    if (boundaryMessageId && rows.some((row) => (
      row.messages?.some((message) => message.id === boundaryMessageId)
    ))) {
      onReachOlderPreloadBoundaryRef.current?.();
    }
  }).current;
  const [unreadMarkerIsPositioned, setUnreadMarkerIsPositioned] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [contextMessage, setContextMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const rows = getMessageRows(messages);
  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const unreadMarkerIndex = rows.findIndex((row) => row.type === "unread-marker");
  const unreadMarkerId = unreadMarkerIndex >= 0 ? rows[unreadMarkerIndex].id : null;
  const canAcknowledgeReadState = hasLoaded && (!unreadMarkerId || unreadMarkerIsPositioned);

  onReachConversationBottomRef.current = onReachConversationBottom;
  olderPreloadBoundaryMessageIdRef.current = olderPreloadBoundaryMessageId;
  onReachOlderPreloadBoundaryRef.current = onReachOlderPreloadBoundary;

  useEffect(() => {
    if (
      !hasLoaded ||
      !unreadMarkerId ||
      unreadMarkerIndex < 0 ||
      positionedUnreadMarkerIdRef.current === unreadMarkerId
    ) {
      return;
    }

    positionedUnreadMarkerIdRef.current = unreadMarkerId;
    setUnreadMarkerIsPositioned(false);
    isAtConversationBottomRef.current = false;

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: unreadMarkerIndex,
        viewPosition: 0.5,
        animated: false
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setUnreadMarkerIsPositioned(true));
      });
    });
  }, [hasLoaded, unreadMarkerId, unreadMarkerIndex]);

  useEffect(() => {
    if (canAcknowledgeReadState && isAtConversationBottomRef.current) {
      onReachConversationBottomRef.current?.();
    }
  }, [canAcknowledgeReadState, messages.length]);

  function handleDelete(message: Message) {
    void onDeleteMessage?.(message.id);
  }

  function highlightMessage(messageId: string) {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    setHighlightedMessageId(messageId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
      highlightTimerRef.current = null;
    }, 700);
  }

  function handlePressReply(messageId: string) {
    const rowIndex = rows.findIndex((row) => row.messages?.some((message) => message.id === messageId));

    if (rowIndex < 0) {
      return;
    }

    if (visibleRowIdsRef.current.has(rows[rowIndex].id)) {
      highlightMessage(messageId);
      return;
    }

    listRef.current?.scrollToIndex({ index: rowIndex, viewPosition: 0.5, animated: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => highlightMessage(messageId));
    });
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    // In an inverted FlatList, offset zero is the visual bottom of the conversation.
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const scrollOffset = contentOffset.y;
    viewportHeightRef.current = layoutMeasurement.height;
    const isAtBottom = scrollOffset <= spacing.sm;
    const isAtLeastOneViewportAway = scrollOffset > layoutMeasurement.height;
    const isScrollingAwayFromBottom = scrollOffset > previousScrollOffsetRef.current + 1;
    const isScrollingTowardBottom = scrollOffset < previousScrollOffsetRef.current - 1;

    if (isScrollingTowardBottom && isAtLeastOneViewportAway) {
      setShowScrollToBottom(true);
    } else if (isScrollingAwayFromBottom) {
      setShowScrollToBottom(false);
    }

    previousScrollOffsetRef.current = scrollOffset;
    if (isAtConversationBottomRef.current !== isAtBottom) {
      isAtConversationBottomRef.current = isAtBottom;

      if (isAtBottom && canAcknowledgeReadState) {
        onReachConversationBottomRef.current?.();
      }
    }
  }

  function scrollToConversationBottom() {
    setShowScrollToBottom(false);
    listRef.current?.scrollToOffset({
      offset: 0,
      animated: previousScrollOffsetRef.current <= viewportHeightRef.current * 3
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
      <FlatList
      ref={listRef}
      data={rows}
      inverted
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
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
              message.replyToMessageId ? messagesById.get(message.replyToMessageId) : undefined
            )}
            highlightedMessageId={highlightedMessageId}
            onLongPress={setContextMessage}
            onPressAuthor={onPressAuthor}
            onPressReply={handlePressReply}
          />
        )
      )}
      ItemSeparatorComponent={MessageRowSeparator}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      onScrollToIndexFailed={(info) => {
        listRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: false
        });
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({
            index: info.index,
            viewPosition: 0.5,
            animated: false
          });
        });
      }}
      style={[
        styles.list,
        unreadMarkerId && !unreadMarkerIsPositioned ? styles.hiddenList : undefined
      ]}
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

  return rows.reverse();
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
    paddingVertical: spacing.lg
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
