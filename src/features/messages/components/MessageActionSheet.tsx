import { Modal, Pressable, StyleSheet, View } from "react-native";
import { List, Surface, useTheme } from "react-native-paper";

import { Message } from "@/models/message";
import { spacing } from "@/theme/tokens";

interface MessageActionSheetProps {
  message: Message | null;
  onDismiss: () => void;
}

const actions: readonly { icon: string; title: string; destructive?: boolean }[] = [
  { icon: "reply-outline", title: "Reply" },
  { icon: "pencil-outline", title: "Edit" },
  { icon: "delete-outline", title: "Delete", destructive: true }
] as const;

export function MessageActionSheet({ message, onDismiss }: MessageActionSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      transparent
      visible={Boolean(message)}
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.layer}>
        <Pressable
          onPress={onDismiss}
          accessibilityLabel="Close message options"
          accessibilityRole="button"
          style={styles.scrim}
        />
        <Surface
          elevation={3}
          style={[styles.sheet, { backgroundColor: theme.colors.elevation.level3 }]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
          {actions.map((action) => (
            <List.Item
              key={action.title}
              title={action.title}
              left={(props) => <List.Icon {...props} icon={action.icon} />}
              titleStyle={action.destructive ? { color: theme.colors.error } : undefined}
              onPress={onDismiss}
            />
          ))}
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    justifyContent: "flex-end"
  },
  scrim: {
  ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.32)"
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    overflow: "hidden"
  },
  handle: {
    alignSelf: "center",
    width: 32,
    height: 4,
    borderRadius: spacing.xxs,
    marginBottom: spacing.xs,
    opacity: 0.45
  }
});
