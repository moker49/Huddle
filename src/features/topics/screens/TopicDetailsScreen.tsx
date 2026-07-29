import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View
} from "react-native";
import { ActivityIndicator, Appbar, Button, Icon, Text, TouchableRipple, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTopBar } from "@/components/AppTopBar";
import { MemberProfileCard } from "@/features/connections/components/MemberProfileCard";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { MessageComposer } from "@/features/messages/components/MessageComposer";
import { MessageActionSheet } from "@/features/messages/components/MessageActionSheet";
import { MessageList } from "@/features/messages/components/MessageList";
import { messageContextMenuHoldDelay } from "@/features/messages/messageContextMenu";
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
  const { getTopic, isLoading: topicsAreLoading, markTopicRead, setPinnedMessage, topics } = useTopics();
  const { connections } = useConnections();
  const {
    getError,
    getCachedMessages,
    getMessageViewportAnchor,
    getOlderPreloadBoundary,
    getNewerPreloadBoundary,
    getDraft,
    getMessages,
    hasLoadedDraft,
    hasLoadedMessages,
    loadDraft,
    loadMessages,
    markMessagesRead,
    ensureMessageSegmentLoaded,
    preloadOlderMessages,
    preloadNewerMessages,
    showNewestMessages,
    saveDraft,
    setMessageViewportAnchor,
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
  const cachedMessages = topicId ? getCachedMessages(topicId) : [];
  const messageViewportAnchor = topicId ? getMessageViewportAnchor(topicId) : undefined;
  const draft = topicId ? getDraft(topicId) : "";
  const draftHasLoaded = topicId ? hasLoadedDraft(topicId) : false;
  const messagesHaveLoaded = topicId ? hasLoadedMessages(topicId) : false;
  const messageError = topicId ? getError(topicId) : null;
  const olderPreloadBoundaryMessageId = topicId ? getOlderPreloadBoundary(topicId) : null;
  const newerPreloadBoundaryMessageId = topicId ? getNewerPreloadBoundary(topicId) : null;
  const hasDisplayName = Boolean(user?.displayName);
  const userId = user?.id;
  const userDisplayName = user?.displayName;
  const userAvatarUrl = getGoogleAvatarUrl(session) || user?.avatarUrl;
  const [profileConnection, setProfileConnection] = useState<Connection | null>(null);
  const [messageBeingEdited, setMessageBeingEdited] = useState<Message | null>(null);
  const [messageBeingRepliedTo, setMessageBeingRepliedTo] = useState<Message | null>(null);
  const [pinnedMessageForActions, setPinnedMessageForActions] = useState<Message | null>(null);
  const [messageToFocus, setMessageToFocus] = useState<{ id: string; requestId: number } | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editError, setEditError] = useState("");
  const [composerIsFocused, setComposerIsFocused] = useState(false);
  const readStateRecordedTopicIdsRef = useRef(new Set<string>());
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

    void loadMessages(topicId, {
      priorityMessageIds: topic?.pinnedMessageId ? [topic.pinnedMessageId] : []
    });
  }, [loadMessages, topic?.pinnedMessageId, topicId, topicIsAvailable]);

  useEffect(() => {
    if (
      !topicId ||
      !topicIsAvailable ||
      !messagesHaveLoaded ||
      readStateRecordedTopicIdsRef.current.has(topicId)
    ) {
      return;
    }

    readStateRecordedTopicIdsRef.current.add(topicId);
    void markTopicRead(topicId).catch(() => undefined);
  }, [markTopicRead, messagesHaveLoaded, topicId, topicIsAvailable]);

  useEffect(() => {
    if (!topicId) {
      return;
    }

    return () => {
      markMessagesRead(topicId);
    };
  }, [markMessagesRead, topicId]);

  useEffect(() => {
    if (!topicId || !messagesHaveLoaded || !topic?.pinnedMessageId) {
      return;
    }

    void ensureMessageSegmentLoaded(topicId, topic.pinnedMessageId);
  }, [ensureMessageSegmentLoaded, messagesHaveLoaded, topic?.pinnedMessageId, topicId]);

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

  const handlePinMessage = useCallback((message: Message) => {
    if (topicId) {
      void setPinnedMessage(topicId, message.id);
    }
  }, [setPinnedMessage, topicId]);

  const handleUnpinMessage = useCallback(() => {
    if (topicId) {
      void setPinnedMessage(topicId);
    }
  }, [setPinnedMessage, topicId]);

  const handleReachOlderPreloadBoundary = useCallback(() => {
    if (topicId) {
      void preloadOlderMessages(topicId);
    }
  }, [preloadOlderMessages, topicId]);

  const handleRequestConversationBottom = useCallback(async () => {
    if (topicId && newerPreloadBoundaryMessageId) {
      await showNewestMessages(topicId);
    }
  }, [newerPreloadBoundaryMessageId, showNewestMessages, topicId]);

  const handleViewableReplySourceIds = useCallback((messageIds: string[]) => {
    if (!topicId) {
      return;
    }

    messageIds.forEach((messageId) => {
      void ensureMessageSegmentLoaded(topicId, messageId);
    });
  }, [ensureMessageSegmentLoaded, topicId]);

  const handleRequestMessageFocus = useCallback(async (messageId: string) => {
    if (!topicId) {
      return;
    }

    await ensureMessageSegmentLoaded(topicId, messageId, { activate: true });
    setMessageToFocus((current) => ({
      id: messageId,
      requestId: (current?.requestId ?? 0) + 1
    }));
  }, [ensureMessageSegmentLoaded, topicId]);

  const pinnedMessage = topic?.pinnedMessageId
    ? cachedMessages.find((message) => message.id === topic.pinnedMessageId)
    : undefined;

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
            {messagesHaveLoaded && pinnedMessage ? (
              <TouchableRipple
                onLongPress={() => setPinnedMessageForActions(pinnedMessage)}
                delayLongPress={messageContextMenuHoldDelay}
                onPress={() => {
                  void handleRequestMessageFocus(pinnedMessage.id);
                }}
                accessibilityLabel="Pinned message"
                accessibilityHint="Hold for pin options"
                style={[styles.pinnedMessage, { backgroundColor: theme.colors.elevation.level1 }]}
              >
                <View style={styles.pinnedMessageContent}>
                  <Icon source="pin" size={20} color={theme.colors.primary} />
                  <View style={styles.pinnedMessageText}>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                      Pinned message
                    </Text>
                    <Text numberOfLines={1} variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      {pinnedMessage.kind === "system"
                        ? pinnedMessage.body
                        : `${pinnedMessage.authorName}: ${pinnedMessage.body}`}
                    </Text>
                  </View>
                </View>
              </TouchableRipple>
            ) : null}
            <MessageList
              key={topic.id}
              messages={messages}
              cachedMessages={cachedMessages}
              hasLoaded={messagesHaveLoaded}
              errorMessage={messageError}
              initialAnchorMessageId={messageViewportAnchor}
              onVisibleMessageChange={(messageId) => {
                if (topicId) {
                  setMessageViewportAnchor(topicId, messageId);
                }
              }}
              composerIsFocused={composerIsFocused}
              currentUserId={userId}
              getAuthorAvatarUrl={getAuthorAvatarUrl}
              onDeleteMessage={deleteMessage}
              olderPreloadBoundaryMessageId={olderPreloadBoundaryMessageId}
              onReachOlderPreloadBoundary={handleReachOlderPreloadBoundary}
              newerPreloadBoundaryMessageId={newerPreloadBoundaryMessageId}
              onReachNewerPreloadBoundary={() => {
                if (topicId) {
                  void preloadNewerMessages(topicId);
                }
              }}
              onViewableReplySourceIds={handleViewableReplySourceIds}
              onRequestMessageFocus={handleRequestMessageFocus}
              onRequestConversationBottom={handleRequestConversationBottom}
              messageToFocus={messageToFocus}
              onPinMessage={handlePinMessage}
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
            onFocus={() => setComposerIsFocused(true)}
            onBlur={() => setComposerIsFocused(false)}
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
      <MessageActionSheet
        currentUserId={userId}
        message={pinnedMessageForActions}
        onDelete={() => undefined}
        onDismiss={() => setPinnedMessageForActions(null)}
        onEdit={() => undefined}
        onReply={() => undefined}
        onUnpin={handleUnpinMessage}
        variant="pinned"
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
  pinnedMessage: {
    marginBottom: spacing.xs,
    borderRadius: spacing.xs,
    overflow: "hidden"
  },
  pinnedMessageContent: {
    minHeight: layout.minTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  pinnedMessageText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs
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
