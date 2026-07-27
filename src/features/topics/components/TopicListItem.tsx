import { Pressable, StyleSheet, View } from "react-native";
import { Badge, Icon, Text, useTheme } from "react-native-paper";

import { Topic } from "@/models/topic";
import { HuddleIcon } from "@/features/topics/components/HuddleIcon";
import { layout, shape, spacing } from "@/theme/tokens";

type TopicListItemPosition = "single" | "first" | "middle" | "last";

interface TopicListItemProps {
  topic: Topic;
  memberSummary?: string;
  mutedIcon?: boolean;
  position: TopicListItemPosition;
  showUnreadCount?: boolean;
  onPress: () => void;
  onLongPress?: (topic: Topic) => void;
}

const outerCardRadius = shape.large;
const innerCardRadius = spacing.xxs;

export function TopicListItem({
  topic,
  memberSummary,
  mutedIcon = false,
  position,
  showUnreadCount = true,
  onPress,
  onLongPress
}: TopicListItemProps) {
  const theme = useTheme();
  const autoArchiveDate = formatAutoArchiveDate(topic.autoArchiveAt);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress ? () => onLongPress(topic) : undefined}
      delayLongPress={180}
      accessibilityLabel={`Open huddle ${topic.title}`}
      accessibilityRole="button"
      accessibilityHint={onLongPress ? "Hold for huddle options" : undefined}
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
        backgroundColor={mutedIcon ? theme.colors.surfaceVariant : theme.colors.primaryContainer}
        color={mutedIcon ? theme.colors.onSurfaceVariant : theme.colors.onPrimaryContainer}
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
      {autoArchiveDate || (showUnreadCount && topic.unreadCount) || topic.isPinned ? (
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
          {showUnreadCount && topic.unreadCount ? (
            <Badge
              size={20}
              accessibilityLabel={`${topic.unreadCount} unread messages`}
              style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary }}
            >
              {formatUnreadCount(topic.unreadCount)}
            </Badge>
          ) : topic.isPinned ? (
            <Icon source="pin" size={18} color={theme.colors.onSurfaceVariant} />
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
