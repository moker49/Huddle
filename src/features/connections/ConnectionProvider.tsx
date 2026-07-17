import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { Connection } from "@/models/connection";
import { ConnectionService, connectionService } from "@/services/connectionService";
import { useAuth } from "@/features/auth/AuthProvider";

interface ConnectionContextValue {
  connections: Connection[];
  isLoading: boolean;
  errorMessage: string | null;
  addConnection(identifier: string): Promise<Connection>;
  reloadConnections(): Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

interface ConnectionProviderProps extends PropsWithChildren {
  service?: ConnectionService;
}

export function ConnectionProvider({
  children,
  service = connectionService
}: ConnectionProviderProps) {
  const { session } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    setIsLoading(true);

    try {
      setConnections(await service.listConnections());
      setErrorMessage(null);
    } catch {
      setErrorMessage("Network could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    service.setAccountScope(session?.user.id ?? null);

    if (!session) {
      setConnections([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    service
      .listConnections()
      .then((nextConnections) => {
        if (isActive) {
          setConnections(nextConnections);
          setErrorMessage(null);
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage("Network could not be loaded.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [service, session]);

  const value = useMemo<ConnectionContextValue>(
    () => ({
      connections,
      isLoading,
      errorMessage,
      async addConnection(identifier) {
        const connection = await service.addConnection(identifier);
        setConnections(await service.listConnections());
        setErrorMessage(null);
        return connection;
      },
      reloadConnections: loadConnections
    }),
    [connections, errorMessage, isLoading, loadConnections, service]
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnections() {
  const context = useContext(ConnectionContext);

  if (!context) {
    throw new Error("useConnections must be used inside ConnectionProvider.");
  }

  return context;
}
