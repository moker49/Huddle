import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Snackbar, Text, TextInput, useTheme } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { useUser } from "@/features/users/UserProvider";
import { spacing } from "@/theme/tokens";

export function ProfileSettingsScreen() {
  const theme = useTheme();
  const { errorMessage, isLoading, updateDisplayName, user } = useUser();
  const [displayName, setDisplayName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const trimmedDisplayName = displayName.trim();
  const canSave = trimmedDisplayName.length > 0 && !isSaving;

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
      router.back();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Display name could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen title="Profile" onBack={() => router.back()}>
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
              />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                This name is saved on this device and attached to new messages.
              </Text>
            </View>
            <Button
              mode="contained"
              buttonColor={theme.colors.primaryContainer}
              textColor={theme.colors.onPrimaryContainer}
              onPress={handleSave}
              disabled={!canSave}
              loading={isSaving}
            >
              Save
            </Button>
          </>
        )}
      </View>
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
  }
});
