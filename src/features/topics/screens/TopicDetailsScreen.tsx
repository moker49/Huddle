import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTopBar } from "@/components/AppTopBar";
import { MessageComposer } from "@/features/messages/components/MessageComposer";
import { MessageList } from "@/features/messages/components/MessageList";
import { useMessages } from "@/features/messages/MessageProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { layout, spacing } from "@/theme/tokens";

interface TopicDetailsScreenProps {
  topicId?: string;
}

export function TopicDetailsScreen({ topicId }: TopicDetailsScreenProps) {
  const theme = useTheme();
  const { getTopic, isLoading: topicsAreLoading } = useTopics();
  const { getError, getMessages, isLoading, loadMessages, sendMessage } = useMessages();
  const scrollViewRef = useRef<ScrollView>(null);
  const topic = topicId ? getTopic(topicId) : undefined;
  const messages = topicId ? getMessages(topicId) : [];
  const messageError = topicId ? getError(topicId) : null;
  const messagesAreLoading = topicId ? isLoading(topicId) : false;

  useEffect(() => {
    if (topicId && topic) {
      void loadMessages(topicId);
    }
  }, [loadMessages, topic, topicId]);

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
          <ActivityIndicator accessibilityLabel="Loading topic" />
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
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            />
          }
        />
        <View style={styles.centerState}>
          <Text variant="titleMedium">Topic not found</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            This topic may no longer be available in the current app session.
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
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          />
        }
        title={
          <View style={styles.appBarTitle}>
            <View
              style={[
                styles.topicAvatar,
                { backgroundColor: theme.colors.primaryContainer }
              ]}
            >
              <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {topic.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text variant="titleLarge" numberOfLines={1} style={styles.topicName}>
              {topic.name}
            </Text>
          </View>
        }
        action={
          <Appbar.Action
            icon="bell-outline"
            disabled
            accessibilityLabel="Notifications unavailable"
          />
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
              isLoading={messagesAreLoading}
              errorMessage={messageError}
            />
          </ScrollView>
          <MessageComposer
            onSend={(body) =>
              sendMessage({
                topicId: topic.id,
                body
              }).then(() => undefined)
            }
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg
  }
});
