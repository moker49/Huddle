export interface Topic {
  id: string;
  title: string;
  icon?: string;
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
  icon?: string;
  memberIds?: string[];
  autoArchiveAt?: string;
}

export interface UpdateTopicInput {
  title: string;
  icon?: string;
  memberIds?: string[];
  autoArchiveAt?: string;
}
