import { apiClient } from "@/shared/api";
import type { ApiEntryPhoto, ApiCreatePhotoRequest } from "@/shared/api";

export const photoApi = {
  createPhoto: (entryId: number, body: ApiCreatePhotoRequest) =>
    apiClient.post<ApiEntryPhoto>(`/diary/${entryId}/photos`, body),
};
