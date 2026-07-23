import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { MemberAvatar } from "@/components/MemberAvatar";
import { Message } from "@/models/message";
import { layout, spacing } from "@/theme/tokens";

interface MessageBubbleProps {
  messages: Message[];
}

export function MessageBubble({ messages }: MessageBubbleProps) {
  const theme = useTheme();
  const message = messages[0];

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
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <MemberAvatar avatarUrl={message.authorAvatarUrl} label={message.authorName} size={layout.minTouchTarget} />
        <View
          style={[
            styles.presenceDot,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.background
            }
          ]}
        />
      </View>
      <View style={styles.message}>
        <View style={styles.metaRow}>
          <Text variant="titleSmall">{message.authorName}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatMessageTime(message.createdAt)}
          </Text>
        </View>
        <Text variant="bodyLarge">{messages.map((currentMessage) => currentMessage.body).join("\n")}</Text>
      </View>
    </View>
  );
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${period}`;
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
