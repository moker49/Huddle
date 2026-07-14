import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { Topic } from "@/models/topic";
import { layout, shape, spacing } from "@/theme/tokens";

type TopicListItemPosition = "single" | "first" | "middle" | "last";

interface TopicListItemProps {
  topic: Topic;
  memberSummary?: string;
  position: TopicListItemPosition;
  onPress: () => void;
}

const placeholderExpiryDays = 30;
const outerCardRadius = shape.large;
const innerCardRadius = spacing.xxs;

export function TopicListItem({
  topic,
  memberSummary,
  position,
  onPress
}: TopicListItemProps) {
  const theme = useTheme();
  const expiresAt = getPlaceholderExpiryDate(topic.createdAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Open huddle ${topic.name}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        getCardCornerStyle(position),
        {
          backgroundColor: theme.colors.elevation.level2,
          opacity: pressed ? 0.88 : 1
        }
      ]}
    >
      <View style={[styles.thumbnail, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
          {topic.name.slice(0, 1).toLocaleUpperCase()}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {topic.name}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[styles.members, { color: theme.colors.onSurfaceVariant }]}
        >
          {memberSummary}
        </Text>
      </View>
      <Text
        variant="labelMedium"
        numberOfLines={1}
        style={[styles.expiryDate, { color: theme.colors.onSurfaceVariant }]}
      >
        {expiresAt}
      </Text>
    </Pressable>
  );
}

function getCardCornerStyle(position: TopicListItemPosition) {
  switch (position) {
    case "single":
      return styles.singleCard;
    case "first":
      return styles.firstCard;
    case "last":
      return styles.lastCard;
    case "middle":
      return styles.middleCard;
  }
}

function getPlaceholderExpiryDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Auto";
  }

  date.setDate(date.getDate() + placeholderExpiryDays);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

const styles = StyleSheet.create({
  card: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  singleCard: {
    borderRadius: outerCardRadius
  },
  firstCard: {
    borderTopLeftRadius: outerCardRadius,
    borderTopRightRadius: outerCardRadius,
    borderBottomLeftRadius: innerCardRadius,
    borderBottomRightRadius: innerCardRadius
  },
  middleCard: {
    borderRadius: innerCardRadius
  },
  lastCard: {
    borderTopLeftRadius: innerCardRadius,
    borderTopRightRadius: innerCardRadius,
    borderBottomLeftRadius: outerCardRadius,
    borderBottomRightRadius: outerCardRadius
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: shape.compact,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  members: {
    marginTop: spacing.xxs
  },
  expiryDate: {
    minWidth: layout.appBarActionSize,
    textAlign: "right"
  }
});
