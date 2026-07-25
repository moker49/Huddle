import { Pressable, StyleSheet, View } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

import { MemberAvatar } from "@/components/MemberAvatar";
import { formatMessageTimestamp } from "@/features/messages/messageDates";
import { Message } from "@/models/message";
import { layout, spacing } from "@/theme/tokens";

const messageAvatarSize = layout.appBarActionSize;

interface MessageBubbleProps {
  messages: Message[];
  avatarUrl?: string;
  onLongPress?: (message: Message) => void;
  onPressAuthor?: (message: Message) => void;
}

export function MessageBubble({ messages, avatarUrl, onLongPress, onPressAuthor }: MessageBubbleProps) {
  const theme = useTheme();
  const message = messages[0];
  const isEdited = Boolean(message.editedAt);

  if (message.kind === "system") {
    return (
      <View style={styles.systemRow}>
        <Text
          variant="labelSmall"
          numberOfLines={2}
          style={[styles.systemText, { color: theme.colors.outline }]}
        >
          {message.body}
        </Text>
        <Text
          variant="labelSmall"
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
          size={messageAvatarSize}
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
        {messages.map((currentMessage, index) => (
          <TouchableRipple
            key={currentMessage.id}
            disabled={currentMessage.isDeleted || !onLongPress}
            onLongPress={() => onLongPress?.(currentMessage)}
            delayLongPress={180}
            accessibilityHint="Hold for message options"
            style={styles.messageBody}
          >
            <View style={styles.messageBodyContent}>
              {index === 0 ? (
                <View style={styles.metaRow}>
                  <Pressable
                    onPress={() => onPressAuthor?.(message)}
                    disabled={!onPressAuthor}
                    accessibilityLabel={`Open ${message.authorName}'s profile`}
                    accessibilityRole="button"
                  >
                    <Text variant="labelLarge">{message.authorName}</Text>
                  </Pressable>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatMessageTimestamp(message.createdAt)}
                  </Text>
                  {isEdited ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Edited
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Text
                variant="bodyMedium"
                style={
                  currentMessage.isDeleted
                    ? { color: theme.colors.outline }
                    : { color: theme.colors.onSurfaceVariant }
                }
              >
                {currentMessage.body}
              </Text>
            </View>
          </TouchableRipple>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  avatar: {
    width: messageAvatarSize,
    height: messageAvatarSize,
    borderRadius: messageAvatarSize / 2,
    zIndex: 1
  },
  presenceDot: {
    position: "absolute",
    right: spacing.none,
    bottom: spacing.none,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: spacing.sm / 2,
    borderWidth: 2
  },
  message: {
    flex: 1,
    gap: spacing.xxs,
  },
  messageBody: {
    marginLeft: -(messageAvatarSize + spacing.sm + spacing.xs),
    marginRight: -spacing.xs,
    paddingLeft: messageAvatarSize + spacing.sm + spacing.xs,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xxs
  },
  messageBodyContent: {
    gap: spacing.xxs
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
