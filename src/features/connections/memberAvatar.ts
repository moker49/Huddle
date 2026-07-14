const safeAvatarColors = [
  "#4F6F52",
  "#6C5B7B",
  "#7A5C58",
  "#516C8D",
  "#7A6B3F",
  "#4E7378",
  "#7C5670",
  "#5E6F4E",
  "#6E5B4F",
  "#586A7A"
] as const;

export function getMemberAvatarColor(name: string) {
  return safeAvatarColors[getSeededIndex(name, safeAvatarColors.length)];
}

export function getMemberInitial(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase();
}

function getSeededIndex(value: string, length: number) {
  const normalizedValue = value.trim().toLocaleLowerCase();
  let hash = 0;

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) >>> 0;
  }

  return hash % length;
}
