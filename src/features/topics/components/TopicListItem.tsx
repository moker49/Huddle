import { Pressable, StyleSheet, View } from "react-native";
import { Badge, Text, useTheme } from "react-native-paper";

import { Topic } from "@/models/topic";
import { HuddleIcon } from "@/features/topics/components/HuddleIcon";
import { layout, shape, spacing } from "@/theme/tokens";

type TopicListItemPosition = "single" | "first" | "middle" | "last";

interface TopicListItemProps {
  topic: Topic;
  memberSummary?: string;
  position: TopicListItemPosition;
  onPress: () => void;
}

const outerCardRadius = shape.large;
const innerCardRadius = spacing.xxs;

export function TopicListItem({
  topic,
  memberSummary,
  position,
  onPress
}: TopicListItemProps) {
  const theme = useTheme();
  const autoArchiveDate = formatAutoArchiveDate(topic.autoArchiveAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Open huddle ${topic.title}`}
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
      <HuddleIcon
        icon={topic.icon}
        label={topic.title}
        size={48}
        backgroundColor={theme.colors.primaryContainer}
        color={theme.colors.onPrimaryContainer}
        style={styles.thumbnail}
      />
      <View style={styles.copy}>
        <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {topic.title}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={[styles.members, { color: theme.colors.onSurfaceVariant }]}
        >
          {memberSummary}
        </Text>
      </View>
      {autoArchiveDate || topic.unreadCount ? (
        <View style={styles.trailing}>
          {autoArchiveDate ? (
            <Text
              variant="labelMedium"
              numberOfLines={1}
              style={[styles.expiryDate, { color: theme.colors.onSurfaceVariant }]}
            >
              {autoArchiveDate}
            </Text>
          ) : null}
          {topic.unreadCount ? (
            <Badge
              size={20}
              accessibilityLabel={`${topic.unreadCount} unread messages`}
              style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary }}
            >
              {formatUnreadCount(topic.unreadCount)}
            </Badge>
          ) : null}
        </View>
      ) : null}
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

function formatAutoArchiveDate(autoArchiveAt: string | undefined) {
  if (!autoArchiveAt) {
    return "";
  }

  const date = new Date(autoArchiveAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  }).format(date);
}

function formatUnreadCount(unreadCount: number) {
  return unreadCount > 99 ? "99+" : String(unreadCount);
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
  trailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
    minWidth: layout.appBarActionSize
  },
  expiryDate: {
    textAlign: "right"
  }
});
