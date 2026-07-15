import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Snackbar, Text } from "react-native-paper";

import { HuddleFab } from "@/components/HuddleFab";
import { Screen } from "@/components/Screen";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { TopicFormLayout } from "@/features/topics/components/TopicFormLayout";
import {
  DuplicateTopicMatch,
  findDuplicateTopicMatch
} from "@/features/topics/duplicateTopics";
import { useTopics } from "@/features/topics/TopicProvider";
import {
  collapseFabScrollOffset,
  filterConnectionsForTopicForm,
  formatDateInputValue,
  getTopicFormValidation,
  maxTopicTitleLength,
  toggleConnectionId
} from "@/features/topics/topicForm";
import { Connection } from "@/models/connection";
import { spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

export function CreateTopicScreen() {
  const params = useLocalSearchParams<{ title?: string; memberIds?: string }>();
  const { createTopic, topics } = useTopics();
  const {
    connections,
    errorMessage: connectionErrorMessage,
    isLoading: connectionsAreLoading
  } = useConnections();
  const initialConnectionIds = useMemo(() => {
    return typeof params.memberIds === "string" && params.memberIds.length > 0
      ? params.memberIds.split(",").filter(Boolean)
      : [];
  }, [params.memberIds]);
  const [title, setTitle] = useState(params.title ?? "");
  const [autoArchiveDate, setAutoArchiveDate] = useState(() => {
    const defaultAutoArchiveDate = new Date();

    defaultAutoArchiveDate.setDate(defaultAutoArchiveDate.getDate() + 7);

    return formatDateInputValue(defaultAutoArchiveDate);
  });
  const [networkQuery, setNetworkQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>(initialConnectionIds);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fabIsExtended, setFabIsExtended] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateTopicMatch | null>(null);
  const titleShouldAutoFocus = !params.title;

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

  async function handleSubmit({ skipDuplicateWarning = false } = {}) {
    setHasSubmitted(true);

    if (!canSubmit) {
      return;
    }

    if (!skipDuplicateWarning) {
      const nextDuplicateMatch = findDuplicateTopicMatch(title, topics);

      if (nextDuplicateMatch) {
        setDuplicateMatch(nextDuplicateMatch);
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const topic = await createTopic({
        title,
        memberIds: selectedConnectionIds,
        autoArchiveAt: parsedAutoArchiveAt ?? undefined
      });
      router.replace(`/topics/${topic.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Huddle could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  function openDuplicateHuddle() {
    if (!duplicateMatch) {
      return;
    }

    router.replace(`/topics/${duplicateMatch.topic.id}`);
  }

  function closeDuplicateDialog() {
    setDuplicateMatch(null);
  }

  async function createAnyway() {
    setDuplicateMatch(null);
    await handleSubmit({ skipDuplicateWarning: true });
  }

  return (
    <Screen title="Create huddle" onBack={() => goBackOrReplace("/")} scroll={false}>
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
            titleAutoFocus={titleShouldAutoFocus}
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
              label="Create huddle"
              extended={fabIsExtended}
              onPress={handleSubmit}
              visible={hasRequiredSubmitFields}
              disabled={isSaving || !canSubmit}
              accessibilityLabel="Create huddle"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(errorMessage)} onDismiss={() => setErrorMessage("")}>
        {errorMessage}
      </Snackbar>
      <Portal>
        <Dialog visible={Boolean(duplicateMatch)} onDismiss={closeDuplicateDialog}>
          <Dialog.Title>
            {duplicateMatch?.level === "prevent" ? "Huddle already exists" : "Similar huddle found"}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {duplicateMatch?.level === "prevent"
                ? "A huddle with this title already exists."
                : "A huddle with a similar title already exists."}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDuplicateDialog}>
              {duplicateMatch?.level === "prevent" ? "Close" : "Cancel"}
            </Button>
            {duplicateMatch?.level === "warn" ? (
              <Button onPress={createAnyway} loading={isSaving} disabled={isSaving}>
                Create anyway
              </Button>
            ) : null}
            <Button onPress={openDuplicateHuddle}>View huddle</Button>
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
  duplicateTitle: {
    marginTop: spacing.sm
  }
});
