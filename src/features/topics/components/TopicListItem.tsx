import { List } from "react-native-paper";

import { Topic } from "@/models/topic";

interface TopicListItemProps {
  topic: Topic;
  onPress: () => void;
}

export function TopicListItem({ topic, onPress }: TopicListItemProps) {
  return (
    <List.Item
      title={topic.name}
      left={(props) => <List.Icon {...props} icon="forum-outline" />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={onPress}
      accessibilityLabel={`Open topic ${topic.name}`}
    />
  );
}
