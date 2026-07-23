import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Dialog,
  Portal,
  Snackbar,
  Text,
  useTheme
} from "react-native-paper";

import { HuddleFab } from "@/components/HuddleFab";
import { Screen } from "@/components/Screen";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { TopicFormLayout } from "@/features/topics/components/TopicFormLayout";
import { useTopics } from "@/features/topics/TopicProvider";
import {
  arraysMatch,
  collapseFabScrollOffset,
  filterConnectionsForTopicForm,
  formatTopicAutoArchiveInputValue,
  getConnectionIdsForTopicMemberIds,
  getTopicMemberIdsWithoutConnections,
  getTopicFormValidation,
  maxTopicTitleLength,
  toggleConnectionId
} from "@/features/topics/topicForm";
import { Connection } from "@/models/connection";
import { spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

interface TopicSettingsScreenProps {
  topicId?: string;
}

export function TopicSettingsScreen({ topicId }: TopicSettingsScreenProps) {
  const theme = useTheme();
  const {
    connections,
    errorMessage: connectionErrorMessage,
    isLoading: connectionsAreLoading
  } = useConnections();
  const { deleteTopic, getTopic, isLoading, leaveTopic, updateTopic } = useTopics();
  const topic = topicId ? getTopic(topicId) : undefined;
  const [title, setTitle] = useState("");
  const [autoArchiveDate, setAutoArchiveDate] = useState("");
  const [networkQuery, setNetworkQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [fabIsExtended, setFabIsExtended] = useState(true);
  const [discardDialogIsVisible, setDiscardDialogIsVisible] = useState(false);
  const [deleteDialogIsVisible, setDeleteDialogIsVisible] = useState(false);
  const [leaveDialogIsVisible, setLeaveDialogIsVisible] = useState(false);
  const [memberHistoryDialogIsVisible, setMemberHistoryDialogIsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const initializedTopicIdRef = useRef<string | null>(null);
  const topicIsInitialized = Boolean(topic && initializedTopicIdRef.current === topic.id);
  const initialSelectedConnectionIds = useMemo(() => (
    topic
      ? getConnectionIdsForTopicMemberIds(topic.memberIds, connections)
      : []
  ), [connections, topic]);
  const fixedMemberIds = useMemo(() => {
    if (!topic) {
      return [];
    }

    return Array.from(new Set([
      ...getTopicMemberIdsWithoutConnections(topic.memberIds, connections)
    ]));
  }, [connections, topic]);

  useEffect(() => {
    if (!topic || connectionsAreLoading || initializedTopicIdRef.current === topic.id) {
      return;
    }

    initializedTopicIdRef.current = topic.id;
    setTitle(topic.title);
    setAutoArchiveDate(formatTopicAutoArchiveInputValue(topic.autoArchiveAt));
    setSelectedConnectionIds(initialSelectedConnectionIds);
  }, [connectionsAreLoading, initialSelectedConnectionIds, topic]);

  const {
    autoArchiveIsInvalid,
    hasRequiredSubmitFields,
    isOverTitleLimit,
    parsedAutoArchiveAt,
    trimmedTitle
  } = getTopicFormValidation({ autoArchiveDate, selectedConnectionIds, title });
  const titleError = hasSubmitted && trimmedTitle.length === 0;
  const memberError = hasSubmitted && selectedConnectionIds.length === 0;
  const autoArchiveError = hasSubmitted && autoArchiveIsInvalid;
  const hasChanges = topic ? (
    title !== topic.title ||
    autoArchiveDate !== formatTopicAutoArchiveInputValue(topic.autoArchiveAt) ||
    !arraysMatch(selectedConnectionIds, initialSelectedConnectionIds)
  ) : false;
  const canSubmit = hasRequiredSubmitFields && !isOverTitleLimit && !autoArchiveIsInvalid;
  const memberSearchIsVisible = connections.length >= 6;
  const filteredConnections = useMemo(
    () => filterConnectionsForTopicForm({
      connections,
      query: memberSearchIsVisible ? networkQuery : "",
      selectedConnectionIds
    }),
    [connections, memberSearchIsVisible, networkQuery, selectedConnectionIds]
  );

  function handleToggleConnection(connection: Connection) {
    setSelectedConnectionIds((currentIds) => toggleConnectionId(currentIds, connection.id));
    setNetworkQuery("");
  }

  function handleGridScroll(offsetY: number) {
    const shouldExtendFab = offsetY < collapseFabScrollOffset;

    setFabIsExtended((currentValue) =>
      currentValue === shouldExtendFab ? currentValue : shouldExtendFab
    );
  }

  function handleBack() {
    if (hasChanges) {
      setDiscardDialogIsVisible(true);
      return;
    }

    goBackOrReplace(`/topics/${topic?.id ?? ""}`);
  }

  function handleDiscardChanges() {
    setDiscardDialogIsVisible(false);

    if (topic) {
      goBackOrReplace(`/topics/${topic.id}`);
    } else {
      goBackOrReplace("/");
    }
  }

  async function handleSubmit() {
    setHasSubmitted(true);

    if (!topic || !canSubmit) {
      return;
    }

    if (hasNewMembers(initialSelectedConnectionIds, selectedConnectionIds)) {
      setMemberHistoryDialogIsVisible(true);
      return;
    }

    await saveTopicChanges();
  }

  async function saveTopicChanges() {
    if (!topic) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await updateTopic(topic.id, {
        title,
        memberIds: Array.from(new Set([...selectedConnectionIds, ...fixedMemberIds])),
        autoArchiveAt: parsedAutoArchiveAt ?? undefined
      });
      goBackOrReplace(`/topics/${topic.id}`);
    } catch (error) {
      setErrorMessage(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmMemberHistoryWarning() {
    setMemberHistoryDialogIsVisible(false);
    await saveTopicChanges();
  }

  async function handleDelete() {
    if (!topic) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteTopic(topic.id);
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Huddle could not be deleted.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogIsVisible(false);
    }
  }

  async function handleLeave() {
    if (!topic) {
      return;
    }

    setIsLeaving(true);
    setErrorMessage("");

    try {
      await leaveTopic(topic.id);
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Huddle could not be left.");
    } finally {
      setIsLeaving(false);
      setLeaveDialogIsVisible(false);
    }
  }

  if (isLoading) {
    return (
      <Screen title="Huddle settings" onBack={() => goBackOrReplace("/")}>
        <View style={styles.centerState}>
          <ActivityIndicator accessibilityLabel="Loading huddle settings" />
        </View>
      </Screen>
    );
  }

  if (!topic) {
    return (
      <Screen title="Huddle settings" onBack={() => goBackOrReplace("/")}>
        <View style={styles.centerState}>
          <Text variant="titleMedium">Huddle not found</Text>
        </View>
      </Screen>
    );
  }

  if (!topicIsInitialized) {
    return (
      <Screen title="Huddle settings" onBack={() => goBackOrReplace("/")}>
        <View style={styles.centerState}>
          <ActivityIndicator accessibilityLabel="Loading huddle settings" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Huddle settings"
      onBack={handleBack}
      scroll={false}
      action={
        <View style={styles.appBarActions}>
          <Appbar.Action
            icon="exit-to-app"
            onPress={() => setLeaveDialogIsVisible(true)}
            disabled={isSaving || isDeleting || isLeaving}
            accessibilityLabel="Leave huddle"
            iconColor={theme.colors.error}
          />
          <Appbar.Action
            icon="delete-outline"
            onPress={() => setDeleteDialogIsVisible(true)}
            disabled={isSaving || isDeleting || isLeaving}
            accessibilityLabel="Delete huddle"
            iconColor={theme.colors.error}
          />
        </View>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.form}>
          <TopicFormLayout
            autoArchiveError={autoArchiveError}
            autoArchiveValue={autoArchiveDate}
            memberError={memberError}
            memberSearchValue={networkQuery}
            memberSearchVisible={memberSearchIsVisible}
            onChangeAutoArchive={setAutoArchiveDate}
            onChangeMemberSearch={setNetworkQuery}
            onChangeTitle={setTitle}
            onClearMemberSearch={() => setNetworkQuery("")}
            titleError={titleError || isOverTitleLimit}
            titleAutoFocus={false}
            titleMaxLength={maxTopicTitleLength + 1}
            titleValue={title}
          >
            <MemberGrid
              connections={filteredConnections}
              contentTopPadding={memberSearchIsVisible ? spacing.xs : spacing.none}
              errorMessage={connectionErrorMessage}
              isLoading={connectionsAreLoading}
              onScroll={handleGridScroll}
              onToggleConnection={handleToggleConnection}
              selectedConnectionIds={selectedConnectionIds}
            />
          </TopicFormLayout>
          <View style={styles.fab}>
            <HuddleFab
              icon="check"
              label="Save"
              extended={fabIsExtended}
              onPress={handleSubmit}
              visible={hasChanges}
              disabled={isSaving || !canSubmit}
              accessibilityLabel="Save huddle settings"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(errorMessage)} onDismiss={() => setErrorMessage("")}>
        {errorMessage}
      </Snackbar>
      <Portal>
        <Dialog
          visible={discardDialogIsVisible}
          onDismiss={() => setDiscardDialogIsVisible(false)}
        >
          <Dialog.Title>Discard changes?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Unsaved changes to this huddle will be lost.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiscardDialogIsVisible(false)}>Cancel</Button>
            <Button onPress={handleDiscardChanges}>Discard</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={deleteDialogIsVisible}
          onDismiss={() => setDeleteDialogIsVisible(false)}
        >
          <Dialog.Title>Delete huddle?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This permanently deletes the huddle and its messages for every member.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogIsVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete} loading={isDeleting} disabled={isDeleting}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={leaveDialogIsVisible}
          onDismiss={() => setLeaveDialogIsVisible(false)}
        >
          <Dialog.Title>Leave huddle?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              You will lose access to this huddle and its message history.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLeaveDialogIsVisible(false)}>Cancel</Button>
            <Button onPress={handleLeave} loading={isLeaving} disabled={isLeaving}>
              Leave
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={memberHistoryDialogIsVisible}
          onDismiss={() => setMemberHistoryDialogIsVisible(false)}
        >
          <Dialog.Title>Add members?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              New members will be able to see the full huddle history.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMemberHistoryDialogIsVisible(false)}>Cancel</Button>
            <Button onPress={confirmMemberHistoryWarning} loading={isSaving} disabled={isSaving}>
              Yes
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1
  },
  form: {
    flex: 1,
    paddingTop: spacing.sm,
    gap: spacing.xs
  },
  fab: {
    position: "absolute",
    right: spacing.none,
    bottom: spacing.none
  },
  appBarActions: {
    flexDirection: "row",
    alignItems: "center"
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg
  }
});

function hasNewMembers(previousMemberIds: string[], nextMemberIds: string[]) {
  const previousMemberIdSet = new Set(previousMemberIds);

  return nextMemberIds.some((memberId) => !previousMemberIdSet.has(memberId));
}

function getSaveErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Huddle could not be saved.";
}
