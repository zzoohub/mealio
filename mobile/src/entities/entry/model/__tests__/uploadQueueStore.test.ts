// Mock native modules before imports
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
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

import { useUploadQueueStore } from "../uploadQueueStore";
import type { PendingUpload } from "../uploadQueueStore";

describe("uploadQueueStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useUploadQueueStore.setState({ queue: new Map() });
  });

  // =============================================================================
  // Initial State
  // =============================================================================

  describe("initial state", () => {
    it("starts with empty queue", () => {
      const state = useUploadQueueStore.getState();
      expect(state.queue.size).toBe(0);
    });

    it("has all required functions defined", () => {
      const state = useUploadQueueStore.getState();
      expect(typeof state.enqueue).toBe("function");
      expect(typeof state.markUploading).toBe("function");
      expect(typeof state.markFailed).toBe("function");
      expect(typeof state.remove).toBe("function");
      expect(typeof state.retry).toBe("function");
      expect(typeof state.getPendingForDate).toBe("function");
      expect(typeof state.getNextPending).toBe("function");
    });
  });

  // =============================================================================
  // enqueue() Functionality
  // =============================================================================

  describe("enqueue", () => {
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

    it("adds item to queue with pending status", () => {
      const { enqueue } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      const state = useUploadQueueStore.getState();
      expect(state.queue.size).toBe(1);

      const item = state.queue.get(tempId);
      expect(item).toBeDefined();
      expect(item?.status).toBe("pending");
    });

    it("returns unique tempId with pending- prefix", () => {
      const { enqueue } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      expect(tempId).toMatch(/^pending-\d+-\d+$/);
    });

    it("generates unique tempIds for multiple enqueues", () => {
      const { enqueue } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);

      expect(tempId1).not.toBe(tempId2);
      expect(tempId2).not.toBe(tempId3);
      expect(tempId1).not.toBe(tempId3);
    });

    it("stores entry data correctly", () => {
      const { enqueue } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.entry).toEqual(mockEntry);
      expect(item?.photoUris).toEqual(mockPhotoUris);
      expect(item?.tempId).toBe(tempId);
    });

    it("sets createdAt timestamp", () => {
      const beforeTime = new Date();
      const { enqueue } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      const afterTime = new Date();

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.createdAt).toBeDefined();
      expect(item?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(item?.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("handles empty photo uris array", () => {
      const { enqueue } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, []);

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.photoUris).toEqual([]);
    });

    it("handles multiple photo uris", () => {
      const { enqueue } = useUploadQueueStore.getState();
      const manyPhotos = [
        "file:///photo1.jpg",
        "file:///photo2.jpg",
        "file:///photo3.jpg",
        "file:///photo4.jpg",
        "file:///photo5.jpg",
      ];
      const tempId = enqueue(mockEntry, manyPhotos);

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.photoUris).toEqual(manyPhotos);
    });

    it("allows multiple items in queue", () => {
      const { enqueue } = useUploadQueueStore.getState();
      enqueue(mockEntry, mockPhotoUris);
      enqueue(mockEntry, mockPhotoUris);
      enqueue(mockEntry, mockPhotoUris);

      const state = useUploadQueueStore.getState();
      expect(state.queue.size).toBe(3);
    });
  });

  // =============================================================================
  // markUploading() Functionality
  // =============================================================================

  describe("markUploading", () => {
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

    it("changes status from pending to uploading", () => {
      const { enqueue, markUploading } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      markUploading(tempId);

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.status).toBe("uploading");
    });

    it("preserves all other item properties", () => {
      const { enqueue, markUploading } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      const beforeItem = useUploadQueueStore.getState().queue.get(tempId);

      markUploading(tempId);

      const afterItem = useUploadQueueStore.getState().queue.get(tempId);
      expect(afterItem?.tempId).toBe(beforeItem?.tempId);
      expect(afterItem?.entry).toEqual(beforeItem?.entry);
      expect(afterItem?.photoUris).toEqual(beforeItem?.photoUris);
      expect(afterItem?.createdAt).toEqual(beforeItem?.createdAt);
    });

    it("does nothing when tempId not found", () => {
      const { enqueue, markUploading } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      const stateBefore = useUploadQueueStore.getState();

      markUploading("nonexistent-id");

      const stateAfter = useUploadQueueStore.getState();
      expect(stateAfter.queue.size).toBe(stateBefore.queue.size);
      expect(stateAfter.queue.get(tempId)?.status).toBe("pending");
    });

    it("can mark already uploading item as uploading", () => {
      const { enqueue, markUploading } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      markUploading(tempId);
      markUploading(tempId);

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.status).toBe("uploading");
    });

    it("can change failed item to uploading", () => {
      const { enqueue, markUploading, markFailed } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      markFailed(tempId);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");

      markUploading(tempId);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("uploading");
    });

    it("does not affect other items in queue", () => {
      const { enqueue, markUploading } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);

      markUploading(tempId2);

      expect(useUploadQueueStore.getState().queue.get(tempId1)?.status).toBe("pending");
      expect(useUploadQueueStore.getState().queue.get(tempId2)?.status).toBe("uploading");
      expect(useUploadQueueStore.getState().queue.get(tempId3)?.status).toBe("pending");
    });
  });

  // =============================================================================
  // markFailed() Functionality
  // =============================================================================

  describe("markFailed", () => {
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

    it("changes status from pending to failed", () => {
      const { enqueue, markFailed } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      markFailed(tempId);

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.status).toBe("failed");
    });

    it("changes status from uploading to failed", () => {
      const { enqueue, markUploading, markFailed } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      markUploading(tempId);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("uploading");

      markFailed(tempId);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");
    });

    it("preserves all other item properties", () => {
      const { enqueue, markFailed } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      const beforeItem = useUploadQueueStore.getState().queue.get(tempId);

      markFailed(tempId);

      const afterItem = useUploadQueueStore.getState().queue.get(tempId);
      expect(afterItem?.tempId).toBe(beforeItem?.tempId);
      expect(afterItem?.entry).toEqual(beforeItem?.entry);
      expect(afterItem?.photoUris).toEqual(beforeItem?.photoUris);
      expect(afterItem?.createdAt).toEqual(beforeItem?.createdAt);
    });

    it("does nothing when tempId not found", () => {
      const { enqueue, markFailed } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      const stateBefore = useUploadQueueStore.getState();

      markFailed("nonexistent-id");

      const stateAfter = useUploadQueueStore.getState();
      expect(stateAfter.queue.size).toBe(stateBefore.queue.size);
      expect(stateAfter.queue.get(tempId)?.status).toBe("pending");
    });

    it("can mark already failed item as failed", () => {
      const { enqueue, markFailed } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      markFailed(tempId);
      markFailed(tempId);

      const item = useUploadQueueStore.getState().queue.get(tempId);
      expect(item?.status).toBe("failed");
    });

    it("does not affect other items in queue", () => {
      const { enqueue, markFailed } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);

      markFailed(tempId2);

      expect(useUploadQueueStore.getState().queue.get(tempId1)?.status).toBe("pending");
      expect(useUploadQueueStore.getState().queue.get(tempId2)?.status).toBe("failed");
      expect(useUploadQueueStore.getState().queue.get(tempId3)?.status).toBe("pending");
    });
  });

  // =============================================================================
  // remove() Functionality
  // =============================================================================

  describe("remove", () => {
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

    it("removes item from queue", () => {
      const { enqueue, remove } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      expect(useUploadQueueStore.getState().queue.size).toBe(1);

      remove(tempId);

      expect(useUploadQueueStore.getState().queue.size).toBe(0);
      expect(useUploadQueueStore.getState().queue.get(tempId)).toBeUndefined();
    });

    it("removes item with pending status", () => {
      const { enqueue, remove } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      remove(tempId);

      expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
    });

    it("removes item with uploading status", () => {
      const { enqueue, markUploading, remove } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markUploading(tempId);

      remove(tempId);

      expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
    });

    it("removes item with failed status", () => {
      const { enqueue, markFailed, remove } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markFailed(tempId);

      remove(tempId);

      expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(false);
    });

    it("does nothing when tempId not found", () => {
      const { enqueue, remove } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      remove("nonexistent-id");

      expect(useUploadQueueStore.getState().queue.size).toBe(1);
      expect(useUploadQueueStore.getState().queue.has(tempId)).toBe(true);
    });

    it("can remove multiple times without error", () => {
      const { enqueue, remove } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      remove(tempId);
      remove(tempId);
      remove(tempId);

      expect(useUploadQueueStore.getState().queue.size).toBe(0);
    });

    it("does not affect other items in queue", () => {
      const { enqueue, remove } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);

      remove(tempId2);

      expect(useUploadQueueStore.getState().queue.size).toBe(2);
      expect(useUploadQueueStore.getState().queue.has(tempId1)).toBe(true);
      expect(useUploadQueueStore.getState().queue.has(tempId2)).toBe(false);
      expect(useUploadQueueStore.getState().queue.has(tempId3)).toBe(true);
    });

    it("can remove all items one by one", () => {
      const { enqueue, remove } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);

      remove(tempId1);
      expect(useUploadQueueStore.getState().queue.size).toBe(2);

      remove(tempId2);
      expect(useUploadQueueStore.getState().queue.size).toBe(1);

      remove(tempId3);
      expect(useUploadQueueStore.getState().queue.size).toBe(0);
    });
  });

  // =============================================================================
  // retry() Functionality
  // =============================================================================

  describe("retry", () => {
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

    it("changes failed status back to pending", () => {
      const { enqueue, markFailed, retry } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markFailed(tempId);

      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");

      retry(tempId);

      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("pending");
    });

    it("does not change uploading status (only failed can be retried)", () => {
      const { enqueue, markUploading, retry } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markUploading(tempId);

      retry(tempId);

      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("uploading");
    });

    it("does not change pending status (only failed can be retried)", () => {
      const { enqueue, retry } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      retry(tempId);

      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("pending");
    });

    it("preserves all other item properties", () => {
      const { enqueue, markFailed, retry } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markFailed(tempId);
      const beforeItem = useUploadQueueStore.getState().queue.get(tempId);

      retry(tempId);

      const afterItem = useUploadQueueStore.getState().queue.get(tempId);
      expect(afterItem?.tempId).toBe(beforeItem?.tempId);
      expect(afterItem?.entry).toEqual(beforeItem?.entry);
      expect(afterItem?.photoUris).toEqual(beforeItem?.photoUris);
      expect(afterItem?.createdAt).toEqual(beforeItem?.createdAt);
    });

    it("does nothing when tempId not found", () => {
      const { enqueue, markFailed, retry } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      markFailed(tempId);

      retry("nonexistent-id");

      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");
    });

    it("does not affect other items in queue", () => {
      const { enqueue, markFailed, retry } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);

      markFailed(tempId1);
      markFailed(tempId2);
      markFailed(tempId3);

      retry(tempId2);

      expect(useUploadQueueStore.getState().queue.get(tempId1)?.status).toBe("failed");
      expect(useUploadQueueStore.getState().queue.get(tempId2)?.status).toBe("pending");
      expect(useUploadQueueStore.getState().queue.get(tempId3)?.status).toBe("failed");
    });
  });

  // =============================================================================
  // getPendingForDate() Functionality
  // =============================================================================

  describe("getPendingForDate", () => {
    const mockEntry1 = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Breakfast",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };
    const mockEntry2 = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T12:00:00Z"),
      notes: "Lunch",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "lunch" as const,
      },
    };
    const mockEntry3 = {
      userId: "user_123",
      timestamp: new Date("2024-01-16T08:00:00Z"),
      notes: "Next day breakfast",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };
    const mockPhotoUris = ["file:///photo1.jpg"];

    it("returns empty array when queue is empty", () => {
      const { getPendingForDate } = useUploadQueueStore.getState();
      const result = getPendingForDate(new Date("2024-01-15"));

      expect(result).toEqual([]);
    });

    it("returns items matching the date", () => {
      const { enqueue, getPendingForDate } = useUploadQueueStore.getState();
      enqueue(mockEntry1, mockPhotoUris);
      enqueue(mockEntry2, mockPhotoUris);
      enqueue(mockEntry3, mockPhotoUris);

      const result = getPendingForDate(new Date("2024-01-15"));

      expect(result).toHaveLength(2);
      expect(result[0]?.entry.notes).toMatch(/Breakfast|Lunch/);
      expect(result[1]?.entry.notes).toMatch(/Breakfast|Lunch/);
    });

    it("returns empty array when no items match the date", () => {
      const { enqueue, getPendingForDate } = useUploadQueueStore.getState();
      enqueue(mockEntry1, mockPhotoUris);
      enqueue(mockEntry2, mockPhotoUris);

      const result = getPendingForDate(new Date("2024-01-20"));

      expect(result).toEqual([]);
    });

    it("filters by entry timestamp date only, ignoring time", () => {
      const { enqueue, getPendingForDate } = useUploadQueueStore.getState();
      enqueue(mockEntry1, mockPhotoUris); // 08:00
      enqueue(mockEntry2, mockPhotoUris); // 12:00

      const result = getPendingForDate(new Date("2024-01-15T12:00:00Z"));

      expect(result).toHaveLength(2);
    });

    it("returns items sorted by createdAt descending (newest first)", () => {
      const { enqueue, getPendingForDate } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);

      // Manually set different createdAt times to ensure consistent ordering
      const state = useUploadQueueStore.getState();
      const item1 = state.queue.get(tempId1);
      if (item1) {
        const earlierTime = new Date(item1.createdAt.getTime() - 1000);
        state.queue.set(tempId1, { ...item1, createdAt: earlierTime });
      }

      const tempId2 = enqueue(mockEntry2, mockPhotoUris);

      const result = getPendingForDate(new Date("2024-01-15"));

      expect(result).toHaveLength(2);
      // Second item should be first (newer)
      expect(result[0]?.tempId).toBe(tempId2);
      expect(result[1]?.tempId).toBe(tempId1);
    });

    it("includes items with all statuses (pending, uploading, failed)", () => {
      const { enqueue, markUploading, markFailed, getPendingForDate } =
        useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);
      const tempId2 = enqueue(mockEntry2, mockPhotoUris);
      // Create a third entry with same date (2024-01-15) but different time
      // Use 06:00 UTC to ensure it stays on same local date regardless of timezone
      const mockEntry3SameDate = {
        ...mockEntry1,
        timestamp: new Date("2024-01-15T06:00:00Z"),
        notes: "Early breakfast",
      };
      const tempId3 = enqueue(mockEntry3SameDate, mockPhotoUris);

      markUploading(tempId1);
      markFailed(tempId2);
      // tempId3 remains pending

      const result = getPendingForDate(new Date("2024-01-15"));

      expect(result).toHaveLength(3);
      expect(result.find((item) => item.tempId === tempId1)?.status).toBe("uploading");
      expect(result.find((item) => item.tempId === tempId2)?.status).toBe("failed");
      expect(result.find((item) => item.tempId === tempId3)?.status).toBe("pending");
    });

    it("returns items from different dates separately", () => {
      const { enqueue, getPendingForDate } = useUploadQueueStore.getState();
      enqueue(mockEntry1, mockPhotoUris);
      enqueue(mockEntry2, mockPhotoUris);
      enqueue(mockEntry3, mockPhotoUris);

      const result1 = getPendingForDate(new Date("2024-01-15"));
      const result2 = getPendingForDate(new Date("2024-01-16"));

      expect(result1).toHaveLength(2);
      expect(result2).toHaveLength(1);
    });

    it("handles date with different timezone offsets", () => {
      const { enqueue, getPendingForDate } = useUploadQueueStore.getState();
      enqueue(mockEntry1, mockPhotoUris);

      // Same date, different time representation
      const result = getPendingForDate(new Date("2024-01-15T00:00:00-05:00"));

      expect(result).toHaveLength(1);
    });
  });

  // =============================================================================
  // getNextPending() Functionality
  // =============================================================================

  describe("getNextPending", () => {
    const mockEntry1 = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Entry 1",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };
    const mockEntry2 = {
      userId: "user_123",
      timestamp: new Date("2024-01-15T12:00:00Z"),
      notes: "Entry 2",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "lunch" as const,
      },
    };
    const mockPhotoUris = ["file:///photo1.jpg"];

    it("returns undefined when queue is empty", () => {
      const { getNextPending } = useUploadQueueStore.getState();
      const result = getNextPending();

      expect(result).toBeUndefined();
    });

    it("returns first pending item", () => {
      const { enqueue, getNextPending } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry1, mockPhotoUris);

      const result = getNextPending();

      expect(result).toBeDefined();
      expect(result?.tempId).toBe(tempId);
      expect(result?.status).toBe("pending");
    });

    it("returns first pending item when multiple exist", () => {
      const { enqueue, getNextPending } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);
      enqueue(mockEntry2, mockPhotoUris);

      const result = getNextPending();

      // Map iteration order is insertion order in JavaScript
      expect(result?.tempId).toBe(tempId1);
    });

    it("skips uploading items", () => {
      const { enqueue, markUploading, getNextPending } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);
      const tempId2 = enqueue(mockEntry2, mockPhotoUris);

      markUploading(tempId1);

      const result = getNextPending();

      expect(result?.tempId).toBe(tempId2);
      expect(result?.status).toBe("pending");
    });

    it("skips failed items", () => {
      const { enqueue, markFailed, getNextPending } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);
      const tempId2 = enqueue(mockEntry2, mockPhotoUris);

      markFailed(tempId1);

      const result = getNextPending();

      expect(result?.tempId).toBe(tempId2);
      expect(result?.status).toBe("pending");
    });

    it("returns undefined when all items are uploading", () => {
      const { enqueue, markUploading, getNextPending } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);
      const tempId2 = enqueue(mockEntry2, mockPhotoUris);

      markUploading(tempId1);
      markUploading(tempId2);

      const result = getNextPending();

      expect(result).toBeUndefined();
    });

    it("returns undefined when all items are failed", () => {
      const { enqueue, markFailed, getNextPending } = useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);
      const tempId2 = enqueue(mockEntry2, mockPhotoUris);

      markFailed(tempId1);
      markFailed(tempId2);

      const result = getNextPending();

      expect(result).toBeUndefined();
    });

    it("returns pending item after retry", () => {
      const { enqueue, markFailed, retry, getNextPending } =
        useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry1, mockPhotoUris);

      markFailed(tempId);
      expect(getNextPending()).toBeUndefined();

      retry(tempId);
      const result = getNextPending();

      expect(result?.tempId).toBe(tempId);
      expect(result?.status).toBe("pending");
    });

    it("returns first pending when mixed statuses exist", () => {
      const { enqueue, markUploading, markFailed, getNextPending } =
        useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry1, mockPhotoUris);
      const tempId2 = enqueue(mockEntry2, mockPhotoUris);
      const tempId3 = enqueue(mockEntry1, mockPhotoUris);

      markUploading(tempId1);
      markFailed(tempId2);
      // tempId3 is pending

      const result = getNextPending();

      expect(result?.tempId).toBe(tempId3);
      expect(result?.status).toBe("pending");
    });
  });

  // =============================================================================
  // Integration - Complex Scenarios
  // =============================================================================

  describe("complex upload queue scenarios", () => {
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

    it("handles full lifecycle: enqueue -> uploading -> remove", () => {
      const { enqueue, markUploading, remove } = useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      expect(useUploadQueueStore.getState().queue.size).toBe(1);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("pending");

      markUploading(tempId);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("uploading");

      remove(tempId);
      expect(useUploadQueueStore.getState().queue.size).toBe(0);
    });

    it("handles failure and retry lifecycle", () => {
      const { enqueue, markUploading, markFailed, retry, getNextPending } =
        useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);

      markUploading(tempId);
      expect(getNextPending()).toBeUndefined();

      markFailed(tempId);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("failed");
      expect(getNextPending()).toBeUndefined();

      retry(tempId);
      expect(useUploadQueueStore.getState().queue.get(tempId)?.status).toBe("pending");
      expect(getNextPending()?.tempId).toBe(tempId);
    });

    it("maintains correct queue state with multiple concurrent items", () => {
      const { enqueue, markUploading, markFailed, remove, getNextPending } =
        useUploadQueueStore.getState();
      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);
      const tempId4 = enqueue(mockEntry, mockPhotoUris);

      // Simulate different states
      markUploading(tempId1);
      markFailed(tempId2);
      // tempId3 stays pending
      remove(tempId4);

      expect(useUploadQueueStore.getState().queue.size).toBe(3);
      expect(getNextPending()?.tempId).toBe(tempId3);
    });

    it("handles rapid enqueue and remove operations", () => {
      const { enqueue, remove } = useUploadQueueStore.getState();
      const ids: string[] = [];

      for (let i = 0; i < 10; i++) {
        ids.push(enqueue(mockEntry, mockPhotoUris));
      }

      expect(useUploadQueueStore.getState().queue.size).toBe(10);

      for (let i = 0; i < 5; i++) {
        remove(ids[i]!);
      }

      expect(useUploadQueueStore.getState().queue.size).toBe(5);
    });

    it("getPendingForDate works with mixed statuses", () => {
      const { enqueue, markUploading, markFailed, getPendingForDate } =
        useUploadQueueStore.getState();

      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);
      const tempId3 = enqueue(mockEntry, mockPhotoUris);

      markUploading(tempId1);
      markFailed(tempId2);

      const result = getPendingForDate(new Date("2024-01-15"));

      expect(result).toHaveLength(3);
      expect(result.some((item) => item.status === "uploading")).toBe(true);
      expect(result.some((item) => item.status === "failed")).toBe(true);
      expect(result.some((item) => item.status === "pending")).toBe(true);
    });

    it("handles queue operations with no pending items", () => {
      const { enqueue, markUploading, markFailed, getNextPending } =
        useUploadQueueStore.getState();

      const tempId1 = enqueue(mockEntry, mockPhotoUris);
      const tempId2 = enqueue(mockEntry, mockPhotoUris);

      markUploading(tempId1);
      markFailed(tempId2);

      expect(getNextPending()).toBeUndefined();
      expect(useUploadQueueStore.getState().queue.size).toBe(2);
    });

    it("maintains data integrity after multiple state changes", () => {
      const { enqueue, markUploading, markFailed, retry } =
        useUploadQueueStore.getState();
      const tempId = enqueue(mockEntry, mockPhotoUris);
      const originalItem = useUploadQueueStore.getState().queue.get(tempId);

      markUploading(tempId);
      markFailed(tempId);
      retry(tempId);
      markUploading(tempId);

      const finalItem = useUploadQueueStore.getState().queue.get(tempId);

      expect(finalItem?.entry).toEqual(originalItem?.entry);
      expect(finalItem?.photoUris).toEqual(originalItem?.photoUris);
      expect(finalItem?.createdAt).toEqual(originalItem?.createdAt);
      expect(finalItem?.tempId).toBe(originalItem?.tempId);
    });
  });
});
