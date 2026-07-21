export interface Topic {
  id: string;
  title: string;
  memberIds: string[];
  ownerId?: string;
  ownerTag?: string;
  ownerPhoneNumber?: string;
  createdAt: string;
  autoArchiveAt?: string;
  unreadCount?: number;
}

export interface CreateTopicInput {
  title: string;
  memberIds?: string[];
  autoArchiveAt?: string;
}

export interface UpdateTopicInput {
  title: string;
  memberIds?: string[];
  autoArchiveAt?: string;
}
