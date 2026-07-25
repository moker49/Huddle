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
import { useAuth } from "@/features/auth/AuthProvider";
import { MessageComposer } from "@/features/messages/components/MessageComposer";
import { MessageList } from "@/features/messages/components/MessageList";
import { HuddleIcon } from "@/features/topics/components/HuddleIcon";
import { useMessages } from "@/features/messages/MessageProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { useUser } from "@/features/users/UserProvider";
import { getGoogleAvatarUrl } from "@/features/users/googleAvatar";
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
    deleteMessage,
    subscribeToMessages,
    updateMessage
  } = useMessages();
  const { user } = useUser();
  const { session } = useAuth();
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
  const userAvatarUrl = getGoogleAvatarUrl(session) || user?.avatarUrl;
  const [profileConnection, setProfileConnection] = useState<Connection | null>(null);
  const [messageBeingEdited, setMessageBeingEdited] = useState<Message | null>(null);
  const [messageBeingRepliedTo, setMessageBeingRepliedTo] = useState<Message | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editError, setEditError] = useState("");
  const connectionAvatarUrlByAlias = useMemo(() => {
    return connections.reduce<Record<string, string>>((avatarUrlByAlias, connection) => {
      if (!connection.avatarUrl) {
        return avatarUrlByAlias;
      }

      getConnectionMemberAliases(connection).forEach((alias) => {
        avatarUrlByAlias[alias] = connection.avatarUrl as string;
      });
      return avatarUrlByAlias;
    }, {});
  }, [connections]);
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
    async (body: string, replyToMessageId?: string) => {
      if (!topicId || !userId || !userDisplayName) {
        return;
      }

      await sendMessage({
        topicId,
        body,
        authorId: userId,
        authorName: userDisplayName,
        authorAvatarUrl: userAvatarUrl,
        replyToMessageId
      });
    },
    [sendMessage, topicId, userAvatarUrl, userDisplayName, userId]
  );

  const handleRequestEdit = useCallback((message: Message) => {
    setEditError("");
    setMessageBeingRepliedTo(null);
    setEditBody(message.body);
    setMessageBeingEdited(message);
  }, []);

  const handleRequestReply = useCallback((message: Message) => {
    setEditError("");
    setMessageBeingEdited(null);
    setEditBody("");
    setMessageBeingRepliedTo(message);
  }, []);

  const handleDismissEdit = useCallback(() => {
    setEditError("");
    setEditBody("");
    setMessageBeingEdited(null);
  }, []);

  const handleDismissReply = useCallback(() => {
    setMessageBeingRepliedTo(null);
  }, []);

  const handleSaveEdit = useCallback(async (body: string) => {
    if (!messageBeingEdited) {
      return;
    }

    setEditError("");

    try {
      await updateMessage(messageBeingEdited.id, body);
      handleDismissEdit();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Message could not be updated.");
    }
  }, [handleDismissEdit, messageBeingEdited, updateMessage]);

  const handleSendReply = useCallback(async (body: string) => {
    if (!messageBeingRepliedTo) {
      return;
    }

    await handleSendMessage(body, messageBeingRepliedTo.id);
    handleDismissReply();
  }, [handleDismissReply, handleSendMessage, messageBeingRepliedTo]);

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

  const getAuthorAvatarUrl = useCallback((message: Message) => {
    if (message.authorId === userId && userAvatarUrl) {
      return userAvatarUrl;
    }

    return message.authorId
      ? connectionAvatarUrlByAlias[message.authorId] ?? message.authorAvatarUrl
      : message.authorAvatarUrl;
  }, [connectionAvatarUrlByAlias, userAvatarUrl, userId]);

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
            <HuddleIcon
              icon={topic.icon}
              label={topic.title}
              size={layout.appBarAvatarSize}
              backgroundColor={theme.colors.primaryContainer}
              color={theme.colors.onPrimaryContainer}
              style={styles.topicAvatar}
            />
            <Text variant="titleLarge" numberOfLines={1} style={styles.topicName}>
              {topic.title}
            </Text>
          </View>
        }
        action={
          <Appbar.Action
            icon="cog"
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
              currentUserId={userId}
              getAuthorAvatarUrl={getAuthorAvatarUrl}
              onDeleteMessage={deleteMessage}
              onPressAuthor={handlePressAuthor}
              onRequestEdit={handleRequestEdit}
              onRequestReply={handleRequestReply}
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
            context={messageBeingEdited ? {
              id: messageBeingEdited.id,
              label: "Editing message",
              mode: "edit",
              errorMessage: editError || undefined,
              onDismiss: handleDismissEdit
            } : messageBeingRepliedTo ? {
              id: messageBeingRepliedTo.id,
              label: "Replying to ",
              mode: "reply",
              detail: messageBeingRepliedTo.kind === "system"
                ? messageBeingRepliedTo.body
                : messageBeingRepliedTo.authorName,
              onDismiss: handleDismissReply
            } : undefined}
            disabled={!hasDisplayName || (!messageBeingEdited && !draftHasLoaded)}
            onChangeText={(body) => {
              if (messageBeingEdited) {
                setEditBody(body);
              } else if (topicId) {
                void saveDraft(topicId, body);
              }
            }}
            onSend={messageBeingEdited ? handleSaveEdit : messageBeingRepliedTo ? handleSendReply : handleSendMessage}
            value={messageBeingEdited ? editBody : draft}
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
