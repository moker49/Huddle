import { Topic } from "@/models/topic";
import { LocalUser } from "@/models/user";
import { DirectoryUser } from "@/models/directoryUser";
import { getDirectoryUserIdForIdentifier } from "@/services/directoryUsers";

export function topicIsVisibleToUser(
  topic: Topic,
  localUser: LocalUser,
  directoryUsers: DirectoryUser[]
) {
  const localMemberIds = getLocalMemberIds(localUser, directoryUsers);

  return topic.memberIds.some((memberId) => localMemberIds.has(memberId));
}

export function getLocalMemberIds(localUser: LocalUser, directoryUsers: DirectoryUser[]) {
  const memberIds = new Set<string>([localUser.id]);
  const directoryIds = [
    getDirectoryUserIdForIdentifier(directoryUsers, localUser.tag),
    getDirectoryUserIdForIdentifier(directoryUsers, localUser.phoneNumber)
  ];

  directoryIds.forEach((directoryId) => {
    if (directoryId) {
      memberIds.add(directoryId);
    }
  });

  if (localUser.phoneNumber) {
    memberIds.add(localUser.phoneNumber);
    memberIds.add(`phone:${localUser.phoneNumber}`);
  }

  return memberIds;
}
