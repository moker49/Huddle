import { useLocalSearchParams } from "expo-router";

import { TopicSettingsScreen } from "@/features/topics/screens/TopicSettingsScreen";

export default function TopicSettingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <TopicSettingsScreen topicId={id} />;
}
