import { Topic } from "@/models/topic";

export interface InboundHuddleFixture {
  id: string;
  title: string;
  invitedPhoneNumber: string;
  memberIds: string[];
  createdAt: string;
}

export const inboundHuddleFixtures: InboundHuddleFixture[] = [
  {
    id: "fixture-phone-11-huddle",
    title: "Phone invite test",
    invitedPhoneNumber: "#11",
    memberIds: ["andre", "jay"],
    createdAt: "2026-07-15T12:00:00.000Z"
  }
];

export function getVisibleInboundHuddleTopics(
  localUserId: string,
  localPhoneNumber: string
): Topic[] {
  const normalizedPhoneNumber = localPhoneNumber.trim().toLocaleLowerCase();

  if (!normalizedPhoneNumber) {
    return [];
  }

  return inboundHuddleFixtures
    .filter((fixture) => fixture.invitedPhoneNumber.toLocaleLowerCase() === normalizedPhoneNumber)
    .map((fixture) => ({
      id: fixture.id,
      title: fixture.title,
      memberIds: [...fixture.memberIds, localUserId],
      createdAt: fixture.createdAt
    }));
}

export function getAutoNetworkMemberIdsForPhone(localPhoneNumber: string) {
  const normalizedPhoneNumber = localPhoneNumber.trim().toLocaleLowerCase();

  if (!normalizedPhoneNumber) {
    return [];
  }

  return Array.from(new Set(
    inboundHuddleFixtures
      .filter((fixture) => fixture.invitedPhoneNumber.toLocaleLowerCase() === normalizedPhoneNumber)
      .flatMap((fixture) => fixture.memberIds)
  ));
}
