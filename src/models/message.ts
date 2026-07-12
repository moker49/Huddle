export interface Message {
  id: string;
  topicId: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface CreateMessageInput {
  topicId: string;
  body: string;
}
