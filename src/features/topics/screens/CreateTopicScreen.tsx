import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AnimatedFAB, Snackbar, TextInput } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { Connection } from "@/models/connection";
import { spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

const maxTitleLength = 80;
const collapseFabScrollOffset = 24;

export function CreateTopicScreen() {
  const params = useLocalSearchParams<{ title?: string; memberIds?: string }>();
  const { createTopic } = useTopics();
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
  const [networkQuery, setNetworkQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>(initialConnectionIds);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fabIsExtended, setFabIsExtended] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedTitle = title.trim();
  const titleError = hasSubmitted && trimmedTitle.length === 0;
  const memberError = hasSubmitted && selectedConnectionIds.length === 0;
  const isOverTitleLimit = title.length > maxTitleLength;
  const hasRequiredSubmitFields = trimmedTitle.length > 0 && selectedConnectionIds.length > 0;
  const canSubmit = trimmedTitle.length > 0 && selectedConnectionIds.length > 0 && !isOverTitleLimit;
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

    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const topic = await createTopic({ title, memberIds: selectedConnectionIds });
      router.replace(`/topics/${topic.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Huddle could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen title="Create huddle" onBack={() => goBackOrReplace("/")} scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Title"
            value={title}
            onChangeText={setTitle}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="next"
            error={titleError || isOverTitleLimit}
            maxLength={maxTitleLength + 1}
            accessibilityLabel="Huddle title"
          />

          <TextInput
            mode="outlined"
            label="Search members"
            value={networkQuery}
            onChangeText={setNetworkQuery}
            autoCapitalize="words"
            accessibilityLabel="Search your network"
            error={memberError}
          />
          <MemberGrid
            connections={filteredConnections}
            errorMessage={connectionErrorMessage}
            isLoading={connectionsAreLoading}
            onScroll={handleGridScroll}
            onToggleConnection={handleToggleConnection}
            selectedConnectionIds={selectedConnectionIds}
          />
          <AnimatedFAB
            icon="check"
            label="Create huddle"
            extended={fabIsExtended}
            onPress={handleSubmit}
            visible={hasRequiredSubmitFields}
            disabled={isSaving || !canSubmit}
            animateFrom="right"
            accessibilityLabel="Create huddle"
            style={styles.fab}
          />
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
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.lg
  }
});
