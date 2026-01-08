import { useState, useEffect, useCallback, useRef } from "react";
import {
  getItem,
  setItem,
  removeItemWithCleanup,
  setItemDebounced,
  addToBatch,
  removeFromBatch,
  flushBatch,
  clearDebounceTimer,
  clearAllDebounceTimers,
  getStorageInfo,
} from "./storage";
import { StorageOptions, STORAGE_CONSTANTS } from "./types";

export function useStorage<T>(key: string, defaultValue?: T, options?: StorageOptions) {
  const [value, setValue] = useState<T | null>(defaultValue ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadValue = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const stored = await getItem<T>(key, defaultValue);
        if (isMounted) {
          setValue(stored);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setValue(defaultValue ?? null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadValue();

    return () => {
      isMounted = false;
    };
  }, [key, defaultValue]);

  const updateValue = useCallback(
    async (newValue: T) => {
      try {
        setError(null);
        setValue(newValue);
        await setItem(key, newValue, options);
      } catch (err) {
        setError(err as Error);
        setValue(value);
        throw err;
      }
    },
    [key, value, options],
  );

  const removeValue = useCallback(async () => {
    try {
      setError(null);
      setValue(defaultValue ?? null);
      await removeItemWithCleanup(key);
    } catch (err) {
      setError(err as Error);
      setValue(value);
      throw err;
    }
  }, [key, value, defaultValue]);

  return {
    value,
    setValue: updateValue,
    removeValue,
    isLoading,
    error,
  };
}

export function useAsyncStorage<T>(key: string, defaultValue?: T) {
  const [data, setData] = useState<T | null>(defaultValue ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getItem<T>(key, defaultValue);
      setData(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      setData(defaultValue ?? null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [key, defaultValue]);

  const save = useCallback(
    async (value: T, options?: StorageOptions) => {
      try {
        setError(null);
        await setItem(key, value, options);
        setData(value);
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        return false;
      }
    },
    [key],
  );

  const remove = useCallback(async () => {
    try {
      setError(null);
      await removeItemWithCleanup(key);
      setData(defaultValue ?? null);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      return false;
    }
  }, [key, defaultValue]);

  return {
    data,
    isLoading,
    error,
    load,
    save,
    remove,
  };
}

export function useDebouncedStorage(debounceDelay?: number) {
  const delayRef = useRef(debounceDelay || STORAGE_CONSTANTS.DEFAULT_DEBOUNCE_DELAY);

  const setItem = useCallback(<T>(key: string, value: T) => {
    setItemDebounced(key, value, delayRef.current);
  }, []);

  const createSetter = useCallback(<T>(key: string) => {
    return (value: T) => setItemDebounced(key, value, delayRef.current);
  }, []);

  return {
    setItem,
    createSetter,
    clearTimer: useCallback(clearDebounceTimer, []),
    clearAllTimers: useCallback(clearAllDebounceTimers, []),
  };
}

export function useBatchStorage() {
  return {
    addToBatch: useCallback(addToBatch, []),
    removeFromBatch: useCallback(removeFromBatch, []),
    flushBatch: useCallback(flushBatch, []),
  };
}

export function useStorageUtils() {
  return {
    getStorageInfo: useCallback(getStorageInfo, []),
  };
}
