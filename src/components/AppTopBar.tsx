import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Appbar, useTheme } from "react-native-paper";

import { layout, spacing } from "@/theme/tokens";

interface AppTopBarProps {
  title?: ReactNode;
  navigation?: ReactNode;
  action?: ReactNode;
}

export function AppTopBar({ title, navigation, action }: AppTopBarProps) {
  const theme = useTheme();

  return (
    <Appbar.Header
      mode="small"
      elevated={false}
      style={[styles.header, { backgroundColor: theme.colors.background }]}
    >
      {navigation}
      <Appbar.Content title={title} />
      {action ?? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.actionSpacer}
        />
      )}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: layout.appBarHeight
  },
  actionSpacer: {
    width: layout.appBarActionSize,
    height: layout.appBarActionSize,
    marginLeft: spacing.xs - spacing.xxs,
    marginRight: spacing.sm - spacing.xxs
  }
});
