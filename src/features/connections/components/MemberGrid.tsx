import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Icon, Text, useTheme } from "react-native-paper";

import { getMemberAvatarColor, getMemberInitial } from "@/features/connections/memberAvatar";
import { Connection } from "@/models/connection";
import { shape, spacing } from "@/theme/tokens";

interface MemberGridProps {
  connections: Connection[];
  emptyMessage?: string;
  errorMessage: string | null;
  contentTopPadding?: number;
  isInteractive?: boolean;
  isLoading: boolean;
  onScroll: (offsetY: number) => void;
  onToggleConnection?: (connection: Connection) => void;
  selectedConnectionIds?: string[];
  trailingAction?: {
    accessibilityLabel: string;
    label: string;
    onPress: () => void;
  };
}

interface PreventableEvent {
  preventDefault(): void;
}

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
  contentTopPadding = spacing.xs,
  emptyMessage = "No matching network members",
  errorMessage,
  isInteractive = true,
  isLoading,
  onScroll,
  onToggleConnection,
  selectedConnectionIds = [],
  trailingAction
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

  if (connections.length === 0 && !trailingAction) {
    return (
      <View style={styles.state}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: contentTopPadding }]}
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
      {gridIsMeasured ? connections.map((connection) => {
        const isSelected = selectedConnectionIdSet.has(connection.id);

        const content = (
          <>
            <View
              style={[
                styles.avatar,
                { backgroundColor: getMemberAvatarColor(connection.displayName) }
              ]}
            >
              <Text variant="titleSmall" style={styles.avatarText}>
                {getMemberInitial(connection.displayName)}
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
          </>
        );
        const itemStyle = [
          styles.item,
          { width: itemWidth },
          isSelected
            ? { backgroundColor: theme.colors.secondaryContainer }
            : undefined
        ];

        return isInteractive ? (
          <Pressable
            {...keepInputFocusedProps}
            key={connection.id}
            onPress={() => onToggleConnection?.(connection)}
            accessibilityLabel={`${isSelected ? "Remove" : "Add"} member ${connection.displayName}`}
            accessibilityRole="button"
            focusable={false}
            style={itemStyle}
          >
            {content}
          </Pressable>
        ) : (
          <View key={connection.id} style={itemStyle}>
            {content}
          </View>
        );
      }) : null}
      {gridIsMeasured && trailingAction ? (
        <Pressable
          key="member-grid-action"
          onPress={trailingAction.onPress}
          accessibilityLabel={trailingAction.accessibilityLabel}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.item,
            styles.actionItem,
            {
              width: itemWidth,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: pressed ? theme.colors.surfaceVariant : "transparent"
            }
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.colors.surfaceVariant }
            ]}
          >
            <Icon source="plus" size={24} color={theme.colors.onSurfaceVariant} />
          </View>
          <Text
            variant="labelMedium"
            numberOfLines={1}
            style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
          >
            {trailingAction.label}
          </Text>
        </Pressable>
      ) : null}
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
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs
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
  actionItem: {
    borderWidth: 1,
    borderStyle: "dashed"
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
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    maxWidth: 64,
    textAlign: "center"
  }
});
