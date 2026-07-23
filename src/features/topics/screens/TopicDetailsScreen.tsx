import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View
} from "react-native";
import { ActivityIndicator, Appbar, Button, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTopBar } from "@/components/AppTopBar";
import { MemberProfileCard } from "@/features/connections/components/MemberProfileCard";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { MessageComposer } from "@/features/messages/components/MessageComposer";
import { MessageList } from "@/features/messages/components/MessageList";
import { useMessages } from "@/features/messages/MessageProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { useUser } from "@/features/users/UserProvider";
import { Connection } from "@/models/connection";
import { getConnectionMemberAliases } from "@/models/connectionAliases";
import { Message } from "@/models/message";
import { layout, spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

interface TopicDetailsScreenProps {
  topicId?: string;
}

export function TopicDetailsScreen({ topicId }: TopicDetailsScreenProps) {
  const theme = useTheme();
  const { getTopic, isLoading: topicsAreLoading, markTopicRead, topics } = useTopics();
  const { connections } = useConnections();
  const {
    getError,
    getDraft,
    getMessages,
    hasLoadedDraft,
    hasLoadedMessages,
    loadDraft,
    loadMessages,
    saveDraft,
    sendMessage,
    subscribeToMessages
  } = useMessages();
  const { user } = useUser();
  const topic = topicId ? getTopic(topicId) : undefined;
  const topicIsAvailable = Boolean(topic);
  const messages = topicId ? getMessages(topicId) : [];
  const draft = topicId ? getDraft(topicId) : "";
  const draftHasLoaded = topicId ? hasLoadedDraft(topicId) : false;
  const messagesHaveLoaded = topicId ? hasLoadedMessages(topicId) : false;
  const messageError = topicId ? getError(topicId) : null;
  const hasDisplayName = Boolean(user?.displayName);
  const userId = user?.id;
  const userDisplayName = user?.displayName;
  const userAvatarUrl = user?.avatarUrl;
  const [profileConnection, setProfileConnection] = useState<Connection | null>(null);
  const sharedTopics = useMemo(() => {
    if (!profileConnection) {
      return [];
    }

    const aliases = new Set(getConnectionMemberAliases(profileConnection));

    return topics.filter((candidateTopic) => (
      candidateTopic.memberIds.some((memberId) => aliases.has(memberId))
    ));
  }, [profileConnection, topics]);

  useEffect(() => {
    if (!topicId || !topicIsAvailable) {
      return;
    }

    void loadMessages(topicId).then((didLoadMessages) => {
      if (didLoadMessages) {
        void markTopicRead(topicId);
      }
    });
  }, [loadMessages, markTopicRead, topicId, topicIsAvailable]);

  useEffect(() => {
    if (!topicId || !topicIsAvailable) {
      return;
    }

    void loadDraft(topicId);
  }, [loadDraft, topicId, topicIsAvailable]);

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
        authorName: userDisplayName,
        authorAvatarUrl: userAvatarUrl
      });
    },
    [sendMessage, topicId, userAvatarUrl, userDisplayName, userId]
  );

  const handlePressAuthor = useCallback((message: Message) => {
    if (!message.authorId) {
      return;
    }

    const connection = connections.find((candidateConnection) => (
      getConnectionMemberAliases(candidateConnection).includes(message.authorId as string)
    ));

    if (connection) {
      setProfileConnection(connection);
    }
  }, [connections]);

  const handleDismissMemberProfile = useCallback(() => {
    setProfileConnection(null);
  }, []);

  const handleOpenSharedTopic = useCallback((nextTopicId: string) => {
    setProfileConnection(null);

    if (nextTopicId === topicId) {
      return;
    }

    router.push(`/topics/${nextTopicId}`);
  }, [topicId]);

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
          <View style={styles.appBarTitle}>
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
          </View>
        }
        action={
          <Appbar.Action
            icon="cog-outline"
            onPress={() => router.push(`/topics/${topic.id}/settings`)}
            accessibilityLabel="Open huddle settings"
          />
        }
      />
      <View style={styles.shell}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", default: undefined })}
          style={styles.keyboardArea}
        >
          <View style={styles.messageArea}>
            <MessageList
              key={topic.id}
              messages={messages}
              hasLoaded={messagesHaveLoaded}
              errorMessage={messageError}
              onPressAuthor={handlePressAuthor}
            />
          </View>
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
            disabled={!hasDisplayName || !draftHasLoaded}
            onChangeText={(body) => {
              if (topicId) {
                void saveDraft(topicId, body);
              }
            }}
            onSend={handleSendMessage}
            value={draft}
          />
        </KeyboardAvoidingView>
      </View>
      <MemberProfileCard
        connection={profileConnection}
        onDismiss={handleDismissMemberProfile}
        onOpenTopic={handleOpenSharedTopic}
        sharedTopics={sharedTopics}
        visible={Boolean(profileConnection)}
      />
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
  messageArea: {
    flex: 1,
    minHeight: 0
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
