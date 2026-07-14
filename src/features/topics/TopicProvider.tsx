import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { CreateTopicInput, Topic, UpdateTopicInput } from "@/models/topic";
import { TopicService, topicService } from "@/services/topicService";

interface TopicContextValue {
  topics: Topic[];
  isLoading: boolean;
  errorMessage: string | null;
  lastCreatedTopicId: string | null;
  reloadTopics(): Promise<void>;
  createTopic(input: CreateTopicInput): Promise<Topic>;
  updateTopic(id: string, input: UpdateTopicInput): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;
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
  const [lastCreatedTopicId, setLastCreatedTopicId] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    setIsLoading(true);

    try {
      setTopics(await service.listTopics());
      setErrorMessage(null);
    } catch {
      setErrorMessage("Huddles could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
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
          setErrorMessage("Huddles could not be loaded.");
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
      lastCreatedTopicId,
      reloadTopics: loadTopics,
      async createTopic(input) {
        const topic = await service.createTopic(input);
        setTopics(await service.listTopics());
        setLastCreatedTopicId(topic.id);
        return topic;
      },
      async updateTopic(id, input) {
        const topic = await service.updateTopic(id, input);
        setTopics(await service.listTopics());
        return topic;
      },
      async deleteTopic(id) {
        await service.deleteTopic(id);
        setTopics(await service.listTopics());
      },
      getTopic(id) {
        return topics.find((topic) => topic.id === id);
      }
    }),
    [errorMessage, isLoading, lastCreatedTopicId, loadTopics, service, topics]
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
