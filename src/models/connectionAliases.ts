import { Connection } from "@/models/connection";

export function getConnectionMemberAliases(connection: Connection) {
  return [
    connection.id,
    connection.tag,
    connection.phoneNumber,
    connection.tag ? `tag:${connection.tag}` : "",
    connection.phoneNumber ? `phone:${connection.phoneNumber}` : ""
  ].filter(Boolean);
}
