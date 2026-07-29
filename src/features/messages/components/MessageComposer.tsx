import { memo, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { IconButton, Text, TextInput, useTheme } from "react-native-paper";

import { layout, spacing } from "@/theme/tokens";

interface MessageComposerProps {
  onSend: (body: string) => Promise<void>;
  onChangeText: (body: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  value: string;
  disabled?: boolean;
  context?: ComposerContext;
}

interface ComposerContext {
  id: string;
  label: string;
  detail?: string;
  mode: "edit" | "reply";
  errorMessage?: string;
  onDismiss(): void;
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

export const MessageComposer = memo(function MessageComposer({
  onSend,
  onChangeText,
  onFocus,
  onBlur,
  value,
  disabled = false,
  context
}: MessageComposerProps) {
  const theme = useTheme();
  const inputRef = useRef<FocusHandle | null>(null);
  const [isSending, setIsSending] = useState(false);
  const lineCount = Math.max(1, value.split(/\r\n|\r|\n/).length);
  const inputHeight =
    layout.composerControlSize + (lineCount - 1) * composerLineHeight;
  const canSend = value.trim().length > 0 && !disabled;

  useEffect(() => {
    if (!context?.id) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(animationFrame);
  }, [context?.id]);

  async function handleSend() {
    if (!canSend || isSending) {
      return;
    }

    const nextBody = value;
    setIsSending(true);

    try {
      await onSend(nextBody);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background
        }
      ]}
    >
      {context ? (
        <View
          style={[
            styles.contextBar,
            { backgroundColor: theme.colors.elevation.level1 }
          ]}
        >
          <IconButton
            {...keepTextInputFocusedProps}
            icon="close"
            size={20}
            onPress={context.onDismiss}
            accessibilityLabel={`Stop ${context.label.toLowerCase()}`}
            focusable={false}
            iconColor={theme.colors.onSurfaceVariant}
            style={styles.contextDismissButton}
          />
          <Text
            variant="labelLarge"
            numberOfLines={1}
            style={styles.contextLabel}
          >
            {context.errorMessage ? (
              <Text style={{ color: theme.colors.error }}>{context.errorMessage}</Text>
            ) : (
              <>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>{context.label}</Text>
                {context.detail ? (
                  <Text style={{ color: theme.colors.onSurface }}>{context.detail}</Text>
                ) : null}
              </>
            )}
          </Text>
        </View>
      ) : null}
      <View style={styles.container}>
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
            placeholder={context?.mode === "edit" ? "Edit message..." : "Message..."}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            disabled={disabled}
            multiline
            blurOnSubmit={false}
            accessibilityLabel={context?.mode === "edit" ? "Edit message" : "Message"}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={[styles.input, { height: inputHeight }]}
            contentStyle={styles.inputContent}
            right={
              value ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => onChangeText("")}
                  accessibilityLabel="Clear message"
                  forceTextInputFocus={false}
                />
              ) : undefined
            }
          />
        </View>
        <IconButton
          {...keepTextInputFocusedProps}
          mode="contained"
          icon="send"
          size={24}
          disabled={!canSend}
          onPress={handleSend}
          accessibilityLabel={context ? "Save message changes" : "Send message"}
          focusable={false}
          containerColor={canSend ? theme.colors.primaryContainer : theme.colors.surfaceVariant}
          iconColor={canSend ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
          style={styles.sendButton}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  contextBar: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -spacing.lg,
    paddingRight: spacing.lg
  },
  contextDismissButton: {
    width: 40,
    height: 40,
    margin: spacing.none,
    marginLeft: spacing.sm,
    marginRight: spacing.xs
  },
  contextLabel: {
    flex: 1
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs
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
