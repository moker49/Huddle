import { Connection } from "@/models/connection";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";

export interface ConnectionService {
  listConnections(): Promise<Connection[]>;
}

const initialConnections: Connection[] = [
  {
    id: "kevin",
    displayName: "Kevin",
    handle: "kevin",
    source: "direct",
    createdAt: new Date("2026-07-11T13:00:00.000Z").toISOString()
  },
  {
    id: "alex",
    displayName: "Alex",
    handle: "alex",
    source: "shared_huddle",
    createdAt: new Date("2026-07-11T13:05:00.000Z").toISOString()
  },
  {
    id: "dana",
    displayName: "Dana",
    handle: "dana",
    source: "phone_contact",
    createdAt: new Date("2026-07-11T13:10:00.000Z").toISOString()
  },
  {
    id: "maria",
    displayName: "Maria",
    handle: "maria",
    source: "shared_huddle",
    createdAt: new Date("2026-07-11T13:15:00.000Z").toISOString()
  },
  {
    id: "sam",
    displayName: "Sam",
    handle: "sam",
    source: "direct",
    createdAt: new Date("2026-07-11T13:20:00.000Z").toISOString()
  }
];

const connectionStorageKey = "huddle:connections";

function isConnection(value: unknown): value is Connection {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "displayName" in value &&
    "source" in value &&
    "createdAt" in value &&
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    typeof value.source === "string" &&
    typeof value.createdAt === "string" &&
    (!("handle" in value) || typeof value.handle === "string")
  );
}

export class LocalConnectionService implements ConnectionService {
  private connections = [...initialConnections];
  private connectionsPromise: Promise<Connection[]> | null = null;

  constructor(private readonly storage: JsonStorage = localJsonStorage) {}

  async listConnections(): Promise<Connection[]> {
    const connections = await this.loadConnections();
    return [...connections].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  private async loadConnections(): Promise<Connection[]> {
    if (!this.connectionsPromise) {
      this.connectionsPromise = this.storage
        .read<unknown>(connectionStorageKey)
        .then((storedConnections) => {
          if (Array.isArray(storedConnections) && storedConnections.every(isConnection)) {
            const storedConnectionIds = new Set(
              storedConnections.map((connection) => connection.id)
            );
            const missingInitialConnections = initialConnections.filter(
              (connection) => !storedConnectionIds.has(connection.id)
            );
            this.connections = [...storedConnections, ...missingInitialConnections];
          }

          return this.connections;
        });
    }

    return this.connectionsPromise;
  }
}

export const connectionService = new LocalConnectionService();
