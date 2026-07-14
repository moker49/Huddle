import * as FileSystem from "expo-file-system/legacy";

export interface JsonStorage {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clearNamespace(namespace: string): Promise<void>;
}

const storageDirectory = `${FileSystem.documentDirectory ?? ""}huddle/`;

interface BrowserStorageGlobal {
  localStorage?: {
    key(index: number): string | null;
    length: number;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
}

function getBrowserStorage() {
  return (globalThis as BrowserStorageGlobal).localStorage;
}

export class LocalJsonStorage implements JsonStorage {
  async read<T>(key: string): Promise<T | null> {
    const browserStorage = getBrowserStorage();
    const rawValue = browserStorage ? browserStorage.getItem(key) : await this.readFromFile(key);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    const rawValue = JSON.stringify(value);
    const browserStorage = getBrowserStorage();

    if (browserStorage) {
      browserStorage.setItem(key, rawValue);
      return;
    }

    await this.writeToFile(key, rawValue);
  }

  async remove(key: string): Promise<void> {
    const browserStorage = getBrowserStorage();

    if (browserStorage) {
      browserStorage.removeItem(key);
      return;
    }

    await FileSystem.deleteAsync(getFileUri(key), { idempotent: true });
  }

  async clearNamespace(namespace: string): Promise<void> {
    const browserStorage = getBrowserStorage();

    if (browserStorage) {
      const keysToRemove: string[] = [];

      for (let index = 0; index < browserStorage.length; index += 1) {
        const key = browserStorage.key(index);

        if (key?.startsWith(namespace)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => browserStorage.removeItem(key));
      return;
    }

    await FileSystem.deleteAsync(storageDirectory, { idempotent: true });
  }

  private async readFromFile(key: string): Promise<string | null> {
    const fileUri = getFileUri(key);
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (!fileInfo.exists) {
      return null;
    }

    return FileSystem.readAsStringAsync(fileUri);
  }

  private async writeToFile(key: string, value: string): Promise<void> {
    await FileSystem.makeDirectoryAsync(storageDirectory, { intermediates: true });
    await FileSystem.writeAsStringAsync(getFileUri(key), value);
  }
}

function getFileUri(key: string) {
  return `${storageDirectory}${encodeURIComponent(key)}.json`;
}

export const localJsonStorage = new LocalJsonStorage();
