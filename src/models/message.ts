export interface Message {
  id: string;
  topicId: string;
  body: string;
  kind: "user" | "system";
  activityType?: "huddle_created" | "member_added" | "member_removed" | "title_updated";
  authorId?: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: string;
  isUnread?: boolean;
}

export interface CreateMessageInput {
  topicId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
}
