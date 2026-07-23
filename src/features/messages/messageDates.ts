export function getMessageDayKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}

export function formatMessageDay(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatMessageTimestamp(value: string, now: Date = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);

  if (getMessageDayKey(value) === getMessageDayKey(now.toISOString())) {
    return time;
  }

  const shortDate = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(date);

  return `${shortDate} ${time}`;
}
