import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Button, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTopBar } from "@/components/AppTopBar";
import { MessageComposer } from "@/features/messages/components/MessageComposer";
import { MessageList } from "@/features/messages/components/MessageList";
import { useMessages } from "@/features/messages/MessageProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { useUser } from "@/features/users/UserProvider";
import { layout, spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

interface TopicDetailsScreenProps {
  topicId?: string;
}

export function TopicDetailsScreen({ topicId }: TopicDetailsScreenProps) {
  const theme = useTheme();
  const { getTopic, isLoading: topicsAreLoading, markTopicRead } = useTopics();
  const {
    getError,
    getMessages,
    hasLoadedMessages,
    loadMessages,
    sendMessage,
    subscribeToMessages
  } = useMessages();
  const { user } = useUser();
  const scrollViewRef = useRef<ScrollView>(null);
  const readTopicIdRef = useRef<string | null>(null);
  const topic = topicId ? getTopic(topicId) : undefined;
  const topicIsAvailable = Boolean(topic);
  const messages = topicId ? getMessages(topicId) : [];
  const messagesHaveLoaded = topicId ? hasLoadedMessages(topicId) : false;
  const messageError = topicId ? getError(topicId) : null;
  const hasDisplayName = Boolean(user?.displayName);
  const userId = user?.id;
  const userDisplayName = user?.displayName;

  useEffect(() => {
    if (topicId && topicIsAvailable) {
      void loadMessages(topicId);
    }
  }, [loadMessages, topicId, topicIsAvailable]);

  useEffect(() => {
    if (!topicId || !topicIsAvailable || readTopicIdRef.current === topicId) {
      return;
    }

    readTopicIdRef.current = topicId;
    void markTopicRead(topicId).catch(() => {
      if (readTopicIdRef.current === topicId) {
        readTopicIdRef.current = null;
      }
    });
  }, [markTopicRead, topicId, topicIsAvailable]);

  useEffect(() => {
    if (!topicId || !topicIsAvailable) {
      return;
    }

    let isActive = true;
    let unsubscribe: () => void = () => undefined;

    void subscribeToMessages(topicId).then((nextUnsubscribe) => {
      if (isActive) {
        unsubscribe = nextUnsubscribe;
      } else {
        nextUnsubscribe();
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [subscribeToMessages, topicId, topicIsAvailable]);

  const handleSendMessage = useCallback(
    async (body: string) => {
      if (!topicId || !userId || !userDisplayName) {
        return;
      }

      await sendMessage({
        topicId,
        body,
        authorId: userId,
        authorName: userDisplayName
      });
    },
    [sendMessage, topicId, userDisplayName, userId]
  );

  const scrollToLatestMessage = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToLatestMessage(false);
    }
  }, [messages.length, scrollToLatestMessage]);

  if (topicsAreLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerState}>
          <ActivityIndicator accessibilityLabel="Loading huddle" />
        </View>
      </SafeAreaView>
    );
  }

  if (!topic) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppTopBar
          navigation={
            <Appbar.Action
              icon="arrow-left"
              onPress={() => goBackOrReplace("/")}
              accessibilityLabel="Go back"
            />
          }
        />
        <View style={styles.centerState}>
          <Text variant="titleMedium">Huddle not found</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            This huddle may no longer be available in the current app session.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "right", "left"]}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <AppTopBar
        navigation={
          <Appbar.Action
            icon="arrow-left"
            onPress={() => goBackOrReplace("/")}
            accessibilityLabel="Go back"
          />
        }
        title={
          <Pressable
            onPress={() => router.push(`/topics/${topic.id}/settings`)}
            accessibilityRole="button"
            accessibilityLabel="Open huddle settings"
            style={styles.appBarTitle}
          >
            <View
              style={[
                styles.topicAvatar,
                { backgroundColor: theme.colors.primaryContainer }
              ]}
            >
              <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {topic.title.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text variant="titleLarge" numberOfLines={1} style={styles.topicName}>
              {topic.title}
            </Text>
          </Pressable>
        }
      />
      <View style={styles.shell}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", default: undefined })}
          style={styles.keyboardArea}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.conversationContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollToLatestMessage(false)}
          >
            <MessageList
              messages={messages}
              hasLoaded={messagesHaveLoaded}
              errorMessage={messageError}
            />
          </ScrollView>
          {!hasDisplayName ? (
            <View
              style={[
                styles.profilePrompt,
                { backgroundColor: theme.colors.surface }
              ]}
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Set your display name to send messages.
              </Text>
              <Button
                mode="contained"
                buttonColor={theme.colors.primaryContainer}
                textColor={theme.colors.onPrimaryContainer}
                onPress={() => router.push("/profile")}
              >
                Profile
              </Button>
            </View>
          ) : null}
          <MessageComposer
            disabled={!hasDisplayName}
            onSend={handleSendMessage}
          />
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  shell: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg
  },
  appBarTitle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.xs
  },
  topicAvatar: {
    width: layout.appBarAvatarSize,
    height: layout.appBarAvatarSize,
    borderRadius: layout.appBarAvatarSize / 2,
    alignItems: "center",
    justifyContent: "center"
  },
  topicName: {
    flexShrink: 1,
    textAlign: "left"
  },
  conversationContent: {
    flexGrow: 1,
    paddingBottom: spacing.md
  },
  keyboardArea: {
    flex: 1
  },
  profilePrompt: {
    gap: spacing.sm,
    borderRadius: spacing.xs,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg
  }
});
