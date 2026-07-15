import { Connection } from "@/models/connection";
import { formatPublicIdentifier } from "@/models/identifierDisplay";

export function getConnectionDisplayName(
  connection: Pick<Connection, "displayName" | "phoneNumber" | "tag">
) {
  return (
    connection.displayName.trim() ||
    formatPublicIdentifier(connection.tag) ||
    formatPublicIdentifier(connection.phoneNumber)
  );
}

export function connectionMatchesText(connection: Connection, normalizedQuery: string) {
  if (!normalizedQuery) {
    return false;
  }

  return (
    getConnectionDisplayName(connection).toLocaleLowerCase().startsWith(normalizedQuery) ||
    connection.tag.toLocaleLowerCase().startsWith(normalizedQuery) ||
    connection.phoneNumber.toLocaleLowerCase().startsWith(normalizedQuery)
  );
}
