import { useState } from "react";
import {
  KeyboardTypeOptions,
  Platform,
  StyleSheet,
  TextInput as NativeTextInput,
  View
} from "react-native";
import { Text, useTheme } from "react-native-paper";

import { spacing } from "@/theme/tokens";

interface AffixTextFieldProps {
  accessibilityLabel: string;
  affix: string;
  autoFocus?: boolean;
  containerColor: string;
  error?: boolean;
  keyboardType?: KeyboardTypeOptions;
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}

export function AffixTextField({
  accessibilityLabel,
  affix,
  autoFocus = false,
  containerColor,
  error = false,
  keyboardType,
  label,
  onChangeText,
  value
}: AffixTextFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const outlineColor = error
    ? theme.colors.error
    : isFocused
      ? theme.colors.primary
      : theme.colors.outline;
  const labelColor = error
    ? theme.colors.error
    : isFocused
      ? theme.colors.primary
      : theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: outlineColor,
          borderWidth: isFocused || error ? 2 : 1
        }
      ]}
    >
      <Text
        variant="bodySmall"
        style={[
          styles.label,
          {
            backgroundColor: containerColor,
            color: labelColor
          }
        ]}
      >
        {label}
      </Text>
      <View style={styles.inputRow}>
        <Text
          variant="bodyLarge"
          style={[styles.affix, { color: theme.colors.onSurfaceVariant }]}
        >
          {affix}
        </Text>
        <NativeTextInput
          accessibilityLabel={accessibilityLabel}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          keyboardType={keyboardType}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          selectionColor={theme.colors.primary}
          style={[
            styles.input,
            webInputFocusReset,
            { color: theme.colors.onSurface }
          ]}
          value={value}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    borderRadius: 4,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  label: {
    position: "absolute",
    top: -9,
    left: spacing.sm,
    paddingHorizontal: spacing.xxs
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  affix: {
    marginRight: spacing.none
  },
  input: {
    flex: 1,
    minHeight: 48,
    padding: 0,
    fontSize: 16
  }
});

const webInputFocusReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as object)
  : undefined;
