import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { AffixTextField } from "@/components/AffixTextField";
import { HuddleFab } from "@/components/HuddleFab";
import { Screen } from "@/components/Screen";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import {
  NetworkMemberSection,
  networkMemberSectionStyles
} from "@/features/connections/components/NetworkMemberSection";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useUser } from "@/features/users/UserProvider";
import { Connection } from "@/models/connection";
import { shape, spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

export function ProfileSettingsScreen() {
  const params = useLocalSearchParams<{ addNetwork?: string }>();
  const theme = useTheme();
  const { errorMessage, isLoading, updateDisplayName, user } = useUser();
  const {
    addConnection,
    connections,
    errorMessage: networkErrorMessage,
    isLoading: networkIsLoading
  } = useConnections();
  const [initializedUserId, setInitializedUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [addDialogIsVisible, setAddDialogIsVisible] = useState(false);
  const [networkTag, setNetworkTag] = useState("");
  const [networkPhone, setNetworkPhone] = useState("");
  const [networkSearch, setNetworkSearch] = useState("");
  const [networkIdentifierError, setNetworkIdentifierError] = useState("");
  const [isAddingNetworkMember, setIsAddingNetworkMember] = useState(false);
  const [hasOpenedInitialAddDialog, setHasOpenedInitialAddDialog] = useState(false);
  const trimmedDisplayName = displayName.trim();
  const trimmedNetworkTag = networkTag.trim();
  const trimmedNetworkPhone = networkPhone.trim();
  const formattedNetworkPhone = formatPhoneInput(networkPhone);
  const networkIdentifier = trimmedNetworkTag
    ? `@${trimmedNetworkTag.replace(/^@/, "")}`
    : trimmedNetworkPhone
      ? `#${trimmedNetworkPhone.replace(/^#/, "")}`
      : "";
  const displayNameIsDirty = user ? displayName !== user.displayName : false;
  const profileIsInitialized = Boolean(user && initializedUserId === user.id);
  const canSave = trimmedDisplayName.length > 0 && !isSaving;
  const canSearchNetwork = connections.length >= 6;
  const filteredConnections = useMemo(
    () => filterNetworkConnections(connections, canSearchNetwork ? networkSearch : ""),
    [canSearchNetwork, connections, networkSearch]
  );
  const cardColor = theme.colors.elevation.level2;
  const screenFieldTheme = {
    colors: {
      background: cardColor,
      surfaceVariant: cardColor
    }
  };

  useEffect(() => {
    if (user && initializedUserId !== user.id) {
      setDisplayName(user.displayName);
      setInitializedUserId(user.id);
    }
  }, [initializedUserId, user]);

  useEffect(() => {
    if (
      params.addNetwork === "1" &&
      profileIsInitialized &&
      !hasOpenedInitialAddDialog
    ) {
      setHasOpenedInitialAddDialog(true);
      openAddDialog();
    }
  }, [hasOpenedInitialAddDialog, params.addNetwork, profileIsInitialized]);

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
    setNetworkPhone(value.replace(/\D/g, "").slice(0, 10));
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
        {isLoading || (user && !profileIsInitialized) ? (
          <View style={styles.centerContent}>
            <ActivityIndicator accessibilityLabel="Loading profile" />
          </View>
        ) : errorMessage ? (
          <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
            {errorMessage}
          </Text>
        ) : (
          <>
            <View
              style={[
                styles.card,
                styles.firstCard,
                { backgroundColor: cardColor }
              ]}
            >
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
            </View>
            <NetworkMemberSection
              searchValue={networkSearch}
              searchVisible={canSearchNetwork}
              onChangeSearch={setNetworkSearch}
              onClearSearch={() => setNetworkSearch("")}
              style={networkMemberSectionStyles.lastCard}
            >
              <MemberGrid
                connections={filteredConnections}
                contentTopPadding={canSearchNetwork ? spacing.xs : spacing.none}
                emptyMessage="No network members yet"
                errorMessage={networkErrorMessage}
                isInteractive={false}
                isLoading={networkIsLoading}
                onScroll={() => undefined}
                trailingAction={{
                  accessibilityLabel: "Add to network",
                  label: "Add",
                  onPress: openAddDialog
                }}
              />
            </NetworkMemberSection>
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
              <AffixTextField
                affix="@"
                label="Tag"
                value={networkTag}
                onChangeText={handleChangeNetworkTag}
                error={Boolean(networkIdentifierError)}
                accessibilityLabel="Tag"
                containerColor={theme.colors.elevation.level3}
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
              <AffixTextField
                affix="#"
                label="Phone"
                value={formattedNetworkPhone}
                onChangeText={handleChangeNetworkPhone}
                keyboardType="phone-pad"
                error={Boolean(networkIdentifierError)}
                accessibilityLabel="Phone"
                containerColor={theme.colors.elevation.level3}
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

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  if (line) {
    return `${area}-${prefix}-${line}`;
  }

  if (prefix) {
    return `${area}-${prefix}`;
  }

  return area;
}

function filterNetworkConnections(connections: Connection[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return connections;
  }

  return connections.filter((connection) => (
    connection.displayName.toLocaleLowerCase().startsWith(normalizedQuery) ||
    connection.tag.toLocaleLowerCase().startsWith(normalizedQuery) ||
    connection.phoneNumber.toLocaleLowerCase().startsWith(normalizedQuery)
  ));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xxs,
    paddingTop: spacing.sm
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    padding: spacing.md
  },
  firstCard: {
    borderTopLeftRadius: shape.large,
    borderTopRightRadius: shape.large,
    borderBottomLeftRadius: spacing.xxs,
    borderBottomRightRadius: spacing.xxs
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
