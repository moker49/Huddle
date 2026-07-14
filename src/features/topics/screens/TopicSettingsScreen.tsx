import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { ActivityIndicator, Snackbar, Text, TextInput } from "react-native-paper";

import { HuddleFab } from "@/components/HuddleFab";
import { Screen } from "@/components/Screen";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { AutoArchiveDateField } from "@/features/topics/components/AutoArchiveDateField";
import { useTopics } from "@/features/topics/TopicProvider";
import {
  arraysMatch,
  collapseFabScrollOffset,
  filterConnectionsForTopicForm,
  formatTopicAutoArchiveInputValue,
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
  const {
    connections,
    errorMessage: connectionErrorMessage,
    isLoading: connectionsAreLoading
  } = useConnections();
  const { getTopic, isLoading, updateTopic } = useTopics();
  const topic = topicId ? getTopic(topicId) : undefined;
  const [title, setTitle] = useState("");
  const [autoArchiveDate, setAutoArchiveDate] = useState("");
  const [networkQuery, setNetworkQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fabIsExtended, setFabIsExtended] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const initializedTopicIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!topic || initializedTopicIdRef.current === topic.id) {
      return;
    }

    initializedTopicIdRef.current = topic.id;
    setTitle(topic.title);
    setAutoArchiveDate(formatTopicAutoArchiveInputValue(topic.autoArchiveAt));
    setSelectedConnectionIds(topic.memberIds);
  }, [topic]);

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
    !arraysMatch(selectedConnectionIds, topic.memberIds)
  ) : false;
  const canSubmit = hasRequiredSubmitFields && !isOverTitleLimit && !autoArchiveIsInvalid;
  const filteredConnections = useMemo(
    () => filterConnectionsForTopicForm({
      connections,
      query: networkQuery,
      selectedConnectionIds
    }),
    [connections, networkQuery, selectedConnectionIds]
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

  async function handleSubmit() {
    setHasSubmitted(true);

    if (!topic || !canSubmit) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const updatedTopic = await updateTopic(topic.id, {
        title,
        memberIds: selectedConnectionIds,
        autoArchiveAt: parsedAutoArchiveAt ?? undefined
      });
      router.replace(`/topics/${updatedTopic.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Huddle could not be saved.");
    } finally {
      setIsSaving(false);
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

  return (
    <Screen title="Huddle settings" onBack={() => goBackOrReplace(`/topics/${topic.id}`)} scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.form}>
          <View style={styles.titleRow}>
            <TextInput
              mode="outlined"
              label="Title"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="sentences"
              returnKeyType="next"
              error={titleError || isOverTitleLimit}
              maxLength={maxTopicTitleLength + 1}
              accessibilityLabel="Huddle title"
              style={styles.titleField}
              right={
                title ? (
                  <TextInput.Icon
                    icon="close"
                    onPress={() => setTitle("")}
                    accessibilityLabel="Clear title"
                  />
                ) : undefined
              }
            />
            <AutoArchiveDateField
              error={autoArchiveError}
              value={autoArchiveDate}
              onChange={setAutoArchiveDate}
            />
          </View>

          <TextInput
            mode="outlined"
            label="Search members"
            value={networkQuery}
            onChangeText={setNetworkQuery}
            autoCapitalize="words"
            accessibilityLabel="Search your network"
            error={memberError}
            right={
              networkQuery ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => setNetworkQuery("")}
                  accessibilityLabel="Clear member search"
                />
              ) : undefined
            }
          />
          <MemberGrid
            connections={filteredConnections}
            errorMessage={connectionErrorMessage}
            isLoading={connectionsAreLoading}
            onScroll={handleGridScroll}
            onToggleConnection={handleToggleConnection}
            selectedConnectionIds={selectedConnectionIds}
          />
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
  titleRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  titleField: {
    flex: 1
  },
  fab: {
    position: "absolute",
    right: spacing.none,
    bottom: spacing.none
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg
  }
});
