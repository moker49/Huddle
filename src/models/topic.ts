export interface Topic {
  id: string;
  title: string;
  memberIds: string[];
  createdAt: string;
  autoArchiveAt?: string;
}

export interface CreateTopicInput {
  title: string;
  memberIds?: string[];
  autoArchiveAt?: string;
}
