import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUploadQueueStore } from "./uploadQueueStore";
import type { PendingUpload } from "./uploadQueueStore";
import { uploadPhoto } from "@/shared/api/uploadApi";
import { mapEntryToCreateRequest } from "@/shared/api";
import { entryApi } from "../api/entryApi";
import { photoApi } from "../api/photoApi";
import { queryKeys } from "@/shared/config";
import { aiAnalysisApi } from "../api/aiAnalysisApi";
import { captureError } from "@/shared/lib/sentry";
import { track } from "@/shared/lib/analytics";

// =============================================================================
// TYPES
// =============================================================================

export interface UseUploadProcessorOptions {
  onFailed?: (tempId: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALLOWED_SCHEMES = ["file://", "ph://", "content://", "asset-library://"];

// =============================================================================
// HOOK
// =============================================================================

export function useUploadProcessor(options?: UseUploadProcessorOptions) {
  const queryClient = useQueryClient();
  const processingRef = useRef(false);

  const queue = useUploadQueueStore((s) => s.queue);
  const markUploading = useUploadQueueStore((s) => s.markUploading);
  const markFailed = useUploadQueueStore((s) => s.markFailed);
  const remove = useUploadQueueStore((s) => s.remove);
  const getNextPending = useUploadQueueStore((s) => s.getNextPending);

  const processItem = useCallback(
    async (item: PendingUpload) => {
      markUploading(item.tempId);

      try {
        // Validate photo URIs before uploading
        const validUris = item.photoUris.filter((uri) =>
          ALLOWED_SCHEMES.some((scheme) => uri.startsWith(scheme)),
        );
        if (validUris.length !== item.photoUris.length) {
          throw new Error("Invalid photo URI detected");
        }

        // 1. Upload photos to R2 in parallel
        const urls = await Promise.all(validUris.map(uploadPhoto));

        // 2. Create diary entry
        const req = mapEntryToCreateRequest(item.entry);
        const created = await entryApi.create(req);

        // 3. Attach photos to entry
        for (let i = 0; i < urls.length; i++) {
          await photoApi.createPhoto(created.id, {
            url: urls[i]!,
            is_primary: i === 0,
            sort_order: i,
          });
        }

        // 4. Trigger AI analysis and seed the query cache with pending status
        try {
          const analysis = await aiAnalysisApi.trigger(created.id);
          console.log("[UploadProcessor] AI trigger success, status:", analysis.status, "entryId:", created.id);
          queryClient.setQueryData(queryKeys.aiAnalysis.detail(created.id), analysis);
        } catch (err) {
          console.warn("[UploadProcessor] AI trigger FAILED:", err instanceof Error ? err.message : "Unknown error");
        }

        // 5. Invalidate + refetch all diary queries (including inactive ones)
        // so the cache has fresh data before we remove the pending entry
        await queryClient.invalidateQueries({ queryKey: queryKeys.diary.all(), refetchType: "all" });
        await queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all(), refetchType: "all" });

        // 6. Remove from queue (diary cache already has the real entry)
        track("upload_completed", {
          entry_id: created.id,
          photo_count: urls.length,
        });
        remove(item.tempId);
      } catch (error) {
        captureError(error, { tags: { feature: "upload-processor", action: "upload" }, extra: { tempId: item.tempId } });
        track("upload_failed", {
          error_type: error instanceof Error ? error.message : "unknown",
        });
        markFailed(item.tempId);
        options?.onFailed?.(item.tempId);
      }
    },
    [markUploading, markFailed, remove, queryClient, options],
  );

  useEffect(() => {
    const processQueue = async () => {
      if (processingRef.current) return;

      const next = getNextPending();
      if (!next) return;

      processingRef.current = true;
      try {
        await processItem(next);
      } finally {
        processingRef.current = false;
      }
    };

    processQueue();
  }, [queue, getNextPending, processItem]);
}
