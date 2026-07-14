import { Connection } from "@/models/connection";
import { JsonStorage, localJsonStorage } from "@/services/localJsonStorage";

export interface ConnectionService {
  listConnections(): Promise<Connection[]>;
  resetLocalData(): Promise<void>;
}

const initialConnections: Connection[] = [
  {
    id: "erik",
    displayName: "erik",
    handle: "erik",
    source: "direct",
    createdAt: new Date("2026-07-11T13:00:00.000Z").toISOString()
  },
  {
    id: "hanna",
    displayName: "hanna",
    handle: "hanna",
    source: "shared_huddle",
    createdAt: new Date("2026-07-11T13:05:00.000Z").toISOString()
  },
  {
    id: "kevo",
    displayName: "kevo",
    handle: "kevo",
    source: "phone_contact",
    createdAt: new Date("2026-07-11T13:10:00.000Z").toISOString()
  },
  {
    id: "andre",
    displayName: "andre",
    handle: "andre",
    source: "shared_huddle",
    createdAt: new Date("2026-07-11T13:15:00.000Z").toISOString()
  },
  {
    id: "karina",
    displayName: "karina",
    handle: "karina",
    source: "direct",
    createdAt: new Date("2026-07-11T13:20:00.000Z").toISOString()
  },
  {
    id: "russel",
    displayName: "russel",
    handle: "russel",
    source: "shared_huddle",
    createdAt: new Date("2026-07-11T13:25:00.000Z").toISOString()
  },
  {
    id: "kleb",
    displayName: "kleb",
    handle: "kleb",
    source: "direct",
    createdAt: new Date("2026-07-11T13:30:00.000Z").toISOString()
  },
  {
    id: "jay",
    displayName: "jay",
    handle: "jay",
    source: "shared_huddle",
    createdAt: new Date("2026-07-11T13:35:00.000Z").toISOString()
  },
  {
    id: "glenn",
    displayName: "glenn",
    handle: "glenn",
    source: "phone_contact",
    createdAt: new Date("2026-07-11T13:40:00.000Z").toISOString()
  },
  {
    id: "kayla",
    displayName: "kayla",
    handle: "kayla",
    source: "shared_huddle",
    createdAt: new Date("2026-07-11T13:45:00.000Z").toISOString()
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
    (!("handle" in value) || typeof value.handle === "string") &&
    (value.source === "direct" ||
      value.source === "phone_contact" ||
      value.source === "shared_huddle") &&
    typeof value.createdAt === "string"
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

  async resetLocalData(): Promise<void> {
    this.connections = [...initialConnections];
    this.connectionsPromise = Promise.resolve(this.connections);
    await this.storage.remove(connectionStorageKey);
  }

  private async loadConnections(): Promise<Connection[]> {
    if (!this.connectionsPromise) {
      this.connectionsPromise = this.storage
        .read<unknown>(connectionStorageKey)
        .then((storedConnections) => {
          if (Array.isArray(storedConnections) && storedConnections.every(isConnection)) {
            this.connections = storedConnections;
          }

          return this.connections;
        });
    }

    return this.connectionsPromise;
  }
}

export const connectionService = new LocalConnectionService();
