import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { entryStorageUtils } from "./useEntryStorage";
import { entryApi } from "../api/entryApi";
import { photoApi } from "../api/photoApi";
import { mapEntryToCreateRequest, uploadPhoto } from "@/shared/api";
import { queryKeys } from "@/shared/config";

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
// CONSTANTS
// =============================================================================

const ALLOWED_SCHEMES = ["file://", "ph://", "content://", "asset-library://"];

// =============================================================================
// HOOK
// =============================================================================

export function useMigration(): UseMigrationReturn {
  const [localEntryCount, setLocalEntryCount] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

      for (const entry of entries) {
        // 1. Collect photo URIs from the local entry
        const photoUris = entry.meal.photoUris?.length
          ? entry.meal.photoUris
          : entry.meal.photoUri
            ? [entry.meal.photoUri]
            : [];

        // 2. Validate URI schemes before uploading
        const validUris = photoUris.filter((uri) =>
          ALLOWED_SCHEMES.some((scheme) => uri.startsWith(scheme)),
        );

        // 3. Upload photos to R2 in parallel
        const uploadedUrls: string[] = [];
        if (validUris.length > 0) {
          const results = await Promise.all(validUris.map(uploadPhoto));
          uploadedUrls.push(...results);
        }

        // 4. Create diary entry on server
        const request = mapEntryToCreateRequest(entry);
        const created = await entryApi.create(request);

        // 5. Attach uploaded photos to the entry
        for (let i = 0; i < uploadedUrls.length; i++) {
          await photoApi.createPhoto(created.id, {
            url: uploadedUrls[i]!,
            is_primary: i === 0,
            sort_order: i,
          });
        }
      }

      // Clear local entries after successful migration
      await entryStorageUtils.clearAllEntries();
      setLocalEntryCount(0);

      // Refresh server data
      await queryClient.invalidateQueries({ queryKey: queryKeys.diary.all(), refetchType: "all" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all(), refetchType: "all" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Migration failed";
      setMigrationError(message);
      throw error;
    } finally {
      setIsMigrating(false);
    }
  }, [queryClient]);

  return {
    localEntryCount,
    isMigrating,
    migrationError,
    checkLocalEntries,
    migrateLocalEntries,
  };
}
