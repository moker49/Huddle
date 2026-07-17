import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { LocalUser, LocalUserProfileInput } from "@/models/user";
import { useAuth } from "@/features/auth/AuthProvider";
import { UserService, userService } from "@/services/userService";

interface UserContextValue {
  user: LocalUser | null;
  isLoading: boolean;
  errorMessage: string | null;
  reloadUser(): Promise<void>;
  updateIdentifiers(identifiers: Pick<LocalUserProfileInput, "tag" | "phoneNumber">): Promise<LocalUser>;
  updateProfile(profile: LocalUserProfileInput): Promise<LocalUser>;
  updateDisplayName(displayName: string): Promise<LocalUser>;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps extends PropsWithChildren {
  service?: UserService;
}

export function UserProvider({ children, service = userService }: UserProviderProps) {
  const { session } = useAuth();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    if (!session) {
      setUser(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      setUser(await service.getUser());
      setErrorMessage(null);
    } catch {
      setErrorMessage("Profile could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [service, session]);

  useEffect(() => {
    service.setAccountScope(session?.user.id ?? null);

    if (!session) {
      setUser(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    service
      .getUser()
      .then((nextUser) => {
        if (isActive) {
          setUser(nextUser);
          setErrorMessage(null);
        }
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage("Profile could not be loaded.");
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

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      isLoading,
      errorMessage,
      reloadUser: loadUser,
      async updateIdentifiers(identifiers) {
        const nextUser = await service.updateIdentifiers(identifiers);
        setUser(nextUser);
        setErrorMessage(null);
        return nextUser;
      },
      async updateProfile(profile) {
        const nextUser = await service.updateProfile(profile);
        setUser(nextUser);
        setErrorMessage(null);
        return nextUser;
      },
      async updateDisplayName(displayName) {
        const nextUser = await service.updateDisplayName(displayName);
        setUser(nextUser);
        setErrorMessage(null);
        return nextUser;
      }
    }),
    [errorMessage, isLoading, loadUser, service, user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider.");
  }

  return context;
}
