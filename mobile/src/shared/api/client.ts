import { API_CONFIG } from "@/shared/config";
import { useTokenStore } from "./tokenStore";
import type { ApiProblemDetail, ApiRefreshResponse } from "./types";

// =============================================================================
// ERROR
// =============================================================================

export class ApiError extends Error {
  status: number;
  detail: string;
  problemDetail: ApiProblemDetail | undefined;

  constructor(status: number, detail: string, problemDetail?: ApiProblemDetail) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.problemDetail = problemDetail ?? undefined;
  }
}

// =============================================================================
// REFRESH MUTEX
// =============================================================================

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  // If already refreshing, wait for that to finish
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { refreshToken, setTokens, clearTokens } = useTokenStore.getState();

    if (!refreshToken) {
      clearTokens();
      throw new ApiError(401, "No refresh token available");
    }

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        throw new ApiError(res.status, "Token refresh failed");
      }

      const data: ApiRefreshResponse = await res.json();
      setTokens(data.access_token, data.refresh_token, data.expires_in);
    } catch (error) {
      clearTokens();
      throw error;
    }
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// =============================================================================
// REQUEST HELPER
// =============================================================================

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  retry = true,
): Promise<T> {
  const { accessToken, isExpired } = useTokenStore.getState();

  // Pre-emptive refresh if token is expired
  if (accessToken && isExpired()) {
    await refreshAccessToken();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const currentToken = useTokenStore.getState().accessToken;
  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const fetchInit: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };
    if (body) {
      fetchInit.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_CONFIG.BASE_URL}/v1${path}`, fetchInit);

    if (res.status === 204) {
      return undefined as T;
    }

    if (res.status === 401 && retry) {
      await refreshAccessToken();
      return request<T>(method, path, body, false);
    }

    if (!res.ok) {
      let problemDetail: ApiProblemDetail | undefined;
      try {
        problemDetail = await res.json();
      } catch {
        // Response body not parseable
      }
      throw new ApiError(
        res.status,
        problemDetail?.detail ?? `Request failed with status ${res.status}`,
        problemDetail,
      );
    }

    return res.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "Request timed out");
    }
    throw new ApiError(0, error instanceof Error ? error.message : "Network error");
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// PUBLIC API CLIENT
// =============================================================================

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
