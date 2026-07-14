import { Pressable, StyleSheet } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

interface HuddleFabProps {
  disabled?: boolean;
  extended: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  visible: boolean;
  accessibilityLabel?: string;
}

const fabSize = 56;
const iconSize = 24;

export function HuddleFab({
  disabled = false,
  extended,
  icon,
  label,
  onPress,
  visible,
  accessibilityLabel = label
}: HuddleFabProps) {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  const foregroundColor = disabled ? theme.colors.onSurfaceDisabled : theme.colors.onPrimaryContainer;
  const backgroundColor = disabled ? theme.colors.surfaceDisabled : theme.colors.primaryContainer;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        extended ? styles.extendedFab : styles.iconFab,
        {
          backgroundColor,
          opacity: pressed ? 0.88 : 1
        }
      ]}
    >
      <Icon source={icon} size={iconSize} color={foregroundColor} />
      {extended ? (
        <Text variant="labelLarge" numberOfLines={1} style={{ color: foregroundColor }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    minHeight: fabSize,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 3
  },
  iconFab: {
    width: fabSize,
    height: fabSize
  },
  extendedFab: {
    height: fabSize,
    paddingLeft: 16,
    paddingRight: 20,
    gap: 12
  }
});
