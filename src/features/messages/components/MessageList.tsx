import { Fragment } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
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
  onUnreadMarkerLayout?: (event: LayoutChangeEvent) => void;
}

export function MessageList({
  messages,
  hasLoaded,
  errorMessage,
  onUnreadMarkerLayout
}: MessageListProps) {
  const theme = useTheme();

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
    return <EmptyMessageState />;
  }

  const messageGroups = groupMessages(messages);

  return (
    <View style={styles.list}>
      {messageGroups.map((messageGroup, index) => {
        const firstMessage = messageGroup.messages[0];
        const previousGroup = messageGroups[index - 1];
        const isFirstUnread = firstMessage.isUnread && !previousGroup?.messages[0].isUnread;

        return (
          <Fragment key={firstMessage.id}>
            {isFirstUnread ? (
              <View
                onLayout={onUnreadMarkerLayout}
                accessibilityLabel="Unread messages begin here"
                style={styles.unreadMarker}
              >
                <Divider style={styles.unreadDivider} />
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  Unread
                </Text>
                <Divider style={styles.unreadDivider} />
              </View>
            ) : null}
            <MessageBubble messages={messageGroup.messages} />
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl
  },
  list: {
    gap: spacing.md,
    paddingVertical: spacing.lg
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
