import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { EmptyMessageState } from "@/features/messages/components/EmptyMessageState";
import { MessageBubble } from "@/features/messages/components/MessageBubble";
import { Message } from "@/models/message";
import { spacing } from "@/theme/tokens";

interface MessageListProps {
  messages: Message[];
  errorMessage: string | null;
}

export function MessageList({ messages, errorMessage }: MessageListProps) {
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

  if (messages.length === 0) {
    return <EmptyMessageState />;
  }

  return (
    <View style={styles.list}>
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
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
  }
});
