import { apiClient } from "@/shared/api";
import type {
  ApiDiaryEntry,
  ApiDiaryEntryDetail,
  ApiPaginatedResponse,
  ApiCreateEntryRequest,
  ApiUpdateEntryRequest,
  ApiDiaryQueryParams,
} from "@/shared/api";

function buildQuery(params: ApiDiaryQueryParams): string {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  if (params.start_date) searchParams.set("start_date", params.start_date);
  if (params.end_date) searchParams.set("end_date", params.end_date);
  if (params.meal_type) searchParams.set("meal_type", params.meal_type);
  if (params.q) searchParams.set("q", params.q);
  if (params.tz) searchParams.set("tz", params.tz);
  if (params.order_by) searchParams.set("order_by", params.order_by);
  if (params.would_eat_again !== undefined) searchParams.set("would_eat_again", String(params.would_eat_again));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export const entryApi = {
  list: (params: ApiDiaryQueryParams = {}) =>
    apiClient.get<ApiPaginatedResponse<ApiDiaryEntry>>(`/diary${buildQuery(params)}`),

  getById: (id: number) =>
    apiClient.get<ApiDiaryEntryDetail>(`/diary/${id}`),

  create: (body: ApiCreateEntryRequest) =>
    apiClient.post<ApiDiaryEntry>("/diary", body),

  update: (id: number, body: ApiUpdateEntryRequest) =>
    apiClient.patch<ApiDiaryEntry>(`/diary/${id}`, body),

  delete: (id: number) =>
    apiClient.delete<void>(`/diary/${id}`),
};
