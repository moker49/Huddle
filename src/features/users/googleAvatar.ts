import type { Session } from "@supabase/supabase-js";

export function getGoogleAvatarUrl(session: Session | null) {
  const metadata = session?.user.user_metadata;
  const avatarUrl = metadata?.avatar_url ?? metadata?.picture;

  return typeof avatarUrl === "string" ? avatarUrl : "";
}
