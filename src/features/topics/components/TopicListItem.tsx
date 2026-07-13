import { List } from "react-native-paper";

import { Topic } from "@/models/topic";

interface TopicListItemProps {
  topic: Topic;
  memberSummary?: string;
  onPress: () => void;
}

export function TopicListItem({ topic, memberSummary, onPress }: TopicListItemProps) {
  return (
    <List.Item
      title={topic.name}
      description={memberSummary}
      left={(props) => <List.Icon {...props} icon="forum-outline" />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={onPress}
      accessibilityLabel={`Open huddle ${topic.name}`}
    />
  );
}
