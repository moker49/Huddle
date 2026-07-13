export interface Topic {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

export interface CreateTopicInput {
  name: string;
  memberIds?: string[];
}
