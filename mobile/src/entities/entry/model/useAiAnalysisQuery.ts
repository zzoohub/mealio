import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config";
import { aiAnalysisApi } from "../api/aiAnalysisApi";
import type { ApiAiAnalysis } from "@/shared/api";
import { ApiError } from "@/shared/api/client";

export function useAiAnalysisQuery(entryId: number, enabled: boolean) {
  return useQuery<ApiAiAnalysis>({
    queryKey: queryKeys.aiAnalysis.detail(entryId),
    queryFn: () => aiAnalysisApi.get(entryId),
    enabled: enabled && entryId > 0,
    retry: (failureCount, error) => {
      // Don't retry on 404 (no analysis exists yet)
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "processing") return 3000;
      return false;
    },
  });
}
