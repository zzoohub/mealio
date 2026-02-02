import { apiClient } from "@/shared/api";
import type {
  ApiUser,
  ApiUpdateUserRequest,
  ApiUserSettings,
  ApiUpdateSettingsRequest,
} from "@/shared/api";

export const settingsApi = {
  getMe: () => apiClient.get<ApiUser>("/users/me"),

  updateMe: (body: ApiUpdateUserRequest) =>
    apiClient.patch<ApiUser>("/users/me", body),

  deleteMe: () => apiClient.delete<void>("/users/me"),

  getSettings: () => apiClient.get<ApiUserSettings>("/users/me/settings"),

  updateSettings: (body: ApiUpdateSettingsRequest) =>
    apiClient.patch<ApiUserSettings>("/users/me/settings", body),
};
