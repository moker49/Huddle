import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import { Connection } from "@/models/connection";
import { ConnectionService, connectionService } from "@/services/connectionService";

interface ConnectionContextValue {
  connections: Connection[];
  isLoading: boolean;
  errorMessage: string | null;
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

interface ConnectionProviderProps extends PropsWithChildren {
  service?: ConnectionService;
}

export function ConnectionProvider({
  children,
  service = connectionService
}: ConnectionProviderProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
  }, [service]);

  const value = useMemo<ConnectionContextValue>(
    () => ({
      connections,
      isLoading,
      errorMessage
    }),
    [connections, errorMessage, isLoading]
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
