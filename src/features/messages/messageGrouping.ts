import { Message } from "@/models/message";

export interface MessageGroup {
  messages: Message[];
}

export function groupMessages(messages: Message[]): MessageGroup[] {
  return messages.reduce<MessageGroup[]>((groups, message) => {
    const previousGroup = groups.at(-1);
    const previousMessage = previousGroup?.messages.at(-1);

    if (previousGroup && previousMessage && canGroupMessages(previousMessage, message)) {
      previousGroup.messages.push(message);
      return groups;
    }

    groups.push({ messages: [message] });
    return groups;
  }, []);
}

function canGroupMessages(previousMessage: Message, message: Message) {
  return (
    previousMessage.kind === "user" &&
    message.kind === "user" &&
    previousMessage.authorId === message.authorId &&
    previousMessage.authorName === message.authorName &&
    previousMessage.isUnread === message.isUnread &&
    getMessageMinute(previousMessage.createdAt) === getMessageMinute(message.createdAt)
  );
}

function getMessageMinute(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();

  return Number.isNaN(timestamp) ? createdAt : Math.floor(timestamp / 60_000);
}
