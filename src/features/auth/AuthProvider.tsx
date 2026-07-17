import { Session } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { userService } from "@/services/userService";
import { supabase } from "@/services/supabaseClient";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  errorMessage: string | null;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setSession(data.session);
        userService.setAccountScope(data.session?.user.id ?? null);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Session could not be loaded.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      userService.setAccountScope(nextSession?.user.id ?? null);
      setErrorMessage(null);
    });

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setErrorMessage(null);

    const redirectTo =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}/auth`
        : makeRedirectUri({ scheme: "huddle", path: "auth" });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== "web"
      }
    });

    if (error) {
      setErrorMessage(error.message);
      throw error;
    }

    if (Platform.OS === "web") {
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== "success") {
      return;
    }

    const { params, errorCode } = QueryParams.getQueryParams(result.url);

    if (errorCode) {
      const callbackError = new Error(errorCode);
      setErrorMessage(callbackError.message);
      throw callbackError;
    }

    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;

    if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
      const callbackError = new Error("Google sign-in did not return a session.");
      setErrorMessage(callbackError.message);
      throw callbackError;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (sessionError) {
      setErrorMessage(sessionError.message);
      throw sessionError;
    }
  }, []);

  const signOut = useCallback(async () => {
    setErrorMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isLoading, errorMessage, signInWithGoogle, signOut }),
    [errorMessage, isLoading, session, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
