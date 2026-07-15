import { LocalUser } from "@/models/user";

export function hasCompleteLocalIdentity(user: LocalUser | null | undefined) {
  if (!user) {
    return false;
  }

  return (
    user.displayName.trim().length > 0 &&
    (user.tag.trim().length > 0 || user.phoneNumber.trim().length > 0)
  );
}
