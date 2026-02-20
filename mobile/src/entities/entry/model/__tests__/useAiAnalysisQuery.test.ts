// Mock all native modules before any imports
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

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("@/shared/config", () => ({
  queryKeys: {
    aiAnalysis: {
      detail: (entryId: number) => ["aiAnalysis", "detail", entryId],
    },
  },
}));

jest.mock("../../api/aiAnalysisApi", () => ({
  aiAnalysisApi: {
    get: jest.fn(),
  },
}));

jest.mock("@/shared/api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

import { useAiAnalysisQuery } from "../useAiAnalysisQuery";
import { useQuery } from "@tanstack/react-query";
import { aiAnalysisApi } from "../../api/aiAnalysisApi";
import { ApiError } from "@/shared/api/client";
import type { ApiAiAnalysis } from "@/shared/api";

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockAiAnalysisApiGet = aiAnalysisApi.get as jest.MockedFunction<
  typeof aiAnalysisApi.get
>;

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

describe("useAiAnalysisQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup mocks after clearAllMocks (resetMocks: true clears implementations)
    mockUseQuery.mockReturnValue({
      data: mockAnalysis,
      isLoading: false,
      error: null,
    } as any);
    mockAiAnalysisApiGet.mockResolvedValue(mockAnalysis);
  });

  // =============================================================================
  // Hook Invocation
  // =============================================================================

  describe("hook invocation", () => {
    it("calls useQuery with correct query key", () => {
      useAiAnalysisQuery(42, true);

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["aiAnalysis", "detail", 42],
        })
      );
    });

    it("calls useQuery with correct queryFn", async () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      await (callArgs as any).queryFn();

      expect(mockAiAnalysisApiGet).toHaveBeenCalledWith(42);
    });

    it("returns the useQuery result", () => {
      const mockResult = {
        data: mockAnalysis,
        isLoading: false,
        error: null,
      } as any;
      mockUseQuery.mockReturnValue(mockResult);

      const result = useAiAnalysisQuery(42, true);

      expect(result).toBe(mockResult);
    });
  });

  // =============================================================================
  // Enabled Condition
  // =============================================================================

  describe("enabled condition", () => {
    it("is enabled when enabled=true and entryId > 0", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      expect((callArgs as any).enabled).toBe(true);
    });

    it("is disabled when enabled=false", () => {
      useAiAnalysisQuery(42, false);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      expect((callArgs as any).enabled).toBe(false);
    });

    it("is disabled when entryId is 0", () => {
      useAiAnalysisQuery(0, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      expect((callArgs as any).enabled).toBe(false);
    });

    it("is disabled when entryId is negative", () => {
      useAiAnalysisQuery(-1, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      expect((callArgs as any).enabled).toBe(false);
    });

    it("is disabled when both enabled=false and entryId is 0", () => {
      useAiAnalysisQuery(0, false);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      expect((callArgs as any).enabled).toBe(false);
    });
  });

  // =============================================================================
  // Retry Logic
  // =============================================================================

  describe("retry logic", () => {
    it("retries on 404 ApiError up to 2 times (race condition: analysis row may not exist yet)", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const retryFn = (callArgs as any).retry;
      const notFoundError = new ApiError(404, "Not found");

      // failureCount < 2, so first 2 attempts (0, 1) should retry
      expect(retryFn(0, notFoundError)).toBe(true);
      expect(retryFn(1, notFoundError)).toBe(true);
    });

    it("stops retrying on 404 after 2 failures", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const retryFn = (callArgs as any).retry;
      const notFoundError = new ApiError(404, "Not found");

      expect(retryFn(2, notFoundError)).toBe(false);
    });

    it("retries on non-404 errors up to 2 times", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const retryFn = (callArgs as any).retry;
      const networkError = new Error("Network error");

      expect(retryFn(0, networkError)).toBe(true);
      expect(retryFn(1, networkError)).toBe(true);
    });

    it("stops retrying after 2 failures on non-404 errors", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const retryFn = (callArgs as any).retry;
      const networkError = new Error("Network error");

      expect(retryFn(2, networkError)).toBe(false);
    });

    it("retries on 404 on first attempt (race condition handling)", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const retryFn = (callArgs as any).retry;
      const notFoundError = new ApiError(404, "Not found");

      // First failure should retry (failureCount 0 < 2)
      expect(retryFn(0, notFoundError)).toBe(true);
    });

    it("retries on ApiError with non-404 status", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const retryFn = (callArgs as any).retry;
      const serverError = new ApiError(500, "Server error");

      expect(retryFn(0, serverError)).toBe(true);
    });
  });

  // =============================================================================
  // RefetchInterval (Polling) Logic
  // =============================================================================

  describe("refetchInterval (polling) logic", () => {
    it("polls every 3000ms when status is pending", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const refetchIntervalFn = (callArgs as any).refetchInterval;

      const query = { state: { data: { ...mockAnalysis, status: "pending" } } };
      expect(refetchIntervalFn(query)).toBe(3000);
    });

    it("polls every 3000ms when status is processing", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const refetchIntervalFn = (callArgs as any).refetchInterval;

      const query = { state: { data: { ...mockAnalysis, status: "processing" } } };
      expect(refetchIntervalFn(query)).toBe(3000);
    });

    it("stops polling when status is completed", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const refetchIntervalFn = (callArgs as any).refetchInterval;

      const query = { state: { data: { ...mockAnalysis, status: "completed" } } };
      expect(refetchIntervalFn(query)).toBe(false);
    });

    it("stops polling when status is failed", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const refetchIntervalFn = (callArgs as any).refetchInterval;

      const query = { state: { data: { ...mockAnalysis, status: "failed" } } };
      expect(refetchIntervalFn(query)).toBe(false);
    });

    it("stops polling when data is undefined", () => {
      useAiAnalysisQuery(42, true);

      const callArgs = mockUseQuery.mock.calls[0]![0];
      const refetchIntervalFn = (callArgs as any).refetchInterval;

      const query = { state: { data: undefined } };
      expect(refetchIntervalFn(query)).toBe(false);
    });
  });
});
