export interface StorageItem<T = any> {
  key: string;
  value: T;
}

export interface StorageOptions {
  debounceDelay?: number;
  enableBatching?: boolean;
}

export interface StorageInfo {
  totalKeys: number;
  estimatedSize: number;
}

export interface BatchOperation {
  key: string;
  value: string;
  timestamp: number;
}

export const STORAGE_CONSTANTS = {
  BATCH_DELAY: 100,
  DEFAULT_DEBOUNCE_DELAY: 500,
} as const;