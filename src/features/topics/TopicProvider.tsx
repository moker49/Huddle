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
  abandonedTopics: Topic[];
  abandonedErrorMessage: string | null;
  areAbandonedTopicsLoading: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  lastCreatedTopicId: string | null;
  reloadTopics(): Promise<void>;
  reloadAbandonedTopics(): Promise<void>;
  createTopic(input: CreateTopicInput): Promise<Topic>;
  updateTopic(id: string, input: UpdateTopicInput): Promise<Topic>;
  leaveTopic(id: string): Promise<void>;
  rejoinTopic(id: string): Promise<void>;
  deleteTopic(id: string): Promise<void>;
  setTopicPinned(id: string, isPinned: boolean): Promise<void>;
  setPinnedMessage(topicId: string, messageId?: string): Promise<void>;
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
  const [abandonedTopics, setAbandonedTopics] = useState<Topic[]>([]);
  const [areAbandonedTopicsLoading, setAreAbandonedTopicsLoading] = useState(false);
  const [abandonedErrorMessage, setAbandonedErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedTopicId, setLastCreatedTopicId] = useState<string | null>(null);
  const topicReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedTopicsRef = useRef(false);
  const hasLoadedAbandonedTopicsRef = useRef(false);

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

  const loadAbandonedTopics = useCallback(async () => {
    setAreAbandonedTopicsLoading(true);

    try {
      setAbandonedTopics(await service.listAbandonedTopics());
      setAbandonedErrorMessage(null);
      hasLoadedAbandonedTopicsRef.current = true;
    } catch {
      setAbandonedErrorMessage("Abandoned huddles could not be loaded.");
    } finally {
      setAreAbandonedTopicsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    service.setAccountScope(session?.user.id ?? null);

    if (!session) {
      setTopics([]);
      setAbandonedTopics([]);
      setErrorMessage(null);
      setAbandonedErrorMessage(null);
      setIsLoading(false);
      hasLoadedTopicsRef.current = false;
      hasLoadedAbandonedTopicsRef.current = false;
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

        if (hasLoadedAbandonedTopicsRef.current) {
          void loadAbandonedTopics();
        }
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
  }, [loadAbandonedTopics, loadTopics, service, session]);

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
      abandonedTopics,
      abandonedErrorMessage,
      areAbandonedTopicsLoading,
      isLoading,
      errorMessage,
      lastCreatedTopicId,
      reloadTopics: loadTopics,
      reloadAbandonedTopics: loadAbandonedTopics,
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
      async setTopicPinned(id, isPinned) {
        await service.setTopicPinned(id, isPinned);
        setTopics(await service.listTopics());
      },
      async setPinnedMessage(topicId, messageId) {
        await service.setPinnedMessage(topicId, messageId);
        setTopics(await service.listTopics());
      },
      async leaveTopic(id) {
        await service.leaveTopic(id);
        setTopics(await service.listTopics());
        if (hasLoadedAbandonedTopicsRef.current) {
          setAbandonedTopics(await service.listAbandonedTopics());
        }
      },
      async rejoinTopic(id) {
        await service.rejoinTopic(id);
        setTopics(await service.listTopics());
        setAbandonedTopics((currentTopics) => currentTopics.filter((topic) => topic.id !== id));
      },
      markTopicRead,
      getTopic(id) {
        return topics.find((topic) => topic.id === id);
      }
    }),
    [
      abandonedErrorMessage,
      abandonedTopics,
      areAbandonedTopicsLoading,
      errorMessage,
      isLoading,
      lastCreatedTopicId,
      loadAbandonedTopics,
      loadTopics,
      markTopicRead,
      service,
      topics
    ]
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
