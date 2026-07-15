import { Topic } from "@/models/topic";

export const duplicatePreventThreshold = 0.9;
export const duplicateWarnThreshold = 0.75;

export type DuplicateTopicLevel = "prevent" | "warn";

export interface DuplicateTopicMatch {
  level: DuplicateTopicLevel;
  score: number;
  topic: Topic;
}

export function findDuplicateTopicMatch(
  title: string,
  topics: Topic[]
): DuplicateTopicMatch | null {
  const normalizedTitle = normalizeTitle(title);

  if (!normalizedTitle) {
    return null;
  }

  const matches = topics
    .map((topic) => ({
      topic,
      score: getTitleSimilarity(normalizedTitle, normalizeTitle(topic.title))
    }))
    .filter((match) => match.score >= duplicateWarnThreshold)
    .sort((first, second) => second.score - first.score);
  const bestMatch = matches[0];

  if (!bestMatch) {
    return null;
  }

  return {
    level: bestMatch.score >= duplicatePreventThreshold ? "prevent" : "warn",
    score: bestMatch.score,
    topic: bestMatch.topic
  };
}

export function getTitleSimilarity(firstTitle: string, secondTitle: string) {
  const first = normalizeTitle(firstTitle);
  const second = normalizeTitle(secondTitle);

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 1;
  }

  const maxLength = Math.max(first.length, second.length);

  return (maxLength - getLevenshteinDistance(first, second)) / maxLength;
}

function normalizeTitle(title: string) {
  return title
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLevenshteinDistance(first: string, second: string) {
  const previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const currentRow = [firstIndex + 1];

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const insertCost = currentRow[secondIndex] + 1;
      const deleteCost = previousRow[secondIndex + 1] + 1;
      const replaceCost = previousRow[secondIndex] + (
        first[firstIndex] === second[secondIndex] ? 0 : 1
      );

      currentRow.push(Math.min(insertCost, deleteCost, replaceCost));
    }

    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  return previousRow[second.length];
}
