import { apiClient } from "@/shared/api";
import type { ApiAiAnalysis } from "@/shared/api";

export const aiAnalysisApi = {
  trigger: (entryId: number) =>
    apiClient.post<ApiAiAnalysis>(`/diary/${entryId}/analyze`),

  get: (entryId: number) =>
    apiClient.get<ApiAiAnalysis>(`/diary/${entryId}/analysis`),
};
