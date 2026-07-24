import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Icon, Text } from "react-native-paper";

interface HuddleIconProps {
  icon?: string;
  label: string;
  size: number;
  backgroundColor: string;
  color: string;
  style?: StyleProp<ViewStyle>;
}

export function HuddleIcon({
  icon,
  label,
  size,
  backgroundColor,
  color,
  style
}: HuddleIconProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius: size <= 40 ? 8 : size / 2,
          backgroundColor
        },
        style
      ]}
    >
      {icon ? (
        <Icon source={icon} size={Math.round(size * 0.52)} color={color} />
      ) : (
        <Text variant="titleSmall" style={{ color }}>
          {label.slice(0, 1).toLocaleUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    justifyContent: "center"
  }
});
