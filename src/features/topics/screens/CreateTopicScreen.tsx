import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Button, HelperText, Snackbar, TextInput, useTheme } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { useTopics } from "@/features/topics/TopicProvider";
import { layout, spacing } from "@/theme/tokens";

const maxNameLength = 80;

export function CreateTopicScreen() {
  const theme = useTheme();
  const { createTopic } = useTopics();
  const [name, setName] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const trimmedName = name.trim();
  const nameError = hasSubmitted && trimmedName.length === 0;
  const isOverNameLimit = name.length > maxNameLength;
  const canSubmit = trimmedName.length > 0 && !isOverNameLimit;

  async function handleSubmit() {
    setHasSubmitted(true);

    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const topic = await createTopic({ name });
      router.replace(`/topics/${topic.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Topic could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen title="Create topic" onBack={() => router.back()}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Topic name"
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="next"
            error={nameError || isOverNameLimit}
            maxLength={maxNameLength + 1}
            accessibilityLabel="Topic name"
          />
          <HelperText type={nameError || isOverNameLimit ? "error" : "info"} visible>
            {nameError
              ? "Topic name is required."
              : `${name.length}/${maxNameLength}`}
          </HelperText>

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
            Create topic
          </Button>
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
    paddingTop: spacing.sm,
    gap: spacing.xs
  },
  buttonContent: {
    minHeight: layout.minTouchTarget
  }
});
