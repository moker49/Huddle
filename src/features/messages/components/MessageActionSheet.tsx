import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { List, Surface, useTheme } from "react-native-paper";

import { Message } from "@/models/message";
import { shape, spacing } from "@/theme/tokens";

interface MessageActionSheetProps {
  currentUserId?: string;
  message: Message | null;
  onDelete: (message: Message) => void;
  onDismiss: () => void;
  onEdit: (message: Message) => void;
}

interface MessageAction {
  icon: string;
  title: string;
  destructive?: boolean;
  onPress?: (message: Message) => void;
}

export function MessageActionSheet({
  currentUserId,
  message,
  onDelete,
  onDismiss,
  onEdit
}: MessageActionSheetProps) {
  const theme = useTheme();
  const [isMounted, setIsMounted] = useState(Boolean(message));
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    if (message) {
      setIsMounted(true);
      scrimOpacity.setValue(0);
      sheetTranslateY.setValue(320);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(scrimOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true
          }),
          Animated.timing(sheetTranslateY, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ]).start();
      });
      return;
    }

    if (!isMounted) {
      return;
    }

    Animated.parallel([
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 320,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => setIsMounted(false));
  }, [isMounted, message, scrimOpacity, sheetTranslateY]);

  if (!isMounted) {
    return null;
  }

  const canManageMessage = Boolean(
    message && !message.isDeleted && message.authorId === currentUserId
  );
  const actions: readonly MessageAction[] = [
    { icon: "reply", title: "Reply" },
    ...(canManageMessage ? [{ icon: "pencil", title: "Edit", onPress: onEdit }] : []),
    { icon: "pin", title: "Pin" },
    ...(canManageMessage ? [{ icon: "delete", title: "Delete", destructive: true, onPress: onDelete }] : [])
  ];

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.layer}>
        <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
          <Pressable
            onPress={onDismiss}
            accessibilityLabel="Close message options"
            accessibilityRole="button"
            style={styles.scrimPressable}
          />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <Surface
            elevation={3}
            style={[styles.sheet, { backgroundColor: theme.colors.elevation.level3 }]}
          >
            <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
            <View style={styles.actionGroup}>
              {actions.map((action, index) => (
                <List.Item
                  key={action.title}
                  title={action.title}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={action.icon}
                      color={action.destructive ? theme.colors.error : props.color}
                    />
                  )}
                  titleStyle={action.destructive ? { color: theme.colors.error } : undefined}
                  onPress={() => {
                    if (message && action.onPress) {
                      action.onPress(message);
                    }

                    onDismiss();
                  }}
                  style={[
                    styles.actionItem,
                    getActionItemCornerStyle(index, actions.length),
                    { backgroundColor: theme.colors.elevation.level2 }
                  ]}
                />
              ))}
            </View>
          </Surface>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getActionItemCornerStyle(index: number, itemCount: number) {
  if (itemCount === 1) {
    return styles.singleAction;
  }

  if (index === 0) {
    return styles.firstAction;
  }

  if (index === itemCount - 1) {
    return styles.lastAction;
  }

  return styles.middleAction;
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
  scrimPressable: {
    flex: 1
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
  },
  actionGroup: {
    gap: spacing.xxs,
    paddingHorizontal: spacing.md
  },
  actionItem: {
    minHeight: 56
  },
  singleAction: {
    borderRadius: shape.large
  },
  firstAction: {
    borderTopLeftRadius: shape.large,
    borderTopRightRadius: shape.large,
    borderBottomLeftRadius: spacing.xxs,
    borderBottomRightRadius: spacing.xxs
  },
  middleAction: {
    borderRadius: spacing.xxs
  },
  lastAction: {
    borderTopLeftRadius: spacing.xxs,
    borderTopRightRadius: spacing.xxs,
    borderBottomLeftRadius: shape.large,
    borderBottomRightRadius: shape.large
  }
});
