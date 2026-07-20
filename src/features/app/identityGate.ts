import { hasCompleteLocalIdentity } from "@/features/users/identity";
import { LocalUser } from "@/models/user";

interface IdentityGateInput {
  hasSession: boolean;
  isProfileLoading: boolean;
  profileErrorMessage: string | null;
  profileIsCurrentRoute: boolean;
  user: LocalUser | null;
}

export function getIdentityGateState({
  hasSession,
  isProfileLoading,
  profileErrorMessage,
  profileIsCurrentRoute,
  user
}: IdentityGateInput) {
  const hasIdentity = hasCompleteLocalIdentity(user);
  const canEvaluateIdentity = hasSession && !isProfileLoading && !profileErrorMessage;

  return {
    shouldRedirectToProfile: (
      canEvaluateIdentity &&
      !hasIdentity &&
      !profileIsCurrentRoute
    ),
    shouldShowLoading: (
      hasSession &&
      (isProfileLoading || !hasIdentity) &&
      !profileIsCurrentRoute &&
      !profileErrorMessage
    )
  };
}
