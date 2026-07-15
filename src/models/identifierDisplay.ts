export function formatPublicIdentifier(identifier: string) {
  const trimmedIdentifier = identifier.trim();

  if (trimmedIdentifier.toLocaleLowerCase().startsWith("phone:")) {
    return trimmedIdentifier.slice("phone:".length);
  }

  if (trimmedIdentifier.toLocaleLowerCase().startsWith("tag:")) {
    return trimmedIdentifier.slice("tag:".length);
  }

  return trimmedIdentifier;
}
