import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Icon, Text, useTheme } from "react-native-paper";

import {
  MemberAvatarTile,
  MemberCollectionState,
  memberAvatarTile
} from "@/features/connections/components/MemberAvatarTile";
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

const minItemWidth = memberAvatarTile.width;
const itemGap = spacing.xxs;

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
      <MemberCollectionState>
        <ActivityIndicator accessibilityLabel="Loading network" />
      </MemberCollectionState>
    );
  }

  if (errorMessage) {
    return (
      <MemberCollectionState color={theme.colors.error}>
        {errorMessage}
      </MemberCollectionState>
    );
  }

  if (connections.length === 0 && !trailingAction) {
    return (
      <MemberCollectionState color={theme.colors.onSurfaceVariant}>
        {emptyMessage}
      </MemberCollectionState>
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

        return (
          <MemberAvatarTile
            key={connection.id}
            connection={connection}
            isInteractive={isInteractive}
            isSelected={isSelected}
            onPress={() => onToggleConnection?.(connection)}
            style={{ width: itemWidth }}
          />
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
    minHeight: memberAvatarTile.minHeight,
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
  actionIcon: {
    width: memberAvatarTile.avatarSize,
    height: memberAvatarTile.avatarSize,
    borderRadius: memberAvatarTile.avatarSize / 2,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    maxWidth: 64,
    textAlign: "center"
  }
});
