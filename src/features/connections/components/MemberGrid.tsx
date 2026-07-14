import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { Connection } from "@/models/connection";
import { shape, spacing } from "@/theme/tokens";

interface MemberGridProps {
  connections: Connection[];
  errorMessage: string | null;
  isLoading: boolean;
  onScroll: (offsetY: number) => void;
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
const minItemWidth = 72;
const itemGap = spacing.xxs;

const keepInputFocusedProps =
  Platform.OS === "web"
    ? {
        onMouseDown: (event: PreventableEvent) => event.preventDefault(),
        onPointerDown: (event: PreventableEvent) => event.preventDefault(),
        onTouchStart: (event: PreventableEvent) => event.preventDefault()
      }
    : undefined;

export function MemberGrid({
  connections,
  errorMessage,
  isLoading,
  onScroll,
  onToggleConnection,
  selectedConnectionIds
}: MemberGridProps) {
  const theme = useTheme();
  const [gridWidth, setGridWidth] = useState(0);
  const selectedConnectionIdSet = new Set(selectedConnectionIds);
  const gridIsMeasured = gridWidth > 0;
  const itemWidth = getResponsiveItemWidth(gridWidth);

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
    <ScrollView
      style={styles.scroller}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;

        setGridWidth((currentWidth) => (
          currentWidth === nextWidth ? currentWidth : nextWidth
        ));
      }}
      onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {gridIsMeasured ? connections.map((connection, index) => {
        const isSelected = selectedConnectionIdSet.has(connection.id);

        return (
          <Pressable
            {...keepInputFocusedProps}
            key={connection.id}
            onPress={() => onToggleConnection(connection)}
            accessibilityLabel={`${isSelected ? "Remove" : "Add"} member ${connection.displayName}`}
            accessibilityRole="button"
            focusable={false}
            style={[
              styles.item,
              { width: itemWidth },
              isSelected
                ? { backgroundColor: theme.colors.secondaryContainer }
                : undefined
            ]}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: avatarColors[index % avatarColors.length] }
              ]}
            >
              <Text variant="titleSmall" style={styles.avatarText}>
                {connection.displayName.slice(0, 1).toLocaleUpperCase()}
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
              {connection.displayName}
            </Text>
          </Pressable>
        );
      }) : null}
    </ScrollView>
  );
}

function getResponsiveItemWidth(gridWidth: number) {
  if (gridWidth <= 0) {
    return minItemWidth;
  }

  const columnCount = Math.max(
    1,
    Math.floor((gridWidth + itemGap) / (minItemWidth + itemGap))
  );

  return (gridWidth - itemGap * (columnCount - 1)) / columnCount;
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1
  },
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
    paddingTop: spacing.xs,
    paddingBottom: 96
  },
  item: {
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
    borderRadius: shape.medium,
    paddingHorizontal: spacing.xxs,
    paddingVertical: spacing.xs
  },
  state: {
    flex: 1,
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
