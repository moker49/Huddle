import { useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { IconButton, TextInput, useTheme } from "react-native-paper";

import { layout, spacing } from "@/theme/tokens";

interface MessageComposerProps {
  onSend: (body: string) => Promise<void>;
}

interface FocusHandle {
  focus(): void;
}

interface PreventableEvent {
  preventDefault(): void;
}

const composerLineHeight = 22;

const keepTextInputFocusedProps =
  Platform.OS === "web"
    ? {
        onMouseDown: (event: PreventableEvent) => event.preventDefault(),
        onPointerDown: (event: PreventableEvent) => event.preventDefault(),
        onTouchStart: (event: PreventableEvent) => event.preventDefault()
      }
    : undefined;

export function MessageComposer({ onSend }: MessageComposerProps) {
  const theme = useTheme();
  const inputRef = useRef<FocusHandle | null>(null);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const lineCount = Math.max(1, body.split(/\r\n|\r|\n/).length);
  const inputHeight =
    layout.composerControlSize + (lineCount - 1) * composerLineHeight;
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
          {...keepTextInputFocusedProps}
          icon="plus"
          size={24}
          onPress={() => undefined}
          accessibilityLabel="Attach file"
          focusable={false}
          iconColor={theme.colors.onSurfaceVariant}
          style={styles.attachmentButton}
        />
        <TextInput
          ref={(instance: FocusHandle | null) => {
            inputRef.current = instance;
          }}
          mode="flat"
          dense
          placeholder="Message..."
          value={body}
          onChangeText={setBody}
          multiline
          blurOnSubmit={false}
          accessibilityLabel="Message"
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          style={[styles.input, { height: inputHeight }]}
          contentStyle={styles.inputContent}
        />
      </View>
      <IconButton
        {...keepTextInputFocusedProps}
        mode="contained"
        icon="send"
        size={24}
        disabled={!canSend}
        loading={isSending}
        onPress={handleSend}
        accessibilityLabel="Send message"
        focusable={false}
        containerColor={canSend ? theme.colors.primary : theme.colors.surfaceVariant}
        iconColor={canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
        style={styles.sendButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  inputShell: {
    flex: 1,
    minHeight: layout.composerControlSize,
    borderRadius: layout.composerControlSize / 2,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: spacing.xxs
  },
  input: {
    flex: 1,
    backgroundColor: "transparent"
  },
  inputContent: {
    minHeight: layout.composerControlSize,
    lineHeight: composerLineHeight,
    paddingTop: (layout.composerControlSize - composerLineHeight) / 2,
    paddingBottom: (layout.composerControlSize - composerLineHeight) / 2,
    paddingLeft: spacing.xs,
    paddingRight: spacing.md
  },
  attachmentButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    marginTop: spacing.none,
    marginRight: spacing.none,
    marginBottom: spacing.xxs,
    marginLeft: spacing.none,
    backgroundColor: "transparent"
  },
  sendButton: {
    width: layout.composerControlSize,
    height: layout.composerControlSize,
    borderRadius: layout.composerControlSize / 2,
    margin: spacing.none
  }
});
