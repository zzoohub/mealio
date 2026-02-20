import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config";
import { aiAnalysisApi } from "../api/aiAnalysisApi";
import type { ApiAiAnalysis } from "@/shared/api";
import { ApiError } from "@/shared/api/client";

export function useAiAnalysisQuery(entryId: number, enabled: boolean) {
  return useQuery<ApiAiAnalysis>({
    queryKey: queryKeys.aiAnalysis.detail(entryId),
    queryFn: async () => {
      const result = await aiAnalysisApi.get(entryId);
      console.log("[AiAnalysisQuery] entryId:", entryId, "status:", result.status,
        "calories:", result.calories, "protein:", result.protein_grams,
        "fat:", result.fat_grams, "carbs:", result.carbs_grams);
      return result;
    },
    enabled: enabled && entryId > 0,
    retry: (failureCount, error) => {
      // Retry on 404 a couple times (analysis row may not exist yet due to race condition)
      if (error instanceof ApiError && error.status === 404) return failureCount < 2;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "processing") return 3000;
      return false;
    },
  });
}
