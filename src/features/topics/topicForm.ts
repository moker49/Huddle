import { Connection } from "@/models/connection";

export const maxTopicTitleLength = 80;
export const collapseFabScrollOffset = 24;

export interface TopicFormValidationInput {
  autoArchiveDate: string;
  selectedConnectionIds: string[];
  title: string;
}

export function getTopicFormValidation({
  autoArchiveDate,
  selectedConnectionIds,
  title
}: TopicFormValidationInput) {
  const trimmedTitle = title.trim();
  const parsedAutoArchiveAt = parseAutoArchiveDate(autoArchiveDate);
  const autoArchiveIsInvalid = autoArchiveDate.trim().length > 0 && !parsedAutoArchiveAt;
  const hasRequiredSubmitFields = trimmedTitle.length > 0 && selectedConnectionIds.length > 0;

  return {
    autoArchiveIsInvalid,
    hasRequiredSubmitFields,
    isOverTitleLimit: title.length > maxTopicTitleLength,
    parsedAutoArchiveAt,
    trimmedTitle
  };
}

export function filterConnectionsForTopicForm({
  connections,
  query,
  selectedConnectionIds
}: {
  connections: Connection[];
  query: string;
  selectedConnectionIds: string[];
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingConnections = connections.filter((connection) => {
    if (selectedConnectionIds.includes(connection.id)) {
      return true;
    }

    if (!normalizedQuery) {
      return true;
    }

    const handle = connection.handle ?? "";

    return (
      connection.displayName.toLocaleLowerCase().startsWith(normalizedQuery) ||
      handle.toLocaleLowerCase().startsWith(normalizedQuery)
    );
  });

  return normalizedQuery && matchingConnections.length === 0
    ? connections
    : matchingConnections;
}

export function toggleConnectionId(currentIds: string[], connectionId: string) {
  if (currentIds.includes(connectionId)) {
    return currentIds.filter((currentId) => currentId !== connectionId);
  }

  return [...currentIds, connectionId];
}

export function parseAutoArchiveDate(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  const date = new Date(`${trimmedValue}T23:59:59.999Z`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatTopicAutoArchiveInputValue(autoArchiveAt: string | undefined) {
  return autoArchiveAt ? formatDateInputValue(new Date(autoArchiveAt)) : "";
}

export function arraysMatch(firstArray: string[], secondArray: string[]) {
  return (
    firstArray.length === secondArray.length &&
    firstArray.every((value, index) => value === secondArray[index])
  );
}
