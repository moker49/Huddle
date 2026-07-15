import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Snackbar,
  Text,
  TextInput,
  Divider,
  useTheme
} from "react-native-paper";

import { HuddleFab } from "@/components/HuddleFab";
import { Screen } from "@/components/Screen";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useUser } from "@/features/users/UserProvider";
import { shape, spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

export function ProfileSettingsScreen() {
  const theme = useTheme();
  const { errorMessage, isLoading, updateDisplayName, user } = useUser();
  const {
    addConnection,
    connections,
    errorMessage: networkErrorMessage,
    isLoading: networkIsLoading
  } = useConnections();
  const [displayName, setDisplayName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [addDialogIsVisible, setAddDialogIsVisible] = useState(false);
  const [networkTag, setNetworkTag] = useState("");
  const [networkPhone, setNetworkPhone] = useState("");
  const [networkIdentifierError, setNetworkIdentifierError] = useState("");
  const [isAddingNetworkMember, setIsAddingNetworkMember] = useState(false);
  const trimmedDisplayName = displayName.trim();
  const trimmedNetworkTag = networkTag.trim();
  const trimmedNetworkPhone = networkPhone.trim();
  const networkIdentifier = trimmedNetworkTag
    ? `@${trimmedNetworkTag.replace(/^@/, "")}`
    : trimmedNetworkPhone
      ? `#${trimmedNetworkPhone.replace(/^#/, "")}`
      : "";
  const displayNameIsDirty = user ? displayName !== user.displayName : false;
  const canSave = trimmedDisplayName.length > 0 && !isSaving;
  const screenFieldTheme = {
    colors: {
      background: theme.colors.background,
      surfaceVariant: theme.colors.background
    }
  };
  const dialogFieldTheme = {
    colors: {
      background: theme.colors.elevation.level3,
      surfaceVariant: theme.colors.elevation.level3
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  async function handleSave() {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      await updateDisplayName(trimmedDisplayName);
      goBackOrReplace("/");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Display name could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleChangeNetworkTag(value: string) {
    setNetworkTag(value.replace(/^@/, ""));
    setNetworkPhone("");
    setNetworkIdentifierError("");
  }

  function handleChangeNetworkPhone(value: string) {
    setNetworkPhone(value.replace(/^#/, ""));
    setNetworkTag("");
    setNetworkIdentifierError("");
  }

  function openAddDialog() {
    setNetworkTag("");
    setNetworkPhone("");
    setNetworkIdentifierError("");
    setAddDialogIsVisible(true);
  }

  async function handleAddNetworkMember() {
    if (!networkIdentifier) {
      return;
    }

    setIsAddingNetworkMember(true);
    setNetworkIdentifierError("");

    try {
      await addConnection(networkIdentifier);
      setAddDialogIsVisible(false);
      setNetworkTag("");
      setNetworkPhone("");
    } catch {
      setNetworkIdentifierError("No user found.");
    } finally {
      setIsAddingNetworkMember(false);
    }
  }

  return (
    <Screen title="Profile" onBack={() => goBackOrReplace("/")}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator accessibilityLabel="Loading profile" />
          </View>
        ) : errorMessage ? (
          <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : (
          <>
            <View style={styles.form}>
              <TextInput
                mode="outlined"
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Display name"
                error={displayName.length > 0 && trimmedDisplayName.length === 0}
                theme={screenFieldTheme}
              />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                This name is saved on this device and attached to new messages.
              </Text>
            </View>
            <View
              style={[
                styles.networkCard,
                { backgroundColor: theme.colors.elevation.level2 }
              ]}
            >
              <View style={styles.networkHeader}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Network
                </Text>
                <Button
                  mode="contained-tonal"
                  onPress={openAddDialog}
                  compact
                >
                  Add
                </Button>
              </View>
              <MemberGrid
                connections={connections}
                emptyMessage="No network members yet"
                errorMessage={networkErrorMessage}
                isInteractive={false}
                isLoading={networkIsLoading}
                onScroll={() => undefined}
              />
            </View>
            <View style={styles.fab}>
              <HuddleFab
                icon="check"
                label="Save"
                extended
                onPress={handleSave}
                visible={displayNameIsDirty}
                disabled={!canSave}
                accessibilityLabel="Save profile"
              />
            </View>
          </>
        )}
      </View>
      <Portal>
        <Dialog
          visible={addDialogIsVisible}
          onDismiss={() => {
            if (!isAddingNetworkMember) {
              setAddDialogIsVisible(false);
            }
          }}
        >
          <Dialog.Title>Add to network</Dialog.Title>
          <Dialog.Content>
            <View style={styles.addFields}>
              <TextInput
                mode="outlined"
                label="Tag"
                value={networkTag}
                onChangeText={handleChangeNetworkTag}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                left={<TextInput.Affix text="@" />}
                error={Boolean(networkIdentifierError)}
                accessibilityLabel="Tag"
                theme={dialogFieldTheme}
              />
              <View style={styles.orDivider}>
                <Divider style={styles.orLine} />
                <Text
                  variant="labelMedium"
                  style={[styles.orText, { color: theme.colors.onSurfaceVariant }]}
                >
                  or
                </Text>
                <Divider style={styles.orLine} />
              </View>
              <TextInput
                mode="outlined"
                label="Phone"
                value={networkPhone}
                onChangeText={handleChangeNetworkPhone}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                left={<TextInput.Affix text="#" />}
                error={Boolean(networkIdentifierError)}
                accessibilityLabel="Phone"
                theme={dialogFieldTheme}
              />
            </View>
            {networkIdentifierError ? (
              <Text
                variant="bodySmall"
                style={[styles.fieldError, { color: theme.colors.error }]}
              >
                {networkIdentifierError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setAddDialogIsVisible(false)}
              disabled={isAddingNetworkMember}
            >
              Cancel
            </Button>
            <Button
              onPress={handleAddNetworkMember}
              loading={isAddingNetworkMember}
              disabled={!networkIdentifier || isAddingNetworkMember}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={Boolean(saveError)} onDismiss={() => setSaveError("")}>
        {saveError}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
    paddingTop: spacing.sm
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  form: {
    gap: spacing.sm
  },
  networkCard: {
    gap: spacing.xs,
    borderRadius: shape.large,
    padding: spacing.md
  },
  networkHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  fieldError: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md
  },
  addFields: {
    gap: spacing.xs
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxs
  },
  orLine: {
    flex: 1
  },
  orText: {
    textTransform: "uppercase"
  },
  fab: {
    position: "absolute",
    right: spacing.none,
    bottom: spacing.none
  }
});
