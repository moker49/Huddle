import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  Divider,
  HelperText,
  List,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";

import { Screen } from "@/components/Screen";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { Connection } from "@/models/connection";
import { layout, spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

const maxNameLength = 80;

interface FocusHandle {
  focus(): void;
}

interface PreventableEvent {
  preventDefault(): void;
}

const keepNetworkInputFocusedProps =
  Platform.OS === "web"
    ? {
      onMouseDown: (event: PreventableEvent) => event.preventDefault(),
      onPointerDown: (event: PreventableEvent) => event.preventDefault(),
      onTouchStart: (event: PreventableEvent) => event.preventDefault()
    }
    : undefined;

export function CreateTopicScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ name?: string; memberIds?: string }>();
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
  const networkInputRef = useRef<FocusHandle | null>(null);
  const [name, setName] = useState(params.name ?? "");
  const [networkQuery, setNetworkQuery] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>(initialConnectionIds);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedName = name.trim();
  const nameError = hasSubmitted && trimmedName.length === 0;
  const memberError = hasSubmitted && selectedConnectionIds.length === 0;
  const isOverNameLimit = name.length > maxNameLength;
  const canSubmit = trimmedName.length > 0 && selectedConnectionIds.length > 0 && !isOverNameLimit;
  const normalizedNetworkQuery = networkQuery.trim().toLocaleLowerCase();
  const selectedConnectionIdSet = useMemo(
    () => new Set(selectedConnectionIds),
    [selectedConnectionIds]
  );
  const selectedConnections = useMemo(
    () => connections.filter((connection) => selectedConnectionIdSet.has(connection.id)),
    [connections, selectedConnectionIdSet]
  );
  const filteredConnections = useMemo(() => {
    return connections.filter((connection) => {
      if (selectedConnectionIdSet.has(connection.id)) {
        return false;
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
  }, [connections, normalizedNetworkQuery, selectedConnectionIdSet]);

  function handleSelectConnection(connection: Connection) {
    setSelectedConnectionIds((currentIds) => {
      if (currentIds.includes(connection.id)) {
        return currentIds;
      }

      return [...currentIds, connection.id];
    });
    setNetworkQuery("");
  }

  function handleRemoveConnection(connectionId: string) {
    setSelectedConnectionIds((currentIds) =>
      currentIds.filter((currentId) => currentId !== connectionId)
    );
  }

  function handleChangeNetworkQuery(nextQuery: string) {
    if (nextQuery.endsWith(" ")) {
      const nextNormalizedQuery = nextQuery.trim().toLocaleLowerCase();
      const matchingConnections = connections.filter((connection) => {
        if (selectedConnectionIdSet.has(connection.id)) {
          return false;
        }

        if (!nextNormalizedQuery) {
          return false;
        }

        const handle = connection.handle ?? "";
        return (
          connection.displayName.toLocaleLowerCase().startsWith(nextNormalizedQuery) ||
          handle.toLocaleLowerCase().startsWith(nextNormalizedQuery)
        );
      });

      if (matchingConnections.length === 1) {
        handleSelectConnection(matchingConnections[0]);
        return;
      }
    }

    setNetworkQuery(nextQuery);
  }

  async function handleSubmit() {
    setHasSubmitted(true);

    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const topic = await createTopic({ name, memberIds: selectedConnectionIds });
      router.replace(`/topics/${topic.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Huddle could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen title="Create huddle" onBack={() => goBackOrReplace("/")}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Name"
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="next"
            error={nameError || isOverNameLimit}
            maxLength={maxNameLength + 1}
            accessibilityLabel="Huddle name"
          />
          <HelperText type={nameError || isOverNameLimit ? "error" : "info"} visible>
            {nameError
              ? "Huddle name is required."
              : `${name.length}/${maxNameLength}`}
          </HelperText>

          <TextInput
            ref={(instance: FocusHandle | null) => {
              networkInputRef.current = instance;
            }}
            mode="outlined"
            label="Members"
            value={networkQuery}
            onChangeText={handleChangeNetworkQuery}
            autoCapitalize="words"
            accessibilityLabel="Search your network"
            error={memberError}
          />
          {networkQuery.trim() ? (
            <NetworkPickerDropdown
              connections={filteredConnections}
              errorMessage={connectionErrorMessage}
              isLoading={connectionsAreLoading}
              onSelectConnection={handleSelectConnection}
            />
          ) : null}
          <HelperText type={memberError ? "error" : "info"} visible>
            {memberError ? "At least one member is required." : "Add members from your network."}
          </HelperText>
          {selectedConnections.length > 0 ? (
            <View style={styles.chipRow}>
              {selectedConnections.map((connection) => (
                <Chip
                  {...keepNetworkInputFocusedProps}
                  key={connection.id}
                  mode="flat"
                  closeIcon="close"
                  onClose={() => handleRemoveConnection(connection.id)}
                  closeIconAccessibilityLabel={`Remove ${connection.displayName}`}
                  focusable={false}
                  style={[
                    styles.recipientChip,
                    { backgroundColor: theme.colors.secondaryContainer }
                  ]}
                  textStyle={{ color: theme.colors.onSecondaryContainer }}
                >
                  {connection.displayName}
                </Chip>
              ))}
            </View>
          ) : null}

          <Button
            mode="contained"
            icon="check"
            onPress={handleSubmit}
            loading={isSaving}
            disabled={isSaving}
            buttonColor={theme.colors.primaryContainer}
            textColor={theme.colors.onPrimaryContainer}
            contentStyle={styles.buttonContent}
          >
            Create huddle
          </Button>
        </View>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(errorMessage)} onDismiss={() => setErrorMessage("")}>
        {errorMessage}
      </Snackbar>
    </Screen>
  );
}

interface NetworkPickerDropdownProps {
  connections: Connection[];
  errorMessage: string | null;
  isLoading: boolean;
  onSelectConnection: (connection: Connection) => void;
}

function NetworkPickerDropdown({
  connections,
  errorMessage,
  isLoading,
  onSelectConnection
}: NetworkPickerDropdownProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Surface elevation={2} style={[styles.networkDropdown, styles.networkDropdownState]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Loading network
        </Text>
      </Surface>
    );
  }

  if (errorMessage) {
    return (
      <Surface elevation={2} style={[styles.networkDropdown, styles.networkDropdownState]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {errorMessage}
        </Text>
      </Surface>
    );
  }

  if (connections.length === 0) {
    return (
      <Surface elevation={2} style={[styles.networkDropdown, styles.networkDropdownState]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No matching network members
        </Text>
      </Surface>
    );
  }

  return (
    <Surface elevation={2} style={styles.networkDropdown}>
      {connections.map((connection, index) => (
        <View key={connection.id}>
          <List.Item
            {...keepNetworkInputFocusedProps}
            title={connection.displayName}
            description={connection.handle ? `@${connection.handle}` : undefined}
            left={(props) => <List.Icon {...props} icon="account-outline" />}
            right={(props) => <List.Icon {...props} icon="plus" />}
            onPress={() => onSelectConnection(connection)}
            accessibilityLabel={`Network member ${connection.displayName}`}
            focusable={false}
          />
          {index < connections.length - 1 ? <Divider /> : null}
        </View>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1
  },
  form: {
    paddingTop: spacing.sm,
    gap: spacing.xs
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  recipientChip: {
    justifyContent: "center"
  },
  networkDropdown: {
    borderRadius: 12,
    overflow: "hidden",
    paddingVertical: spacing.xxs
  },
  networkDropdownState: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  buttonContent: {
    minHeight: layout.minTouchTarget
  }
});
