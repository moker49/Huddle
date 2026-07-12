import { useLocalSearchParams } from "expo-router";

import { TopicDetailsScreen } from "@/features/topics/screens/TopicDetailsScreen";

export default function TopicDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <TopicDetailsScreen topicId={id} />;
}
