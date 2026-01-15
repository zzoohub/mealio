import { createMMKV } from 'react-native-mmkv';
import { StorageItem, StorageOptions, StorageInfo, STORAGE_CONSTANTS } from './types';

// Initialize MMKV instance
const mmkv = createMMKV();

// Global state for batch and debounce operations
const batchQueue = new Map<string, string>();
let batchTimeout: NodeJS.Timeout | null = null;
let isProcessing = false;
const debounceTimers = new Map<string, NodeJS.Timeout>();

// Core storage operations
export function getItem<T>(key: string, defaultValue?: T): T | null {
  try {
    const value = mmkv.getString(key);
    if (value === undefined) {
      return defaultValue ?? null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(`Failed to parse stored value for key: ${key}`, error);
    } else {
      console.error(`Failed to get item for key: ${key}`, error);
    }
    return defaultValue ?? null;
  }
}

export function setItemImmediate<T>(key: string, value: T): void {
  try {
    const serializedValue = JSON.stringify(value);
    mmkv.set(key, serializedValue);
  } catch (error) {
    console.error(`Failed to set item for key: ${key}`, error);
    throw error;
  }
}

export function removeItem(key: string): void {
  try {
    mmkv.remove(key);
  } catch (error) {
    console.error(`Failed to remove item for key: ${key}`, error);
    throw error;
  }
}

export function clear(): void {
  try {
    mmkv.clearAll();
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
}

export function getAllKeys(): string[] {
  try {
    return mmkv.getAllKeys();
  } catch (error) {
    console.error('Failed to get all keys:', error);
    throw error;
  }
}

// Multi-item operations
export function setMultiple<T>(items: StorageItem<T>[]): void {
  try {
    for (const { key, value } of items) {
      mmkv.set(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Failed to set multiple items:', error);
    throw error;
  }
}

export function getMultiple<T>(keys: string[]): Array<StorageItem<T | null>> {
  try {
    return keys.map(key => {
      const value = mmkv.getString(key);
      return {
        key,
        value: value ? JSON.parse(value) : null,
      };
    });
  } catch (error) {
    console.error('Failed to get multiple items:', error);
    throw error;
  }
}

export function removeMultiple(keys: string[]): void {
  try {
    for (const key of keys) {
      mmkv.remove(key);
    }
  } catch (error) {
    console.error('Failed to remove multiple items:', error);
    throw error;
  }
}

// Batch operations
export function addToBatch(key: string, value: string): void {
  batchQueue.set(key, value);

  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }

  batchTimeout = setTimeout(() => {
    processBatch();
  }, STORAGE_CONSTANTS.BATCH_DELAY);
}

export function removeFromBatch(key: string): void {
  batchQueue.delete(key);
}

function processBatch(): void {
  if (isProcessing || batchQueue.size === 0) {
    return;
  }

  isProcessing = true;

  try {
    const items = Array.from(batchQueue.entries()).map(([key, value]) => ({
      key,
      value: JSON.parse(value),
    }));

    setMultiple(items);
    batchQueue.clear();
  } catch (error) {
    console.error('Failed to process batch operations:', error);
  } finally {
    isProcessing = false;
  }

  batchTimeout = null;
}

export function flushBatch(): void {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  processBatch();
}

// Debounced operations
export function setItemDebounced<T>(
  key: string,
  value: T,
  debounceDelay: number = STORAGE_CONSTANTS.DEFAULT_DEBOUNCE_DELAY
): void {
  const existingTimer = debounceTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const serializedValue = JSON.stringify(value);
  addToBatch(key, serializedValue);

  const timer = setTimeout(() => {
    debounceTimers.delete(key);
    try {
      setItemImmediate(key, value);
    } catch (error) {
      console.error(`Failed to save debounced item ${key}:`, error);
    }
  }, debounceDelay);

  debounceTimers.set(key, timer);
}

export function clearDebounceTimer(key: string): void {
  const timer = debounceTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(key);
  }
}

export function clearAllDebounceTimers(): void {
  debounceTimers.forEach(timer => clearTimeout(timer));
  debounceTimers.clear();
}

// Non-hook function for creating debounced setters (for use outside React components)
export function createDebouncedSetter<T>(
  key: string,
  debounceDelay: number = STORAGE_CONSTANTS.DEFAULT_DEBOUNCE_DELAY
) {
  return (value: T) => setItemDebounced(key, value, debounceDelay);
}

// Main storage interface
export function setItem<T>(key: string, value: T, options?: StorageOptions): void {
  try {
    if (options?.debounceDelay) {
      setItemDebounced(key, value, options.debounceDelay);
      return;
    }

    if (options?.enableBatching !== false) {
      const serializedValue = JSON.stringify(value);
      addToBatch(key, serializedValue);
      return;
    }

    setItemImmediate(key, value);
  } catch (error) {
    console.error(`Failed to set item for key: ${key}`, error);
    throw error;
  }
}

export function removeItemWithCleanup(key: string): void {
  try {
    removeFromBatch(key);
    clearDebounceTimer(key);
    removeItem(key);
  } catch (error) {
    console.error(`Failed to remove item for key: ${key}`, error);
    throw error;
  }
}

// Storage utilities
export function getStorageInfo(): StorageInfo {
  try {
    const keys = getAllKeys();
    const items = getMultiple([...keys]);

    const totalSize = items.reduce((acc, { value }) => {
      return acc + (JSON.stringify(value)?.length || 0);
    }, 0);

    return {
      totalKeys: keys.length,
      estimatedSize: totalSize,
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    throw error;
  }
}

// Storage object for easy access
export const storage = {
  get: getItem,
  set: setItem,
  remove: removeItemWithCleanup,
  clear,
  getAllKeys,
  setMultiple,
  getMultiple,
  removeMultiple,
  flush: flushBatch,
  getInfo: getStorageInfo,
};

// Export MMKV instance for direct access if needed
export { mmkv };
