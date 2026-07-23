import { ReactNode } from "react";
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { MemberAvatar } from "@/components/MemberAvatar";
import { Connection } from "@/models/connection";
import { getConnectionDisplayName } from "@/models/connectionDisplay";
import { shape, spacing } from "@/theme/tokens";

interface MemberAvatarTileProps {
  connection: Connection;
  isInteractive?: boolean;
  isSelected: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

interface PreventableEvent {
  preventDefault(): void;
}

export const memberAvatarTile = {
  avatarSize: 48,
  minHeight: 84,
  width: 72
} as const;

const keepInputFocusedProps =
  Platform.OS === "web"
    ? {
        onMouseDown: (event: PreventableEvent) => event.preventDefault(),
        onPointerDown: (event: PreventableEvent) => event.preventDefault(),
        onTouchStart: (event: PreventableEvent) => event.preventDefault()
      }
    : undefined;

export function MemberAvatarTile({
  connection,
  isInteractive = true,
  isSelected,
  onPress,
  style
}: MemberAvatarTileProps) {
  const theme = useTheme();
  const displayName = getConnectionDisplayName(connection);
  const itemStyle = [
    styles.item,
    style,
    isSelected
      ? { backgroundColor: theme.colors.secondaryContainer }
      : undefined
  ];
  const content = (
    <MemberAvatarTileContent
      connection={connection}
      labelColor={isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurface}
    />
  );

  if (!isInteractive) {
    return (
      <View style={itemStyle}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      {...keepInputFocusedProps}
      onPress={onPress}
      accessibilityLabel={`${isSelected ? "Remove" : "Add"} member ${displayName}`}
      accessibilityRole="button"
      focusable={false}
      style={itemStyle}
    >
      {content}
    </Pressable>
  );
}

export function MemberAvatarTileContent({
  connection,
  labelColor
}: {
  connection: Connection;
  labelColor: string;
}) {
  const displayName = getConnectionDisplayName(connection);

  return (
    <>
      <MemberAvatar avatarUrl={connection.avatarUrl} label={displayName} size={memberAvatarTile.avatarSize} />
      <Text
        variant="labelMedium"
        numberOfLines={1}
        style={[styles.label, { color: labelColor }]}
      >
        {displayName}
      </Text>
    </>
  );
}

export function MemberCollectionState({
  children,
  color
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <View style={styles.state}>
      {typeof children === "string" ? (
        <Text variant="bodyMedium" style={color ? { color } : undefined}>
          {children}
        </Text>
      ) : children}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: memberAvatarTile.minHeight,
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
  label: {
    maxWidth: 64,
    textAlign: "center"
  }
});
