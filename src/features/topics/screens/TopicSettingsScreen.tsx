import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { ActivityIndicator, Snackbar, Text, TextInput } from "react-native-paper";

import { HuddleFab } from "@/components/HuddleFab";
import { Screen } from "@/components/Screen";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { AutoArchiveDateField } from "@/features/topics/components/AutoArchiveDateField";
import { useTopics } from "@/features/topics/TopicProvider";
import { Connection } from "@/models/connection";
import { spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

interface TopicSettingsScreenProps {
  topicId?: string;
}

const maxTitleLength = 80;
const collapseFabScrollOffset = 24;

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

  useEffect(() => {
    if (!topic) {
      return;
    }

    setTitle(topic.title);
    setAutoArchiveDate(topic.autoArchiveAt ? formatDateInputValue(new Date(topic.autoArchiveAt)) : "");
    setSelectedConnectionIds(topic.memberIds);
  }, [topic]);

  const trimmedTitle = title.trim();
  const titleError = hasSubmitted && trimmedTitle.length === 0;
  const memberError = hasSubmitted && selectedConnectionIds.length === 0;
  const isOverTitleLimit = title.length > maxTitleLength;
  const parsedAutoArchiveAt = parseAutoArchiveDate(autoArchiveDate);
  const autoArchiveIsInvalid = autoArchiveDate.trim().length > 0 && !parsedAutoArchiveAt;
  const autoArchiveError = hasSubmitted && autoArchiveIsInvalid;
  const hasRequiredSubmitFields = trimmedTitle.length > 0 && selectedConnectionIds.length > 0;
  const hasChanges = topic ? (
    title !== topic.title ||
    autoArchiveDate !== formatTopicAutoArchiveInputValue(topic.autoArchiveAt) ||
    !arraysMatch(selectedConnectionIds, topic.memberIds)
  ) : false;
  const canSubmit = hasRequiredSubmitFields && !isOverTitleLimit && !autoArchiveIsInvalid;
  const normalizedNetworkQuery = networkQuery.trim().toLocaleLowerCase();
  const filteredConnections = useMemo(() => {
    const matchingConnections = connections.filter((connection) => {
      if (selectedConnectionIds.includes(connection.id)) {
        return true;
      }

      if (!normalizedNetworkQuery) {
        return true;
      }

      const handle = connection.handle ?? "";
      return (
        connection.displayName.toLocaleLowerCase().startsWith(normalizedNetworkQuery) ||
        handle.toLocaleLowerCase().startsWith(normalizedNetworkQuery)
      );
    });

    return normalizedNetworkQuery && matchingConnections.length === 0
      ? connections
      : matchingConnections;
  }, [connections, normalizedNetworkQuery, selectedConnectionIds]);

  function handleToggleConnection(connection: Connection) {
    setSelectedConnectionIds((currentIds) => {
      if (currentIds.includes(connection.id)) {
        return currentIds.filter((currentId) => currentId !== connection.id);
      }

      return [...currentIds, connection.id];
    });
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
              maxLength={maxTitleLength + 1}
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

function parseAutoArchiveDate(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  const date = new Date(`${trimmedValue}T23:59:59.999Z`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTopicAutoArchiveInputValue(autoArchiveAt: string | undefined) {
  return autoArchiveAt ? formatDateInputValue(new Date(autoArchiveAt)) : "";
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function arraysMatch(firstArray: string[], secondArray: string[]) {
  return (
    firstArray.length === secondArray.length &&
    firstArray.every((value, index) => value === secondArray[index])
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
