import { Connection } from "@/models/connection";

export interface ConnectionService {
  listConnections(): Promise<Connection[]>;
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
  }
];

export class LocalConnectionService implements ConnectionService {
  private connections = [...initialConnections];

  async listConnections(): Promise<Connection[]> {
    return [...this.connections].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
}

export const connectionService = new LocalConnectionService();
