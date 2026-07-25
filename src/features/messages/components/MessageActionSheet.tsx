import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { List, Surface, useTheme } from "react-native-paper";

import { Message } from "@/models/message";
import { shape, spacing } from "@/theme/tokens";

interface MessageActionSheetProps {
  currentUserId?: string;
  message: Message | null;
  onDelete: (message: Message) => void;
  onDismiss: () => void;
  onEdit: (message: Message) => void;
  onReply: (message: Message) => void;
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
  onEdit,
  onReply
}: MessageActionSheetProps) {
  const theme = useTheme();
  const [isMounted, setIsMounted] = useState(Boolean(message));
  const [presentedMessage, setPresentedMessage] = useState<Message | null>(message);
  const isMountedRef = useRef(Boolean(message));
  const browserHistoryEntryIsActiveRef = useRef(false);
  const browserScrollRestorationRef = useRef<History["scrollRestoration"] | null>(null);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(320)).current;
  const activeMessage = message ?? presentedMessage;
  const isVisible = Boolean(message);

  const dismissSheet = useCallback(() => {
    if (Platform.OS === "web" && browserHistoryEntryIsActiveRef.current) {
      browserHistoryEntryIsActiveRef.current = false;
      window.history.back();
    }

    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (message) {
      isMountedRef.current = true;
      setPresentedMessage(message);
      setIsMounted(true);
      scrimOpacity.setValue(0);
      sheetTranslateY.setValue(320);
      const animationFrame = requestAnimationFrame(() => {
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

      return () => cancelAnimationFrame(animationFrame);
    }

    if (!isMountedRef.current) {
      return;
    }

    isMountedRef.current = false;
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
    ]).start(() => {
      setIsMounted(false);
      setPresentedMessage(null);
    });
  }, [message, scrimOpacity, sheetTranslateY]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (Platform.OS === "web") {
      const handlePopState = () => {
        browserHistoryEntryIsActiveRef.current = false;
        onDismiss();
      };

      browserScrollRestorationRef.current = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      window.history.pushState({ messageActionSheet: true }, "");
      browserHistoryEntryIsActiveRef.current = true;
      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);

        if (browserScrollRestorationRef.current) {
          window.history.scrollRestoration = browserScrollRestorationRef.current;
          browserScrollRestorationRef.current = null;
        }
      };
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      dismissSheet();
      return true;
    });

    return () => subscription.remove();
  }, [dismissSheet, isVisible, onDismiss]);

  if (!isMounted) {
    return null;
  }

  const canManageMessage = Boolean(
    activeMessage && !activeMessage.isDeleted && activeMessage.authorId === currentUserId
  );
  const actions: readonly MessageAction[] = [
    { icon: "reply", title: "Reply", onPress: onReply },
    ...(canManageMessage ? [{ icon: "pencil", title: "Edit", onPress: onEdit }] : []),
    { icon: "pin", title: "Pin" },
    ...(canManageMessage ? [{ icon: "delete", title: "Delete", destructive: true, onPress: onDelete }] : [])
  ];

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={dismissSheet}
      statusBarTranslucent
    >
      <View style={styles.layer}>
        <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
          <Pressable
            onPress={dismissSheet}
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
                    if (activeMessage && action.onPress) {
                      action.onPress(activeMessage);
                    }

                    dismissSheet();
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
