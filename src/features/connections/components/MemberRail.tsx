import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { Connection } from "@/models/connection";
import { spacing } from "@/theme/tokens";

interface MemberRailProps {
  connections: Connection[];
  errorMessage: string | null;
  isLoading: boolean;
  onToggleConnection: (connection: Connection) => void;
  selectedConnectionIds: string[];
}

interface PreventableEvent {
  preventDefault(): void;
}

const avatarColors = [
  "#6D8F6F",
  "#8D6E63",
  "#6C7EA6",
  "#A56C82",
  "#8A7C5A",
  "#5F8E95"
] as const;

const keepInputFocusedProps =
  Platform.OS === "web"
    ? {
        onMouseDown: (event: PreventableEvent) => event.preventDefault(),
        onPointerDown: (event: PreventableEvent) => event.preventDefault(),
        onTouchStart: (event: PreventableEvent) => event.preventDefault()
      }
    : undefined;

export function MemberRail({
  connections,
  errorMessage,
  isLoading,
  onToggleConnection,
  selectedConnectionIds
}: MemberRailProps) {
  const theme = useTheme();
  const selectedConnectionIdSet = new Set(selectedConnectionIds);

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator accessibilityLabel="Loading network" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.state}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          {errorMessage}
        </Text>
      </View>
    );
  }

  if (connections.length === 0) {
    return (
      <View style={styles.state}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No matching network members
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.area}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {connections.map((connection, index) => {
          const isSelected = selectedConnectionIdSet.has(connection.id);

          return (
            <Pressable
              {...keepInputFocusedProps}
              key={connection.id}
              onPress={() => onToggleConnection(connection)}
              accessibilityLabel={`${isSelected ? "Remove" : "Add"} member ${connection.displayName}`}
              accessibilityRole="button"
              focusable={false}
              style={styles.item}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: avatarColors[index % avatarColors.length],
                    borderColor: isSelected ? theme.colors.primary : "transparent"
                  }
                ]}
              >
                <Text variant="titleMedium" style={styles.avatarText}>
                  {connection.displayName.slice(0, 1).toLocaleUpperCase()}
                </Text>
              </View>
              <Text
                variant="labelLarge"
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: isSelected ? theme.colors.primary : theme.colors.onSurface }
                ]}
              >
                {connection.displayName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md
  },
  item: {
    width: 72,
    alignItems: "center",
    gap: spacing.xs
  },
  state: {
    minHeight: 104,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#FFFFFF"
  },
  label: {
    maxWidth: 72,
    textAlign: "center"
  }
});
