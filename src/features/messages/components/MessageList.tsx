import { Fragment } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Divider, Text, useTheme } from "react-native-paper";

import { EmptyMessageState } from "@/features/messages/components/EmptyMessageState";
import { MessageBubble } from "@/features/messages/components/MessageBubble";
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

  return (
    <View style={styles.list}>
      {messages.map((message, index) => {
        const isFirstUnread = message.isUnread && !messages[index - 1]?.isUnread;

        return (
          <Fragment key={message.id}>
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
            <MessageBubble message={message} />
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
