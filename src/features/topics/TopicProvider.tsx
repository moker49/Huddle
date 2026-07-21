import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { CreateTopicInput, Topic, UpdateTopicInput } from "@/models/topic";
import { useAuth } from "@/features/auth/AuthProvider";
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
  markTopicRead(id: string): Promise<void>;
  getTopic(id: string): Topic | undefined;
}

const TopicContext = createContext<TopicContextValue | null>(null);

interface TopicProviderProps extends PropsWithChildren {
  service?: TopicService;
}

export function TopicProvider({ children, service = topicService }: TopicProviderProps) {
  const { session } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedTopicId, setLastCreatedTopicId] = useState<string | null>(null);
  const topicReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedTopicsRef = useRef(false);

  const loadTopics = useCallback(async () => {
    const shouldShowInitialLoading = !hasLoadedTopicsRef.current;

    if (shouldShowInitialLoading) {
      setIsLoading(true);
    }

    try {
      setTopics(await service.listTopics());
      setErrorMessage(null);
      hasLoadedTopicsRef.current = true;
    } catch {
      setErrorMessage("Huddles could not be loaded.");
    } finally {
      if (shouldShowInitialLoading) {
        setIsLoading(false);
      }
    }
  }, [service]);

  useEffect(() => {
    service.setAccountScope(session?.user.id ?? null);

    if (!session) {
      setTopics([]);
      setErrorMessage(null);
      setIsLoading(false);
      hasLoadedTopicsRef.current = false;
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    service
      .listTopics()
      .then((nextTopics) => {
        if (isMounted) {
          setTopics(nextTopics);
          setErrorMessage(null);
          hasLoadedTopicsRef.current = true;
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
  }, [service, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isActive = true;
    let unsubscribe: () => void = () => undefined;

    const scheduleReload = () => {
      if (topicReloadTimeoutRef.current) {
        clearTimeout(topicReloadTimeoutRef.current);
      }

      topicReloadTimeoutRef.current = setTimeout(() => {
        topicReloadTimeoutRef.current = null;
        void loadTopics();
      }, 100);
    };

    void service.subscribeToTopicChanges(scheduleReload).then((nextUnsubscribe) => {
      if (isActive) {
        unsubscribe = nextUnsubscribe;
      } else {
        nextUnsubscribe();
      }
    });

    return () => {
      isActive = false;
      unsubscribe();

      if (topicReloadTimeoutRef.current) {
        clearTimeout(topicReloadTimeoutRef.current);
        topicReloadTimeoutRef.current = null;
      }
    };
  }, [loadTopics, service, session]);

  const markTopicRead = useCallback(
    async (id: string) => {
      await service.markTopicRead(id);
      await loadTopics();
    },
    [loadTopics, service]
  );

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
      markTopicRead,
      getTopic(id) {
        return topics.find((topic) => topic.id === id);
      }
    }),
    [errorMessage, isLoading, lastCreatedTopicId, loadTopics, markTopicRead, service, topics]
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
