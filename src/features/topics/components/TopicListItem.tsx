import { List } from "react-native-paper";

import { Topic } from "@/models/topic";

interface TopicListItemProps {
  topic: Topic;
  connectionSummary?: string;
  onPress: () => void;
}

export function TopicListItem({ topic, connectionSummary, onPress }: TopicListItemProps) {
  return (
    <List.Item
      title={topic.name}
      description={connectionSummary}
      left={(props) => <List.Icon {...props} icon="forum-outline" />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={onPress}
      accessibilityLabel={`Open huddle ${topic.name}`}
    />
  );
}
