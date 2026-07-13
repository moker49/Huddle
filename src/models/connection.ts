export type ConnectionSource = "direct" | "phone_contact" | "shared_huddle";

export interface Connection {
  id: string;
  displayName: string;
  handle?: string;
  source: ConnectionSource;
  createdAt: string;
}
