import { Topic } from "@/models/topic";

export function isTopicArchived(autoArchiveAt: string | undefined, now = Date.now()) {
  if (!autoArchiveAt) {
    return false;
  }

  const archiveTime = new Date(autoArchiveAt).getTime();

  return !Number.isNaN(archiveTime) && archiveTime <= now;
}

export function getNextTopicArchiveTime(topics: Topic[], now = Date.now()) {
  const futureArchiveTimes = topics
    .map((topic) => topic.autoArchiveAt ? new Date(topic.autoArchiveAt).getTime() : Number.NaN)
    .filter((archiveTime) => !Number.isNaN(archiveTime) && archiveTime > now);

  return futureArchiveTimes.length > 0 ? Math.min(...futureArchiveTimes) : undefined;
}
