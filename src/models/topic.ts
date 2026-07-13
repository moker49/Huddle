export interface Topic {
  id: string;
  name: string;
  connectionIds: string[];
  createdAt: string;
}

export interface CreateTopicInput {
  name: string;
  connectionIds?: string[];
}
