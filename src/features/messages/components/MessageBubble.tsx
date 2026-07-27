import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text, TouchableRipple, useTheme } from "react-native-paper";

import { MemberAvatar } from "@/components/MemberAvatar";
import { formatMessageTimestamp } from "@/features/messages/messageDates";
import { Message } from "@/models/message";
import { layout, spacing } from "@/theme/tokens";

const messageAvatarSize = layout.appBarActionSize;
const useNativeAnimationDriver = Platform.OS !== "web";

interface MessageBubbleProps {
  messages: Message[];
  avatarUrl?: string;
  getAuthorAvatarUrl?: (message: Message) => string | undefined;
  getReplyToMessage?: (message: Message) => Message | undefined;
  highlightedMessageId?: string | null;
  onLongPress?: (message: Message) => void;
  onPressAuthor?: (message: Message) => void;
  onPressReply?: (messageId: string) => void;
}

export function MessageBubble({
  messages,
  avatarUrl,
  getAuthorAvatarUrl,
  getReplyToMessage,
  highlightedMessageId,
  onLongPress,
  onPressAuthor,
  onPressReply
}: MessageBubbleProps) {
  const theme = useTheme();
  const message = messages[0];
  const isEdited = Boolean(message.editedAt);
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const highlightedMessageIsInGroup = messages.some((currentMessage) => (
    currentMessage.id === highlightedMessageId
  ));

  useEffect(() => {
    if (!highlightedMessageIsInGroup) {
      return;
    }

    highlightOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(highlightOpacity, {
        toValue: 0.2,
        duration: 120,
        useNativeDriver: useNativeAnimationDriver
      }),
      Animated.timing(highlightOpacity, {
        toValue: 0,
        duration: 520,
        useNativeDriver: useNativeAnimationDriver
      })
    ]).start();
  }, [highlightOpacity, highlightedMessageId, highlightedMessageIsInGroup]);

  if (message.kind === "system") {
    return (
      <TouchableRipple
        disabled={!onLongPress}
        onLongPress={() => onLongPress?.(message)}
        delayLongPress={180}
        accessibilityHint="Hold for message options"
        style={styles.systemRow}
      >
        <View style={styles.systemRowContent}>
          {message.id === highlightedMessageId ? (
            <Animated.View
              style={[
                styles.systemHighlight,
                { pointerEvents: "none" },
                {
                  backgroundColor: theme.colors.primary,
                  opacity: highlightOpacity
                }
              ]}
            />
          ) : null}
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
      </TouchableRipple>
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
        {messages.map((currentMessage, index) => {
          const replyTarget = getReplyToMessage?.(currentMessage);
          const replyIsActivity = replyTarget?.kind === "system";

          return (
            <TouchableRipple
            key={currentMessage.id}
            disabled={currentMessage.isDeleted || !onLongPress}
            onLongPress={() => onLongPress?.(currentMessage)}
            delayLongPress={180}
            accessibilityHint="Hold for message options"
            style={styles.messageBody}
          >
            <View style={styles.messageBodyContent}>
              {currentMessage.id === highlightedMessageId ? (
                <Animated.View
                  style={[
                    styles.messageHighlight,
                    { pointerEvents: "none" },
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: highlightOpacity
                    }
                  ]}
                />
              ) : null}
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
                  <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                    {formatMessageTimestamp(message.createdAt)}
                  </Text>
                  {isEdited ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                      Edited
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {currentMessage.replyToMessageId ? (
                <Pressable
                  onPress={() => onPressReply?.(currentMessage.replyToMessageId ?? "")}
                  disabled={!onPressReply}
                  accessibilityLabel="Open replied message"
                  accessibilityRole="button"
                  style={styles.replyPreview}
                >
                  <View style={[styles.replyIndicator, { backgroundColor: theme.colors.outline }]} />
                  {replyTarget && !replyIsActivity ? (
                    <MemberAvatar
                      avatarUrl={getAuthorAvatarUrl?.(replyTarget)}
                      label={replyTarget.authorName}
                      size={20}
                    />
                  ) : null}
                  <View style={styles.replyCopy}>
                    {!replyIsActivity ? (
                      <Text variant="labelSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                        {replyTarget?.authorName ?? "Original message"}
                      </Text>
                    ) : null}
                    <Text variant="labelSmall" numberOfLines={1} style={{ color: theme.colors.outline }}>
                      {replyTarget?.body ?? "Message unavailable"}
                    </Text>
                  </View>
                </Pressable>
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
          );
        })}
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
    position: "relative",
    gap: spacing.xxs
  },
  messageHighlight: {
    position: "absolute",
    top: -spacing.xxs,
    right: -spacing.xs,
    bottom: -spacing.xxs,
    left: -(messageAvatarSize + spacing.sm + spacing.xs)
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    flexWrap: "wrap"
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 0,
    paddingVertical: spacing.xxs
  },
  replyIndicator: {
    width: spacing.xxs,
    alignSelf: "stretch",
    borderRadius: spacing.xxs
  },
  replyCopy: {
    flex: 1,
    minWidth: 0
  },
  systemRow: {
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs
  },
  systemRowContent: {
    position: "relative",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md
  },
  systemHighlight: {
    position: "absolute",
    top: -spacing.xxs,
    right: -spacing.xs,
    bottom: -spacing.xxs,
    left: -spacing.xs
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
