import { Pressable, StyleSheet, View } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

import { MemberAvatar } from "@/components/MemberAvatar";
import { formatMessageTimestamp } from "@/features/messages/messageDates";
import { Message } from "@/models/message";
import { layout, shape, spacing } from "@/theme/tokens";

interface MessageBubbleProps {
  messages: Message[];
  avatarUrl?: string;
  onLongPress?: (message: Message) => void;
  onPressAuthor?: (message: Message) => void;
}

export function MessageBubble({ messages, avatarUrl, onLongPress, onPressAuthor }: MessageBubbleProps) {
  const theme = useTheme();
  const message = messages[0];
  const isDeleted = Boolean(message.isDeleted);
  const isEdited = Boolean(message.editedAt);

  if (message.kind === "system") {
    return (
      <View style={styles.systemRow}>
        <Text
          variant="bodySmall"
          numberOfLines={2}
          style={[styles.systemText, { color: theme.colors.outline }]}
        >
          {message.body}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[styles.systemTime, { color: theme.colors.outline }]}
        >
          {formatMessageTimestamp(message.createdAt)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPressAuthor?.(message)}
        disabled={!onPressAuthor}
        accessibilityLabel={`Open ${message.authorName}'s profile`}
        accessibilityRole="button"
        style={styles.avatar}
      >
        <MemberAvatar
          avatarUrl={avatarUrl ?? message.authorAvatarUrl}
          label={message.authorName}
          size={layout.minTouchTarget}
        />
        <View
          style={[
            styles.presenceDot,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.background
            }
          ]}
        />
      </Pressable>
      <View style={styles.message}>
        <View style={styles.metaRow}>
          <Pressable
            onPress={() => onPressAuthor?.(message)}
            disabled={!onPressAuthor}
            accessibilityLabel={`Open ${message.authorName}'s profile`}
            accessibilityRole="button"
          >
            <Text variant="titleSmall">{message.authorName}</Text>
          </Pressable>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatMessageTimestamp(message.createdAt)}
          </Text>
          {isEdited ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Edited
            </Text>
          ) : null}
        </View>
        <TouchableRipple
          disabled={isDeleted || !onLongPress}
          onLongPress={() => onLongPress?.(message)}
          delayLongPress={180}
          accessibilityHint="Hold for message options"
          style={styles.messageBody}
        >
          <Text
            variant="bodyLarge"
            style={isDeleted ? { color: theme.colors.onSurfaceVariant, fontStyle: "italic" } : undefined}
          >
            {messages.map((currentMessage) => currentMessage.body).join("\n")}
          </Text>
        </TouchableRipple>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  avatar: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2
  },
  presenceDot: {
    position: "absolute",
    right: spacing.none,
    bottom: spacing.none,
    width: spacing.md,
    height: spacing.md,
    borderRadius: spacing.xs,
    borderWidth: 2
  },
  message: {
    flex: 1,
    gap: spacing.xxs,
  },
  messageBody: {
    borderRadius: shape.compact,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    flexWrap: "wrap"
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.xxs
  },
  systemText: {
    flex: 1,
    textAlign: "left"
  },
  systemTime: {
    flexShrink: 0,
    textAlign: "right"
  }
});
