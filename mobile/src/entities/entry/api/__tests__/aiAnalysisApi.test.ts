// Mock expo-secure-store before any imports (required for client.ts -> tokenStore.ts)
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@/lib/storage", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("@/shared/api", () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { aiAnalysisApi } from "../aiAnalysisApi";
import type { ApiAiAnalysis } from "@/shared/api";

// Get the mocked apiClient
const { apiClient } = jest.requireMock("@/shared/api");
const mockApiClientPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockApiClientGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

// =============================================================================
// TEST DATA
// =============================================================================

const mockAnalysis: ApiAiAnalysis = {
  id: 1,
  entry_id: 42,
  calories: "500",
  protein_grams: "25",
  fat_grams: "15",
  carbs_grams: "60",
  fiber_grams: "8",
  sugar_grams: "12",
  sodium_mg: "450",
  description: "A tasty meal",
  confidence_score: "0.9",
  raw_response: null,
  created_at: "2024-01-01T00:00:00Z",
  status: "completed",
  error_message: null,
};

// =============================================================================
// TESTS
// =============================================================================

describe("aiAnalysisApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mocks after clearAllMocks (resetMocks: true clears implementations)
    mockApiClientPost.mockResolvedValue(mockAnalysis);
    mockApiClientGet.mockResolvedValue(mockAnalysis);
  });

  describe("trigger", () => {
    it("calls apiClient.post with correct path", async () => {
      await aiAnalysisApi.trigger(42);

      expect(mockApiClientPost).toHaveBeenCalledWith("/diary/42/analyze");
    });

    it("returns the API response", async () => {
      const result = await aiAnalysisApi.trigger(42);

      expect(result).toEqual(mockAnalysis);
    });

    it("uses the entryId in the URL path", async () => {
      await aiAnalysisApi.trigger(123);

      expect(mockApiClientPost).toHaveBeenCalledWith("/diary/123/analyze");
    });

    it("propagates errors from apiClient", async () => {
      const apiError = new Error("Network error");
      mockApiClientPost.mockRejectedValue(apiError);

      await expect(aiAnalysisApi.trigger(42)).rejects.toThrow("Network error");
    });

    it("handles different entry IDs", async () => {
      await aiAnalysisApi.trigger(999);
      expect(mockApiClientPost).toHaveBeenCalledWith("/diary/999/analyze");

      await aiAnalysisApi.trigger(1);
      expect(mockApiClientPost).toHaveBeenCalledWith("/diary/1/analyze");
    });
  });

  describe("get", () => {
    it("calls apiClient.get with correct path", async () => {
      await aiAnalysisApi.get(42);

      expect(mockApiClientGet).toHaveBeenCalledWith("/diary/42/analysis");
    });

    it("returns the API response", async () => {
      const result = await aiAnalysisApi.get(42);

      expect(result).toEqual(mockAnalysis);
    });

    it("uses the entryId in the URL path", async () => {
      await aiAnalysisApi.get(456);

      expect(mockApiClientGet).toHaveBeenCalledWith("/diary/456/analysis");
    });

    it("propagates errors from apiClient", async () => {
      const apiError = new Error("Not found");
      mockApiClientGet.mockRejectedValue(apiError);

      await expect(aiAnalysisApi.get(42)).rejects.toThrow("Not found");
    });

    it("returns analysis with pending status", async () => {
      const pendingAnalysis: ApiAiAnalysis = {
        ...mockAnalysis,
        status: "pending",
        calories: null,
        confidence_score: null,
      };
      mockApiClientGet.mockResolvedValue(pendingAnalysis);

      const result = await aiAnalysisApi.get(42);

      expect(result.status).toBe("pending");
    });

    it("returns analysis with processing status", async () => {
      const processingAnalysis: ApiAiAnalysis = {
        ...mockAnalysis,
        status: "processing",
      };
      mockApiClientGet.mockResolvedValue(processingAnalysis);

      const result = await aiAnalysisApi.get(42);

      expect(result.status).toBe("processing");
    });

    it("returns analysis with failed status", async () => {
      const failedAnalysis: ApiAiAnalysis = {
        ...mockAnalysis,
        status: "failed",
        error_message: "AI service unavailable",
      };
      mockApiClientGet.mockResolvedValue(failedAnalysis);

      const result = await aiAnalysisApi.get(42);

      expect(result.status).toBe("failed");
      expect(result.error_message).toBe("AI service unavailable");
    });
  });
});
