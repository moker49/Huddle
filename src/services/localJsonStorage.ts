import * as FileSystem from "expo-file-system/legacy";

export interface JsonStorage {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
}

const storageDirectory = `${FileSystem.documentDirectory ?? ""}huddle/`;

interface BrowserStorageGlobal {
  localStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
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
