import { ReactNode } from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
  ViewStyle
} from "react-native";
import { Icon, IconButton, useTheme } from "react-native-paper";

import { shape, spacing } from "@/theme/tokens";
import { preserveFocusOnPressStart } from "@/utils/preserveFocusOnPressStart";

interface NetworkMemberSectionProps {
  children: ReactNode;
  searchHasError?: boolean;
  searchValue: string;
  searchVisible: boolean;
  onChangeSearch: (value: string) => void;
  onClearSearch: () => void;
  style?: StyleProp<ViewStyle>;
}

export function NetworkMemberSection({
  children,
  searchHasError = false,
  searchValue,
  searchVisible,
  onChangeSearch,
  onClearSearch,
  style
}: NetworkMemberSectionProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        style,
        { backgroundColor: theme.colors.elevation.level2 }
      ]}
    >
      {searchVisible ? (
        <View style={[styles.searchShell, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon
            source="magnify"
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
          <NativeTextInput
            value={searchValue}
            onChangeText={onChangeSearch}
            placeholder="Search your network"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            autoCapitalize="words"
            accessibilityLabel="Search your network"
            style={[
              styles.search,
              webInputFocusReset,
              { color: theme.colors.onSurface },
              searchHasError ? { color: theme.colors.error } : undefined
            ]}
          />
          {searchValue ? (
            <IconButton
              {...preserveFocusOnPressStart}
              icon="close"
              size={24}
              onPress={onClearSearch}
              accessibilityLabel="Clear network search"
              focusable={false}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.clear}
            />
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export const networkMemberSectionStyles = StyleSheet.create({
  lastCard: {
    borderTopLeftRadius: spacing.xxs,
    borderTopRightRadius: spacing.xxs,
    borderBottomLeftRadius: shape.large,
    borderBottomRightRadius: shape.large
  }
});

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.xs
  },
  searchShell: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingLeft: spacing.md,
    overflow: "hidden"
  },
  search: {
    flex: 1,
    height: 56,
    padding: spacing.none,
    fontSize: 16,
    backgroundColor: "transparent"
  },
  clear: {
    width: 48,
    height: 48,
    margin: spacing.none
  }
});

const webInputFocusReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as object)
  : undefined;
