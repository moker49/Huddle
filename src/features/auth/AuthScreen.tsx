import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, useTheme } from "react-native-paper";

import { useAuth } from "@/features/auth/AuthProvider";
import { spacing } from "@/theme/tokens";

export function AuthScreen() {
  const theme = useTheme();
  const { errorMessage, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

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
        </View>
      </View>
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
