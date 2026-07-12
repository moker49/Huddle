import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { IconButton, TextInput, useTheme } from "react-native-paper";

import { layout, spacing } from "@/theme/tokens";

interface MessageComposerProps {
  onSend: (body: string) => Promise<void>;
}

export function MessageComposer({ onSend }: MessageComposerProps) {
  const theme = useTheme();
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const canSend = body.trim().length > 0 && !isSending;

  async function handleSend() {
    if (!canSend) {
      return;
    }

    const nextBody = body;
    setIsSending(true);

    try {
      await onSend(nextBody);
      setBody("");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background
          }
        ]}
      >
        <View
          style={[
            styles.inputShell,
            {
              backgroundColor: theme.colors.surfaceVariant
            }
          ]}
        >
          <IconButton
            icon="plus"
            size={24}
            onPress={() => undefined}
            accessibilityLabel="Attach file"
            style={styles.attachmentButton}
          />
          <TextInput
            mode="flat"
            placeholder="Message..."
            value={body}
            onChangeText={setBody}
            accessibilityLabel="Message"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            style={styles.input}
            contentStyle={styles.inputContent}
          />
        </View>
        <IconButton
          mode="contained"
          icon="send"
          size={24}
          disabled={!canSend}
          loading={isSending}
          onPress={handleSend}
          accessibilityLabel="Send message"
          style={styles.sendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  inputShell: {
    flex: 1,
    minHeight: layout.composerControlSize,
    borderRadius: layout.composerControlSize / 2,
    overflow: "hidden",
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.xxs
  },
  input: {
    flex: 1,
    backgroundColor: "transparent"
  },
  inputContent: {
    minHeight: layout.composerControlSize,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md
  },
  attachmentButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    margin: spacing.none,
    backgroundColor: "transparent"
  },
  sendButton: {
    width: layout.composerControlSize,
    height: layout.composerControlSize,
    borderRadius: layout.composerControlSize / 2,
    margin: spacing.none
  }
});
