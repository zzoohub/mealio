import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/config";
import type { ApiUpdateSettingsRequest } from "@/shared/api";
import { settingsApi } from "./settingsApi";

export function useUserSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings.user(),
    queryFn: () => settingsApi.getSettings(),
    enabled,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ApiUpdateSettingsRequest) => settingsApi.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.user() });
    },
  });
}

export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: () => settingsApi.deleteMe(),
  });
}
