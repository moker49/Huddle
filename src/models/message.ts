export interface Message {
  id: string;
  topicId: string;
  body: string;
  kind: "user" | "system";
  activityType?: "auto_archive_updated" | "huddle_created" | "member_added" | "member_left" | "member_removed" | "title_updated";
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
