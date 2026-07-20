export function isProfileLoadingForAccount({
  accountId,
  isLoading,
  loadedAccountId
}: {
  accountId: string | null;
  isLoading: boolean;
  loadedAccountId: string | null;
}) {
  return Boolean(accountId && (isLoading || loadedAccountId !== accountId));
}
