// Mock native modules first
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "en" }]),
}));

jest.mock("@/lib/storage", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUploadProcessor } from "../useUploadProcessor";
import { useUploadQueueStore } from "../uploadQueueStore";
import { uploadPhoto } from "@/shared/api/uploadApi";
import { mapEntryToCreateRequest } from "@/shared/api";
import { entryApi } from "../../api/entryApi";
import { photoApi } from "../../api/photoApi";
import type { ReactNode } from "react";

// =============================================================================
// MOCKS
// =============================================================================

jest.mock("@/shared/api/uploadApi", () => ({
  uploadPhoto: jest.fn(),
}));

jest.mock("@/shared/api", () => ({
  mapEntryToCreateRequest: jest.fn(),
}));

jest.mock("../../api/entryApi", () => ({
  entryApi: {
    create: jest.fn(),
  },
}));

jest.mock("../../api/photoApi", () => ({
  photoApi: {
    createPhoto: jest.fn(),
  },
}));

const mockUploadPhoto = uploadPhoto as jest.MockedFunction<typeof uploadPhoto>;
const mockMapEntryToCreateRequest = mapEntryToCreateRequest as jest.MockedFunction<
  typeof mapEntryToCreateRequest
>;
const mockEntryApiCreate = entryApi.create as jest.MockedFunction<typeof entryApi.create>;
const mockPhotoApiCreatePhoto = photoApi.createPhoto as jest.MockedFunction<
  typeof photoApi.createPhoto
>;

// =============================================================================
// TEST SETUP
// =============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUploadProcessor", () => {
  let queryClient: QueryClient;
  let hookResult: ReturnType<typeof renderHook> | null = null;

  beforeEach(async () => {
    queryClient = createTestQueryClient();
    // Reset store state
    useUploadQueueStore.setState({ queue: new Map() });
    // Clear all mocks
    jest.clearAllMocks();
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Wait a bit to ensure previous test's async operations have completed
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  afterEach(() => {
    // Unmount hook if it was rendered
    if (hookResult) {
      hookResult.unmount();
      hookResult = null;
    }
    queryClient.clear();
    jest.restoreAllMocks();
  });

  // =============================================================================
  // Hook Initialization
  // =============================================================================

  describe("hook initialization", () => {
    it("renders without crashing", () => {
      const { result } = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current).toBeUndefined();
    });

    it("does not process when queue is empty", async () => {
      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockUploadPhoto).not.toHaveBeenCalled();
      });
    });

    it("does not process immediately on mount", () => {
      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      expect(mockUploadPhoto).not.toHaveBeenCalled();
      expect(mockEntryApiCreate).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Successful Upload Flow
  // =============================================================================

  describe("successful upload flow", () => {
    const mockEntry = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Test meal",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };
    const mockPhotoUris = ["file:///photo1.jpg", "file:///photo2.jpg"];
    const mockUploadedUrls = [
      "https://r2.example.com/photo1.jpg",
      "https://r2.example.com/photo2.jpg",
    ];
    const mockCreatedEntry = {
      id: 123,
      userId: "user_123",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Test meal",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockCreateRequest = {
      timestamp: "2024-01-15T08:00:00Z",
      notes: "Test meal",
      meal_type: "breakfast",
    };

    beforeEach(() => {
      // Note: uploadPhoto is called via photoUris.map(uploadPhoto), so it receives (uri, index, array)
      mockUploadPhoto.mockImplementation((uri: string) => {
        const index = mockPhotoUris.indexOf(uri);
        return Promise.resolve(mockUploadedUrls[index]!);
      });
      mockMapEntryToCreateRequest.mockReturnValue(mockCreateRequest);
      mockEntryApiCreate.mockResolvedValue(mockCreatedEntry);
      mockPhotoApiCreatePhoto.mockResolvedValue({
        id: 1,
        entryId: 123,
        url: "",
        isPrimary: true,
        sortOrder: 0,
        createdAt: new Date(),
      });
    });

    it("processes pending item when added to queue", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
      });
    });

    it("marks item as uploading when processing starts", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      // Add a small delay to the upload to ensure we can catch the uploading state
      mockUploadPhoto.mockImplementation((uri: string) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const index = mockPhotoUris.indexOf(uri);
            resolve(mockUploadedUrls[index]!);
          }, 50);
        });
      });

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(
        () => {
          const item = useUploadQueueStore.getState().queue.get(tempId);
          expect(item?.status).toBe("uploading");
        },
        { timeout: 1000 }
      );
    });

    it("uploads all photos to R2 in parallel", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        // Called via photoUris.map(uploadPhoto), so includes array.map arguments
        expect(mockUploadPhoto).toHaveBeenCalledWith(mockPhotoUris[0], 0, mockPhotoUris);
        expect(mockUploadPhoto).toHaveBeenCalledWith(mockPhotoUris[1], 1, mockPhotoUris);
        expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
      });
    });

    it("creates diary entry with mapped request", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(mockMapEntryToCreateRequest).toHaveBeenCalledWith(mockEntry);
        expect(mockEntryApiCreate).toHaveBeenCalledWith(mockCreateRequest);
      });
    });

    it("attaches photos to created entry in order", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(mockPhotoApiCreatePhoto).toHaveBeenCalledWith(mockCreatedEntry.id, {
          url: mockUploadedUrls[0],
          is_primary: true,
          sort_order: 0,
        });
        expect(mockPhotoApiCreatePhoto).toHaveBeenCalledWith(mockCreatedEntry.id, {
          url: mockUploadedUrls[1],
          is_primary: false,
          sort_order: 1,
        });
        expect(mockPhotoApiCreatePhoto).toHaveBeenCalledTimes(2);
      });
    });

    it("marks first photo as primary", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        const calls = mockPhotoApiCreatePhoto.mock.calls;
        expect(calls[0]?.[1].is_primary).toBe(true);
        expect(calls[1]?.[1].is_primary).toBe(false);
      });
    });

    it("invalidates diary queries after successful upload", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["diary"], refetchType: "all" });
      });
    });

    it("invalidates statistics queries after successful upload", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["statistics"], refetchType: "all" });
      });
    });

    it("removes item from queue after successful upload", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
      });
    });

    it("processes items sequentially, not in parallel", async () => {
      const { enqueue } = useUploadQueueStore.getState();
      let firstCallResolved = false;

      mockUploadPhoto.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            firstCallResolved = true;
            resolve("https://r2.example.com/photo.jpg");
          }, 100);
        });
      });

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, [mockPhotoUris[0]!]);
      enqueue(mockEntry, [mockPhotoUris[1]!]);

      // Wait for first item to start processing
      await waitFor(() => {
        expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
      });

      // Second item should not start until first is done
      expect(mockEntryApiCreate).toHaveBeenCalledTimes(0);

      // Wait for first to complete
      await waitFor(() => {
        expect(firstCallResolved).toBe(true);
      });

      // Now second item should process
      await waitFor(
        () => {
          expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 }
      );

      // Wait for the full pipeline to complete before ending the test
      await waitFor(
        () => {
          expect(useUploadQueueStore.getState().queue.size).toBe(0);
        },
        { timeout: 3000 }
      );
    });

    it("handles empty photo array", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, []);

      await waitFor(() => {
        expect(mockUploadPhoto).not.toHaveBeenCalled();
        expect(mockEntryApiCreate).toHaveBeenCalled();
        expect(mockPhotoApiCreatePhoto).not.toHaveBeenCalled();
      });

      // Wait for item to be removed from queue
      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
      });
    });

    it("handles single photo", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, [mockPhotoUris[0]!]);

      await waitFor(() => {
        expect(mockUploadPhoto).toHaveBeenCalled();
        expect(mockPhotoApiCreatePhoto).toHaveBeenCalled();
      });

      // Verify the upload completed
      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
      });

      // Verify the photo was uploaded and attached
      expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
      // Check that photo API was called for this entry (may have been called in other tests too)
      expect(mockPhotoApiCreatePhoto).toHaveBeenCalledWith(
        mockCreatedEntry.id,
        expect.objectContaining({ is_primary: true, sort_order: 0 })
      );
    });

    it("handles multiple photos with correct sort order", async () => {
      const manyPhotos = [
        "file:///photo1.jpg",
        "file:///photo2.jpg",
        "file:///photo3.jpg",
      ];
      mockUploadPhoto.mockImplementation((uri) => {
        const index = manyPhotos.indexOf(uri);
        return Promise.resolve(`https://r2.example.com/photo${index + 1}.jpg`);
      });

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, manyPhotos);

      await waitFor(() => {
        expect(mockPhotoApiCreatePhoto).toHaveBeenCalledTimes(3);
      });

      const calls = mockPhotoApiCreatePhoto.mock.calls;
      expect(calls[0]?.[1].sort_order).toBe(0);
      expect(calls[1]?.[1].sort_order).toBe(1);
      expect(calls[2]?.[1].sort_order).toBe(2);
    });
  });

  // =============================================================================
  // Failure Handling
  // =============================================================================

  describe("failure handling", () => {
    const mockEntry = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Test meal",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };
    const mockPhotoUris = ["file:///photo1.jpg"];

    it("marks item as failed when photo upload fails", async () => {
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        const item = useUploadQueueStore.getState().queue.get(tempId);
        expect(item?.status).toBe("failed");
      });
    });

    it("marks item as failed when entry creation fails", async () => {
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/photo1.jpg");
      mockMapEntryToCreateRequest.mockReturnValue({
        timestamp: "2024-01-15T08:00:00Z",
        notes: "Test meal",
        meal_type: "breakfast",
      });
      mockEntryApiCreate.mockRejectedValue(new Error("API error"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        const item = useUploadQueueStore.getState().queue.get(tempId);
        expect(item?.status).toBe("failed");
      });
    });

    it("marks item as failed when photo attachment fails", async () => {
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/photo1.jpg");
      mockMapEntryToCreateRequest.mockReturnValue({
        timestamp: "2024-01-15T08:00:00Z",
        notes: "Test meal",
        meal_type: "breakfast",
      });
      mockEntryApiCreate.mockResolvedValue({
        id: 123,
        userId: "user_123",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Test meal",
        meal: {
          photoUri: "file:///test.jpg",
          mealType: "breakfast" as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPhotoApiCreatePhoto.mockRejectedValue(new Error("Photo API error"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        const item = useUploadQueueStore.getState().queue.get(tempId);
        expect(item?.status).toBe("failed");
      });
    });

    it("does not remove item from queue on failure", async () => {
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        const item = useUploadQueueStore.getState().queue.get(tempId);
        expect(item?.status).toBe("failed");
      });

      expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(true);
    });

    it("does not invalidate queries on failure", async () => {
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        const state = useUploadQueueStore.getState();
        const item = Array.from(state.queue.values())[0];
        expect(item?.status).toBe("failed");
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("calls onFailed callback on failure", async () => {
      const onFailedMock = jest.fn();
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor({ onFailed: onFailedMock }), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(onFailedMock).toHaveBeenCalledWith(tempId);
      });
    });

    it("does not call onFailed callback on success", async () => {
      const onFailedMock = jest.fn();
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/photo1.jpg");
      mockMapEntryToCreateRequest.mockReturnValue({
        timestamp: "2024-01-15T08:00:00Z",
        notes: "Test meal",
        meal_type: "breakfast",
      });
      mockEntryApiCreate.mockResolvedValue({
        id: 123,
        userId: "user_123",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Test meal",
        meal: {
          photoUri: "file:///test.jpg",
          mealType: "breakfast" as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPhotoApiCreatePhoto.mockResolvedValue({
        id: 1,
        entryId: 123,
        url: "",
        isPrimary: true,
        sortOrder: 0,
        createdAt: new Date(),
      });

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor({ onFailed: onFailedMock }), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(mockEntryApiCreate).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onFailedMock).not.toHaveBeenCalled();
      });
    });

    it("continues processing next item after failure", async () => {
      let callCount = 0;
      mockUploadPhoto.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("First upload failed"));
        }
        return Promise.resolve("https://r2.example.com/photo.jpg");
      });
      mockMapEntryToCreateRequest.mockReturnValue({
        timestamp: "2024-01-15T08:00:00Z",
        notes: "Test meal",
        meal_type: "breakfast",
      });
      mockEntryApiCreate.mockResolvedValue({
        id: 123,
        userId: "user_123",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Test meal",
        meal: {
          photoUri: "file:///test.jpg",
          mealType: "breakfast" as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPhotoApiCreatePhoto.mockResolvedValue({
        id: 1,
        entryId: 123,
        url: "",
        isPrimary: true,
        sortOrder: 0,
        createdAt: new Date(),
      });

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.get(tempId1)?.status).toBe("failed");
      });

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId2)).toBe(false);
      });
    });

    it("logs error to console on failure", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error");
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Upload failed for",
          tempId,
          "Upload failed"
        );
      });
    });
  });

  // =============================================================================
  // Sequential Processing
  // =============================================================================

  describe("sequential processing", () => {
    const mockEntry = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Test meal",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };
    const mockPhotoUris = ["file:///photo1.jpg"];

    beforeEach(() => {
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/photo1.jpg");
      mockMapEntryToCreateRequest.mockReturnValue({
        timestamp: "2024-01-15T08:00:00Z",
        notes: "Test meal",
        meal_type: "breakfast",
      });
      mockEntryApiCreate.mockResolvedValue({
        id: 123,
        userId: "user_123",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Test meal",
        meal: {
          photoUri: "file:///test.jpg",
          mealType: "breakfast" as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPhotoApiCreatePhoto.mockResolvedValue({
        id: 1,
        entryId: 123,
        url: "",
        isPrimary: true,
        sortOrder: 0,
        createdAt: new Date(),
      });
    });

    it("processes multiple items sequentially", async () => {
      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId1)).toBe(false);
      });

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId2)).toBe(false);
      });

      expect(mockEntryApiCreate).toHaveBeenCalledTimes(2);
    });

    it("does not process same item multiple times", async () => {
      let uploadCount = 0;
      mockUploadPhoto.mockImplementation(() => {
        uploadCount++;
        return new Promise((resolve) => {
          setTimeout(() => resolve("https://r2.example.com/photo.jpg"), 100);
        });
      });

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      // Re-render to trigger effect multiple times
      await waitFor(() => {
        expect(uploadCount).toBe(1);
      });

      // Wait for processing to complete
      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
      });

      // Upload should only have been called once
      expect(uploadCount).toBe(1);
    });

    it("handles retry after failure in next processing cycle", async () => {
      let callCount = 0;
      mockUploadPhoto.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("First attempt failed"));
        }
        return Promise.resolve("https://r2.example.com/photo.jpg");
      });

      const { enqueue, retry } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });
      const { rerender } = hookResult;

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");
      });

      // Retry the failed item
      retry(tempId);

      // Force re-render to trigger new processing cycle
      rerender();

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
      });
    });

    it("waits for current item to finish before processing next", async () => {
      let firstItemProcessing = false;
      let secondItemStarted = false;

      mockUploadPhoto.mockImplementation(() => {
        if (!firstItemProcessing) {
          firstItemProcessing = true;
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve("https://r2.example.com/photo1.jpg");
            }, 100);
          });
        } else {
          secondItemStarted = true;
          return Promise.resolve("https://r2.example.com/photo2.jpg");
        }
      });

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      enqueue(mockEntry, mockPhotoUris);
      enqueue(mockEntry, mockPhotoUris);

      // First item should start processing immediately
      await waitFor(() => {
        expect(firstItemProcessing).toBe(true);
      });

      // Second item should not start yet
      expect(secondItemStarted).toBe(false);

      // Wait for first item to complete and second to start
      await waitFor(
        () => {
          expect(secondItemStarted).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe("edge cases", () => {
    const mockEntry = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Test meal",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };
    const mockPhotoUris = ["file:///photo1.jpg"];

    it("handles undefined onFailed callback", async () => {
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");
      });
    });

    it("handles empty options object", async () => {
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/photo1.jpg");
      mockMapEntryToCreateRequest.mockReturnValue({
        timestamp: "2024-01-15T08:00:00Z",
        notes: "Test meal",
        meal_type: "breakfast",
      });
      mockEntryApiCreate.mockResolvedValue({
        id: 123,
        userId: "user_123",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Test meal",
        meal: {
          photoUri: "file:///test.jpg",
          mealType: "breakfast" as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPhotoApiCreatePhoto.mockResolvedValue({
        id: 1,
        entryId: 123,
        url: "",
        isPrimary: true,
        sortOrder: 0,
        createdAt: new Date(),
      });

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor({}), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
      });
    });

    it("does not process items marked as uploading", async () => {
      const { enqueue, markUploading } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markUploading(tempId);

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockUploadPhoto).not.toHaveBeenCalled();
      });
    });

    it("does not process items marked as failed", async () => {
      const { enqueue, markFailed } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markFailed(tempId);

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(mockUploadPhoto).not.toHaveBeenCalled();
      });
    });

    it("handles network errors gracefully", async () => {
      mockUploadPhoto.mockRejectedValue(new Error("Network request failed"));

      const { enqueue } = useUploadQueueStore.getState();

      hookResult = renderHook(() => useUploadProcessor(), {
        wrapper: createWrapper(queryClient),
      });

      const tempId = enqueue(mockEntry, mockPhotoUris);

      await waitFor(() => {
        expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");
      });
    });
  });
});
