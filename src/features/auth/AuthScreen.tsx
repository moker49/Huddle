import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, Dialog, HelperText, Portal, Text, useTheme } from "react-native-paper";

import { useAuth } from "@/features/auth/AuthProvider";
import { clearLocalAppData } from "@/services/localDataService";
import { spacing } from "@/theme/tokens";

export function AuthScreen() {
  const theme = useTheme();
  const { errorMessage, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [clearDialogIsVisible, setClearDialogIsVisible] = useState(false);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [clearError, setClearError] = useState("");

  async function handleGoogleSignIn() {
    setIsSigningIn(true);

    try {
      await signInWithGoogle();
    } catch {
      // The provider exposes the authentication error for the screen to render.
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleClearLocalData() {
    setIsClearingLocalData(true);
    setClearError("");

    try {
      await clearLocalAppData();
      setClearDialogIsVisible(false);
    } catch {
      setClearError("Local storage could not be cleared.");
    } finally {
      setIsClearingLocalData(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.form}>
          <Text variant="headlineMedium" style={styles.title}>
            Sign in to Huddle
          </Text>

          {errorMessage ? <HelperText type="error">{errorMessage}</HelperText> : null}

          <Button
            disabled={isSigningIn}
            icon="google"
            loading={isSigningIn}
            mode="contained"
            onPress={handleGoogleSignIn}
          >
            Continue with Google
          </Button>
          <Button
            disabled={isSigningIn || isClearingLocalData}
            mode="text"
            onPress={() => {
              setClearError("");
              setClearDialogIsVisible(true);
            }}
          >
            Clear local storage
          </Button>
        </View>
      </View>
      <Portal>
        <Dialog
          visible={clearDialogIsVisible}
          onDismiss={() => setClearDialogIsVisible(false)}
        >
          <Dialog.Title>Clear local storage?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This clears local profiles, networks, huddles, messages, and activities from this device.
            </Text>
            {clearError ? <HelperText type="error">{clearError}</HelperText> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={isClearingLocalData}
              onPress={() => setClearDialogIsVisible(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={isClearingLocalData}
              loading={isClearingLocalData}
              onPress={handleClearLocalData}
            >
              Clear
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  form: {
    gap: spacing.md,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center"
  },
  title: {
    marginBottom: spacing.xs
  },
  subtitle: {
    marginBottom: spacing.md
  }
});
