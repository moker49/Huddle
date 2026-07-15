import { Connection } from "@/models/connection";

export function getConnectionDisplayName(
  connection: Pick<Connection, "displayName" | "phoneNumber" | "tag">
) {
  return connection.displayName.trim() || connection.tag.trim() || connection.phoneNumber.trim();
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
