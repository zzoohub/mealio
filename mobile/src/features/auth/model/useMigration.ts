import { useState, useCallback } from "react";
import { entryStorageUtils } from "@/features/diary-feed/model/useEntryStorage";
import { diaryApi } from "@/features/diary-feed/model/diaryApi";
import { mapEntryToCreateRequest } from "@/shared/api";

// =============================================================================
// TYPES
// =============================================================================

export interface UseMigrationReturn {
  localEntryCount: number;
  isMigrating: boolean;
  migrationError: string | null;
  checkLocalEntries: () => Promise<number>;
  migrateLocalEntries: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMigration(): UseMigrationReturn {
  const [localEntryCount, setLocalEntryCount] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const checkLocalEntries = useCallback(async (): Promise<number> => {
    const entries = await entryStorageUtils.getAllEntries();
    setLocalEntryCount(entries.length);
    return entries.length;
  }, []);

  const migrateLocalEntries = useCallback(async () => {
    setIsMigrating(true);
    setMigrationError(null);

    try {
      const entries = await entryStorageUtils.getAllEntries();

      // Upload each entry to the API
      for (const entry of entries) {
        const request = mapEntryToCreateRequest(entry);
        await diaryApi.create(request);
      }

      // Clear local entries after successful migration
      await entryStorageUtils.clearAllEntries();
      setLocalEntryCount(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Migration failed";
      setMigrationError(message);
      throw error;
    } finally {
      setIsMigrating(false);
    }
  }, []);

  return {
    localEntryCount,
    isMigrating,
    migrationError,
    checkLocalEntries,
    migrateLocalEntries,
  };
}
