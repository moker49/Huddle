import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { CreateTopicInput, Topic } from "@/models/topic";
import { TopicService, topicService } from "@/services/topicService";

interface TopicContextValue {
  topics: Topic[];
  isLoading: boolean;
  errorMessage: string | null;
  createTopic(input: CreateTopicInput): Promise<Topic>;
  getTopic(id: string): Topic | undefined;
}

const TopicContext = createContext<TopicContextValue | null>(null);

interface TopicProviderProps extends PropsWithChildren {
  service?: TopicService;
}

export function TopicProvider({ children, service = topicService }: TopicProviderProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    service
      .listTopics()
      .then((nextTopics) => {
        if (isMounted) {
          setTopics(nextTopics);
          setErrorMessage(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setErrorMessage("Topics could not be loaded.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [service]);

  const value = useMemo<TopicContextValue>(
    () => ({
      topics,
      isLoading,
      errorMessage,
      async createTopic(input) {
        const topic = await service.createTopic(input);
        setTopics(await service.listTopics());
        return topic;
      },
      getTopic(id) {
        return topics.find((topic) => topic.id === id);
      }
    }),
    [errorMessage, isLoading, service, topics]
  );

  return <TopicContext.Provider value={value}>{children}</TopicContext.Provider>;
}

export function useTopics() {
  const context = useContext(TopicContext);

  if (!context) {
    throw new Error("useTopics must be used inside TopicProvider.");
  }

  return context;
}
