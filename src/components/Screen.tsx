import { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Appbar, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTopBar } from "@/components/AppTopBar";
import { layout, spacing } from "@/theme/tokens";

interface ScreenProps extends PropsWithChildren {
  title: ReactNode;
  onBack?: () => void;
  navigation?: ReactNode;
  action?: ReactNode;
  scroll?: boolean;
}

export function Screen({
  title,
  onBack,
  navigation,
  action,
  scroll = true,
  children
}: ScreenProps) {
  const theme = useTheme();
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <AppTopBar
        navigation={
          onBack ? (
            <Appbar.Action
              icon="arrow-left"
              onPress={onBack}
              accessibilityLabel="Go back"
            />
          ) : (
            navigation
          )
        }
        title={title}
        action={action}
      />
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg
  }
});
