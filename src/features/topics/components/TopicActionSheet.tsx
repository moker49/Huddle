import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { List, Surface, useTheme } from "react-native-paper";

import { Topic } from "@/models/topic";
import { shape, spacing } from "@/theme/tokens";

interface TopicActionSheetProps {
  topic: Topic | null;
  onDismiss(): void;
  onLeave(topic: Topic): void;
}

interface TopicAction {
  icon: string;
  title: string;
  destructive?: boolean;
  onPress?: (topic: Topic) => void;
}

const useNativeAnimationDriver = Platform.OS !== "web";

export function TopicActionSheet({ topic, onDismiss, onLeave }: TopicActionSheetProps) {
  const theme = useTheme();
  const [isMounted, setIsMounted] = useState(Boolean(topic));
  const [presentedTopic, setPresentedTopic] = useState<Topic | null>(topic);
  const isMountedRef = useRef(Boolean(topic));
  const pendingActionRef = useRef<(() => void) | null>(null);
  const browserHistoryEntryIsActiveRef = useRef(false);
  const browserScrollRestorationRef = useRef<History["scrollRestoration"] | null>(null);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(320)).current;
  const activeTopic = topic ?? presentedTopic;
  const isVisible = Boolean(topic);

  const dismissSheet = useCallback(() => {
    if (Platform.OS === "web" && browserHistoryEntryIsActiveRef.current) {
      browserHistoryEntryIsActiveRef.current = false;
      window.history.back();
    }

    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (topic) {
      isMountedRef.current = true;
      setPresentedTopic(topic);
      setIsMounted(true);
      scrimOpacity.setValue(0);
      sheetTranslateY.setValue(320);
      const animationFrame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(scrimOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: useNativeAnimationDriver
          }),
          Animated.timing(sheetTranslateY, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: useNativeAnimationDriver
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
        useNativeDriver: useNativeAnimationDriver
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 320,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: useNativeAnimationDriver
      })
    ]).start(() => {
      setIsMounted(false);
      setPresentedTopic(null);
      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;
      pendingAction?.();
    });
  }, [scrimOpacity, sheetTranslateY, topic]);

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
      window.history.pushState({ topicActionSheet: true }, "");
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

  const actions: readonly TopicAction[] = [
    { icon: "pin", title: "Pin" },
    { icon: "exit-to-app", title: "Leave", destructive: true, onPress: onLeave }
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
            accessibilityLabel="Close huddle options"
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
                    if (activeTopic && action.onPress) {
                      pendingActionRef.current = () => action.onPress?.(activeTopic);
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
