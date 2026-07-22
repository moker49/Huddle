import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";

import { EmptyMessageState } from "@/features/messages/components/EmptyMessageState";
import { MessageBubble } from "@/features/messages/components/MessageBubble";
import { groupMessages } from "@/features/messages/messageGrouping";
import { Message } from "@/models/message";
import { spacing } from "@/theme/tokens";

interface MessageListProps {
  messages: Message[];
  hasLoaded: boolean;
  errorMessage: string | null;
}

interface MessageRow {
  id: string;
  type: "message" | "unread-marker";
  messages?: Message[];
}

export function MessageList({
  messages,
  hasLoaded,
  errorMessage
}: MessageListProps) {
  const theme = useTheme();
  const listRef = useRef<FlatList<MessageRow>>(null);
  const positionedUnreadMarkerIdRef = useRef<string | null>(null);
  const [unreadMarkerIsPositioned, setUnreadMarkerIsPositioned] = useState(false);
  const rows = getMessageRows(messages);
  const unreadMarkerIndex = rows.findIndex((row) => row.type === "unread-marker");
  const unreadMarkerId = unreadMarkerIndex >= 0 ? rows[unreadMarkerIndex].id : null;

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
    <FlatList
      ref={listRef}
      data={rows}
      inverted
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        item.type === "unread-marker" ? (
          <View accessibilityLabel="Unread messages begin here" style={styles.unreadMarker}>
            <Divider style={styles.unreadDivider} />
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              Unread
            </Text>
            <Divider style={styles.unreadDivider} />
          </View>
        ) : (
          <MessageBubble messages={item.messages ?? []} />
        )
      )}
      ItemSeparatorComponent={MessageRowSeparator}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
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
  );
}

function getMessageRows(messages: Message[]) {
  const messageGroups = groupMessages(messages);
  const rows: MessageRow[] = [];

  messageGroups.forEach((messageGroup, index) => {
    const firstMessage = messageGroup.messages[0];
    const previousGroup = messageGroups[index - 1];
    const isFirstUnread = firstMessage.isUnread && !previousGroup?.messages[0].isUnread;

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
    flex: 1
  },
  hiddenList: {
    opacity: 0
  },
  listContent: {
    paddingVertical: spacing.lg
  },
  separator: {
    height: spacing.md
  },
  unreadMarker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  unreadDivider: {
    flex: 1
  }
});
