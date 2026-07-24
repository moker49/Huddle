import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform, StyleSheet, View } from "react-native";
import { Button, Dialog, Divider, List, Portal, Text, useTheme } from "react-native-paper";

import { MemberAvatar } from "@/components/MemberAvatar";
import { HuddleIcon } from "@/features/topics/components/HuddleIcon";
import { Connection } from "@/models/connection";
import { getConnectionDisplayName } from "@/models/connectionDisplay";
import { formatPublicIdentifier } from "@/models/identifierDisplay";
import { Topic } from "@/models/topic";
import { shape, spacing } from "@/theme/tokens";

interface MemberProfileCardProps {
  connection: Connection | null;
  onDismiss: () => void;
  onOpenTopic: (topicId: string) => void;
  sharedTopics: Topic[];
  visible: boolean;
}

export function MemberProfileCard({
  connection,
  onDismiss,
  onOpenTopic,
  sharedTopics,
  visible
}: MemberProfileCardProps) {
  const theme = useTheme();
  const browserHistoryEntryIsActiveRef = useRef(false);

  const closeCard = useCallback(() => {
    if (Platform.OS === "web" && browserHistoryEntryIsActiveRef.current) {
      browserHistoryEntryIsActiveRef.current = false;
      window.history.back();
    }

    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (Platform.OS === "web") {
      const handlePopState = () => {
        browserHistoryEntryIsActiveRef.current = false;
        onDismiss();
      };

      window.history.pushState({ memberProfileCard: true }, "");
      browserHistoryEntryIsActiveRef.current = true;
      window.addEventListener("popstate", handlePopState);

      return () => window.removeEventListener("popstate", handlePopState);
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeCard();
      return true;
    });

    return () => subscription.remove();
  }, [closeCard, onDismiss, visible]);

  if (!connection) {
    return null;
  }

  const displayName = getConnectionDisplayName(connection);
  const identifier = connection.tag
    ? formatPublicIdentifier(connection.tag)
    : formatPublicIdentifier(connection.phoneNumber);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={closeCard}>
        <Dialog.Content style={styles.content}>
          <View style={styles.identity}>
            <MemberAvatar avatarUrl={connection.avatarUrl} label={displayName} size={72} />
            <View style={styles.identityCopy}>
              <Text variant="headlineSmall" numberOfLines={1}>
                {displayName}
              </Text>
              {identifier ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {identifier}
                </Text>
              ) : null}
            </View>
          </View>
          <Divider />
          <View style={styles.sharedHuddles}>
            <Text variant="titleSmall">Shared huddles</Text>
            {sharedTopics.length > 0 ? (
              <View style={styles.sharedList}>
                {sharedTopics.map((topic) => (
                  <List.Item
                    key={topic.id}
                    title={topic.title}
                    titleNumberOfLines={1}
                    onPress={() => {
                      closeCard();
                      onOpenTopic(topic.id);
                    }}
                    accessibilityLabel={`Open shared huddle ${topic.title}`}
                    left={() => (
                      <HuddleIcon
                        icon={topic.icon}
                        label={topic.title}
                        size={40}
                        backgroundColor={theme.colors.primaryContainer}
                        color={theme.colors.onPrimaryContainer}
                        style={styles.huddleIcon}
                      />
                    )}
                    right={() => <List.Icon icon="chevron-right" />}
                    style={styles.huddleRow}
                  />
                ))}
              </View>
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No shared huddles yet.
              </Text>
            )}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={closeCard}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs
  },
  sharedHuddles: {
    gap: spacing.xs
  },
  sharedList: {
    overflow: "hidden",
    borderRadius: shape.medium,
    backgroundColor: "transparent"
  },
  huddleRow: {
    paddingHorizontal: spacing.none
  },
  huddleIcon: {
    width: 40,
    height: 40,
    borderRadius: shape.compact,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  }
});
