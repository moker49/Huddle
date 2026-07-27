export interface Message {
  id: string;
  topicId: string;
  body: string;
  kind: "user" | "system";
  activityType?: "auto_archive_updated" | "huddle_created" | "icon_updated" | "member_added" | "member_left" | "member_rejoined" | "member_removed" | "message_pinned" | "message_unpinned" | "title_updated";
  authorId?: string;
  authorName: string;
  authorAvatarUrl?: string;
  createdAt: string;
  replyToMessageId?: string;
  editedAt?: string;
  isDeleted?: boolean;
  isUnread?: boolean;
}

export interface CreateMessageInput {
  topicId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  replyToMessageId?: string;
}
