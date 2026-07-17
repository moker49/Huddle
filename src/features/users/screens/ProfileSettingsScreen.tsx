import { router, useLocalSearchParams } from "expo-router";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
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
import { useAuth } from "@/features/auth/AuthProvider";
import { MemberGrid } from "@/features/connections/components/MemberGrid";
import {
  NetworkMemberSection,
  networkMemberSectionStyles
} from "@/features/connections/components/NetworkMemberSection";
import { useConnections } from "@/features/connections/ConnectionProvider";
import { useTopics } from "@/features/topics/TopicProvider";
import { hasCompleteLocalIdentity } from "@/features/users/identity";
import { useUser } from "@/features/users/UserProvider";
import { Connection } from "@/models/connection";
import { connectionMatchesText } from "@/models/connectionDisplay";
import { shape, spacing } from "@/theme/tokens";
import { goBackOrReplace } from "@/utils/navigation";

export function ProfileSettingsScreen() {
  const params = useLocalSearchParams<{ addNetwork?: string }>();
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const {
    errorMessage,
    isLoading,
    updateIdentifiers,
    updateProfile,
    user
  } = useUser();
  const {
    addConnection,
    connections,
    errorMessage: networkErrorMessage,
    isLoading: networkIsLoading,
    reloadConnections
  } = useConnections();
  const { reloadTopics } = useTopics();
  const [initializedUserId, setInitializedUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileTag, setProfileTag] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [identityDialogIsVisible, setIdentityDialogIsVisible] = useState(false);
  const [identityDialogTag, setIdentityDialogTag] = useState("");
  const [identityDialogPhone, setIdentityDialogPhone] = useState("");
  const [identityDialogError, setIdentityDialogError] = useState("");
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [displayNameWasValidated, setDisplayNameWasValidated] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [addDialogIsVisible, setAddDialogIsVisible] = useState(false);
  const [networkTag, setNetworkTag] = useState("");
  const [networkPhone, setNetworkPhone] = useState("");
  const [networkSearch, setNetworkSearch] = useState("");
  const [networkIdentifierError, setNetworkIdentifierError] = useState("");
  const [isAddingNetworkMember, setIsAddingNetworkMember] = useState(false);
  const [logoutDialogIsVisible, setLogoutDialogIsVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasOpenedInitialAddDialog, setHasOpenedInitialAddDialog] = useState(false);
  const [hasOpenedInitialIdentityDialog, setHasOpenedInitialIdentityDialog] = useState(false);
  const trimmedDisplayName = displayName.trim();
  const trimmedProfileTag = profileTag.trim();
  const trimmedProfilePhone = profilePhone.trim();
  const profilePhoneDigits = profilePhone.replace(/\D/g, "").slice(0, 10);
  const formattedProfilePhone = formatPhoneInput(profilePhone);
  const formattedIdentityDialogPhone = formatPhoneInput(identityDialogPhone);
  const trimmedNetworkTag = networkTag.trim();
  const trimmedNetworkPhone = networkPhone.trim();
  const formattedNetworkPhone = formatPhoneInput(networkPhone);
  const networkIdentifier = trimmedNetworkTag
    ? `@${trimmedNetworkTag.replace(/^@/, "")}`
    : trimmedNetworkPhone
      ? `#${trimmedNetworkPhone.replace(/^#/, "")}`
      : "";
  const savedProfileTag = user ? user.tag.replace(/^@/, "") : "";
  const savedProfilePhone = user ? user.phoneNumber.replace(/\D/g, "") : "";
  const userHasIdentifier = Boolean(savedProfileTag || savedProfilePhone);
  const userHasCompleteIdentity = hasCompleteLocalIdentity(user);
  const profileIdentifierIsComplete = Boolean(trimmedProfileTag || trimmedProfilePhone);
  const profileIsComplete = trimmedDisplayName.length > 0 && profileIdentifierIsComplete;
  const profileIsDirty = user ? (
    displayName !== user.displayName ||
    profileTag !== savedProfileTag ||
    profilePhoneDigits !== savedProfilePhone
  ) : false;
  const profileIsInitialized = Boolean(user && initializedUserId === user.id);
  const canSave = profileIsComplete && !isSaving;
  const displayNameHasError = displayNameWasValidated && trimmedDisplayName.length === 0;
  const identityDialogCanSave = Boolean(
    identityDialogTag.trim() || identityDialogPhone.trim()
  ) && !isSavingIdentity;
  const canSearchNetwork = connections.length >= 6;
  const filteredConnections = useMemo(
    () => filterNetworkConnections(connections, canSearchNetwork ? networkSearch : ""),
    [canSearchNetwork, connections, networkSearch]
  );
  const cardColor = theme.colors.elevation.level2;
  const displayNameAdornmentText = [
    profileTag ? `@${profileTag}` : "@tag",
    formattedProfilePhone ? `#${formattedProfilePhone}` : "#phone"
  ].join("  ");
  const screenFieldTheme = {
    colors: {
      background: cardColor,
      surfaceVariant: cardColor
    }
  };

  useEffect(() => {
    if (user && initializedUserId !== user.id) {
      setDisplayName(user.displayName || getGoogleDisplayName(session));
      setProfileTag(user.tag.replace(/^@/, ""));
      setProfilePhone(user.phoneNumber.replace(/\D/g, ""));
      setInitializedUserId(user.id);
    }
  }, [initializedUserId, session, user]);

  useEffect(() => {
    if (
      params.addNetwork === "1" &&
      profileIsInitialized &&
      userHasCompleteIdentity &&
      !hasOpenedInitialAddDialog
    ) {
      setHasOpenedInitialAddDialog(true);
      openAddDialog();
    }
  }, [hasOpenedInitialAddDialog, params.addNetwork, profileIsInitialized, userHasCompleteIdentity]);

  useEffect(() => {
    if (
      profileIsInitialized &&
      !userHasIdentifier &&
      !hasOpenedInitialIdentityDialog
    ) {
      setHasOpenedInitialIdentityDialog(true);
      setIdentityDialogTag(profileTag);
      setIdentityDialogPhone(profilePhoneDigits);
      setIdentityDialogError("");
      setIdentityDialogIsVisible(true);
    }
  }, [
    hasOpenedInitialIdentityDialog,
    profileIsInitialized,
    profilePhoneDigits,
    profileTag,
    userHasIdentifier
  ]);

  async function handleSave() {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      await updateProfile({
        displayName: trimmedDisplayName,
        tag: profileTag,
        phoneNumber: profilePhoneDigits
      });

      router.replace("/");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    if (!trimmedDisplayName) {
      setDisplayNameWasValidated(true);
      return;
    }

    if (!profileIdentifierIsComplete) {
      openIdentityDialog();
      return;
    }

    goBackOrReplace("/");
  }

  function handleChangeDisplayName(value: string) {
    setDisplayName(sanitizeDisplayNameInput(value));

    if (displayNameWasValidated) {
      setDisplayNameWasValidated(false);
    }
  }

  function handleChangeNetworkTag(value: string) {
    setNetworkTag(sanitizeTagInput(value));
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

  function openIdentityDialog() {
    setIdentityDialogTag(profileTag);
    setIdentityDialogPhone(profilePhoneDigits);
    setIdentityDialogError("");
    setIdentityDialogIsVisible(true);
  }

  function handleChangeIdentityDialogTag(value: string) {
    setIdentityDialogTag(sanitizeTagInput(value));
    setIdentityDialogError("");
  }

  function handleChangeIdentityDialogPhone(value: string) {
    setIdentityDialogPhone(value.replace(/\D/g, "").slice(0, 10));
    setIdentityDialogError("");
  }

  async function handleSaveIdentity() {
    if (!identityDialogCanSave) {
      return;
    }

    setIsSavingIdentity(true);
    setIdentityDialogError("");

    try {
      const nextUser = await updateIdentifiers({
        tag: identityDialogTag,
        phoneNumber: identityDialogPhone
      });

      setProfileTag(nextUser.tag.replace(/^@/, ""));
      setProfilePhone(nextUser.phoneNumber.replace(/\D/g, ""));
      await Promise.all([reloadConnections(), reloadTopics()]);
      setIdentityDialogIsVisible(false);
    } catch (error) {
      setIdentityDialogError(
        error instanceof Error ? error.message : "Profile identity could not be saved."
      );
    } finally {
      setIsSavingIdentity(false);
    }
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

  async function handleLogOut() {
    setIsLoggingOut(true);
    setSaveError("");

    try {
      await signOut();
      setLogoutDialogIsVisible(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not log out.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Screen
      title="Profile"
      onBack={userHasIdentifier ? handleBack : undefined}
      action={
        <Appbar.Action
          icon="logout"
          onPress={() => setLogoutDialogIsVisible(true)}
          accessibilityLabel="Log out"
          disabled={isLoggingOut}
        />
      }
    >
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
                userHasCompleteIdentity ? styles.firstCard : styles.singleCard,
                { backgroundColor: cardColor }
              ]}
            >
              <TextInput
                mode="outlined"
                label="Display name"
                value={displayName}
                onChangeText={handleChangeDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Display name"
                error={displayNameHasError}
                theme={screenFieldTheme}
                right={
                  <TextInput.Affix
                    text={displayNameAdornmentText}
                    onPress={openIdentityDialog}
                    accessibilityLabel="Set profile tag or phone"
                    textStyle={{ color: theme.colors.primary }}
                  />
                }
              />
            </View>
            {userHasCompleteIdentity ? (
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
            ) : null}
            <View style={styles.fab}>
              <HuddleFab
                icon="check"
                label="Save"
                extended
                onPress={handleSave}
                visible={profileIsDirty}
                disabled={!canSave}
                accessibilityLabel="Save profile"
              />
            </View>
          </>
        )}
      </View>
      <Portal>
        <Dialog
          visible={identityDialogIsVisible}
          onDismiss={() => {
            if (!isSavingIdentity) {
              setIdentityDialogIsVisible(false);
            }
          }}
        >
          <Dialog.Title>Set profile identity</Dialog.Title>
          <Dialog.Content>
            <IdentifierDialogFields
              tag={identityDialogTag}
              phone={formattedIdentityDialogPhone}
              error={Boolean(identityDialogError)}
              containerColor={theme.colors.elevation.level3}
              onChangeTag={handleChangeIdentityDialogTag}
              onChangePhone={handleChangeIdentityDialogPhone}
              onClearTag={() => handleChangeIdentityDialogTag("")}
              onClearPhone={() => handleChangeIdentityDialogPhone("")}
              showOrDivider={!userHasIdentifier}
            />
            {identityDialogError ? (
              <Text
                variant="bodySmall"
                style={[styles.fieldError, { color: theme.colors.error }]}
              >
                {identityDialogError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setIdentityDialogIsVisible(false)}
              disabled={isSavingIdentity}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSaveIdentity}
              loading={isSavingIdentity}
              disabled={!identityDialogCanSave}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={logoutDialogIsVisible}
          onDismiss={() => {
            if (!isLoggingOut) {
              setLogoutDialogIsVisible(false);
            }
          }}
        >
          <Dialog.Title>Log out?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This clears the current profile and network from this device. Local huddles stay available for testing phone invites.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setLogoutDialogIsVisible(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              onPress={handleLogOut}
              loading={isLoggingOut}
              disabled={isLoggingOut}
            >
              Log out
            </Button>
          </Dialog.Actions>
        </Dialog>
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
            <IdentifierDialogFields
              tag={networkTag}
              phone={formattedNetworkPhone}
              error={Boolean(networkIdentifierError)}
              containerColor={theme.colors.elevation.level3}
              onChangeTag={handleChangeNetworkTag}
              onChangePhone={handleChangeNetworkPhone}
              onClearTag={() => handleChangeNetworkTag("")}
              onClearPhone={() => handleChangeNetworkPhone("")}
              showOrDivider
            />
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

function IdentifierDialogFields({
  containerColor,
  error,
  onChangePhone,
  onChangeTag,
  onClearPhone,
  onClearTag,
  phone,
  showOrDivider,
  tag
}: {
  containerColor: string;
  error: boolean;
  onChangePhone: (value: string) => void;
  onChangeTag: (value: string) => void;
  onClearPhone: () => void;
  onClearTag: () => void;
  phone: string;
  showOrDivider: boolean;
  tag: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.addFields}>
      <AffixTextField
        affix="@"
        label="Tag"
        value={tag}
        onChangeText={onChangeTag}
        onClear={onClearTag}
        error={error}
        accessibilityLabel="Tag"
        containerColor={containerColor}
      />
      {showOrDivider ? (
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
      ) : null}
      <AffixTextField
        affix="#"
        label="Phone"
        value={phone}
        onChangeText={onChangePhone}
        onClear={onClearPhone}
        keyboardType="phone-pad"
        error={error}
        accessibilityLabel="Phone"
        containerColor={containerColor}
      />
    </View>
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

function sanitizeDisplayNameInput(value: string) {
  return value.replace(/[#@]/g, "");
}

function getGoogleDisplayName(currentSession: Session | null) {
  const metadata = currentSession?.user.user_metadata;
  const displayName = metadata?.given_name ?? metadata?.full_name ?? metadata?.name;
  const firstName = typeof displayName === "string" ? displayName.trim().split(/\s+/)[0] : "";

  return sanitizeDisplayNameInput(firstName);
}

function sanitizeTagInput(value: string) {
  return value
    .replace(/^tag:/i, "")
    .replace(/[@#]/g, "");
}

function filterNetworkConnections(connections: Connection[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return connections;
  }

  return connections.filter((connection) => (
    connectionMatchesText(connection, normalizedQuery)
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
    borderBottomRightRadius: spacing.xxs,
    gap: spacing.xs
  },
  singleCard: {
    borderRadius: shape.large,
    gap: spacing.xs
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
