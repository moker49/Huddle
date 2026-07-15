import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { getMemberAvatarColor, getMemberInitial } from "@/features/connections/memberAvatar";
import { Connection } from "@/models/connection";
import { getConnectionDisplayName } from "@/models/connectionDisplay";
import { shape, spacing } from "@/theme/tokens";

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
        {connections.map((connection) => {
          const isSelected = selectedConnectionIdSet.has(connection.id);
          const displayName = getConnectionDisplayName(connection);

          return (
            <Pressable
              {...keepInputFocusedProps}
              key={connection.id}
              onPress={() => onToggleConnection(connection)}
              accessibilityLabel={`${isSelected ? "Remove" : "Add"} member ${displayName}`}
              accessibilityRole="button"
              focusable={false}
              style={[
                styles.item,
                isSelected
                  ? { backgroundColor: theme.colors.secondaryContainer }
                  : undefined
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: getMemberAvatarColor(displayName)
                  }
                ]}
              >
                <Text variant="titleSmall" style={styles.avatarText}>
                  {getMemberInitial(displayName)}
                </Text>
              </View>
              <Text
                variant="labelMedium"
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurface }
                ]}
              >
                {displayName}
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
    paddingTop: spacing.xxs,
    paddingBottom: spacing.sm
  },
  content: {
    gap: spacing.xxs
  },
  item: {
    width: 72,
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
    borderRadius: shape.medium,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xs
  },
  state: {
    minHeight: 104,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#FFFFFF"
  },
  label: {
    maxWidth: 64,
    textAlign: "center"
  }
});
