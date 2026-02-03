import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config";
import { entryApi } from "@/entities/entry";

export function useMonthThumbnailsQuery(
  startDate: string,
  endDate: string,
  enabled = true,
  tz?: string,
) {
  return useQuery({
    queryKey: queryKeys.diary.monthThumbnails({ startDate, endDate }),
    queryFn: () => entryApi.list({ start_date: startDate, end_date: endDate, per_page: 100, tz }),
    enabled,
  });
}
