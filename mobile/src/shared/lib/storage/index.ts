// Types and constants
export type { StorageItem, StorageOptions, StorageInfo, BatchOperation } from './types';
export { STORAGE_CONSTANTS } from './types';

// Core storage functions
export {
  getItem,
  setItem,
  setItemImmediate,
  removeItem,
  removeItemWithCleanup,
  clear,
  getAllKeys,
  setMultiple,
  getMultiple,
  removeMultiple,
  addToBatch,
  removeFromBatch,
  flushBatch,
  setItemDebounced,
  clearDebounceTimer,
  clearAllDebounceTimers,
  createDebouncedSetter,
  getStorageInfo,
  storage,
} from './storage';

// React hooks
export {
  useStorage,
  useLazyStorage,
  useDebouncedStorage,
  useBatchStorage,
  useStorageUtils,
} from './hooks';

// MMKV instance
export { mmkv } from './storage';