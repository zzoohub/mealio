// Mock native modules before any imports
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@/lib/storage", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

// Mock @tanstack/react-query — hook uses useQueryClient
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

// Mock entryStorageUtils
jest.mock("../useEntryStorage", () => ({
  entryStorageUtils: {
    getAllEntries: jest.fn(),
    clearAllEntries: jest.fn(),
  },
}));

// Mock entryApi
jest.mock("../../api/entryApi", () => ({
  entryApi: {
    create: jest.fn(),
  },
}));

// Mock photoApi
jest.mock("../../api/photoApi", () => ({
  photoApi: {
    createPhoto: jest.fn(),
  },
}));

// Mock shared/api — uploadPhoto and mapEntryToCreateRequest
jest.mock("@/shared/api", () => ({
  uploadPhoto: jest.fn(),
  mapEntryToCreateRequest: jest.fn(),
}));

// Mock shared/config — queryKeys
jest.mock("@/shared/config", () => ({
  queryKeys: {
    diary: {
      all: () => ["diary"] as const,
    },
    statistics: {
      all: () => ["statistics"] as const,
    },
  },
}));

import { renderHook, act } from "@testing-library/react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useMigration } from "../useMigration";
import { entryStorageUtils } from "../useEntryStorage";
import { entryApi } from "../../api/entryApi";
import { photoApi } from "../../api/photoApi";
import { uploadPhoto, mapEntryToCreateRequest } from "@/shared/api";
import type { Entry } from "../types";

// =============================================================================
// TYPED MOCKS
// =============================================================================

const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const mockGetAllEntries = entryStorageUtils.getAllEntries as jest.MockedFunction<
  typeof entryStorageUtils.getAllEntries
>;
const mockClearAllEntries = entryStorageUtils.clearAllEntries as jest.MockedFunction<
  typeof entryStorageUtils.clearAllEntries
>;
const mockEntryApiCreate = entryApi.create as jest.MockedFunction<typeof entryApi.create>;
const mockPhotoApiCreatePhoto = photoApi.createPhoto as jest.MockedFunction<
  typeof photoApi.createPhoto
>;
const mockUploadPhoto = uploadPhoto as jest.MockedFunction<typeof uploadPhoto>;
const mockMapEntryToCreateRequest = mapEntryToCreateRequest as jest.MockedFunction<
  typeof mapEntryToCreateRequest
>;

// =============================================================================
// HELPERS
// =============================================================================

function buildEntry(overrides: Partial<Entry> & { meal?: Partial<Entry["meal"]> } = {}): Entry {
  const { meal: mealOverride, ...rest } = overrides;
  return {
    id: "entry_001",
    userId: "guest",
    timestamp: new Date("2024-03-01T12:00:00Z"),
    notes: "Test entry",
    meal: {
      photoUri: "",
      mealType: "lunch" as const,
      ...(mealOverride ?? {}),
    },
    createdAt: new Date("2024-03-01T12:00:00Z"),
    updatedAt: new Date("2024-03-01T12:00:00Z"),
    ...rest,
  };
}

const mockCreatedEntry = {
  id: 99,
  userId: "user_1",
  timestamp: new Date("2024-03-01T12:00:00Z"),
  notes: "Test entry",
  meal: { photoUri: "", mealType: "lunch" as const },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateRequest = {
  timestamp: "2024-03-01T12:00:00.000Z",
  notes: "Test entry",
  meal_type: "lunch",
};

const mockPhotoResponse = {
  id: 1,
  entryId: 99,
  url: "https://r2.example.com/photo.jpg",
  isPrimary: true,
  sortOrder: 0,
  createdAt: new Date(),
};

function createMockQueryClient() {
  return {
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
  };
}

// =============================================================================
// SETUP
// =============================================================================

describe("useMigration", () => {
  let mockQueryClient: ReturnType<typeof createMockQueryClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryClient = createMockQueryClient();
    mockUseQueryClient.mockReturnValue(mockQueryClient as any);

    // Default: no local entries
    mockGetAllEntries.mockResolvedValue([]);
    mockClearAllEntries.mockResolvedValue(undefined);

    // Default: create returns a server entry
    mockEntryApiCreate.mockResolvedValue(mockCreatedEntry as any);

    // Default: attach photo returns a photo response
    mockPhotoApiCreatePhoto.mockResolvedValue(mockPhotoResponse as any);

    // Default: upload returns an R2 URL
    mockUploadPhoto.mockResolvedValue("https://r2.example.com/photo.jpg");

    // Default: mapper returns a create request
    mockMapEntryToCreateRequest.mockReturnValue(mockCreateRequest as any);
  });

  // =============================================================================
  // Initial State
  // =============================================================================

  describe("initial state", () => {
    it("returns localEntryCount of 0 initially", () => {
      const { result } = renderHook(() => useMigration());
      expect(result.current.localEntryCount).toBe(0);
    });

    it("returns isMigrating as false initially", () => {
      const { result } = renderHook(() => useMigration());
      expect(result.current.isMigrating).toBe(false);
    });

    it("returns migrationError as null initially", () => {
      const { result } = renderHook(() => useMigration());
      expect(result.current.migrationError).toBeNull();
    });

    it("exposes checkLocalEntries function", () => {
      const { result } = renderHook(() => useMigration());
      expect(typeof result.current.checkLocalEntries).toBe("function");
    });

    it("exposes migrateLocalEntries function", () => {
      const { result } = renderHook(() => useMigration());
      expect(typeof result.current.migrateLocalEntries).toBe("function");
    });
  });

  // =============================================================================
  // checkLocalEntries
  // =============================================================================

  describe("checkLocalEntries", () => {
    it("returns 0 when there are no local entries", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      let count: number;
      await act(async () => {
        count = await result.current.checkLocalEntries();
      });

      expect(count!).toBe(0);
    });

    it("returns the correct count when entries exist", async () => {
      mockGetAllEntries.mockResolvedValue([buildEntry(), buildEntry({ id: "entry_002" })]);
      const { result } = renderHook(() => useMigration());

      let count: number;
      await act(async () => {
        count = await result.current.checkLocalEntries();
      });

      expect(count!).toBe(2);
    });

    it("updates localEntryCount state after check", async () => {
      mockGetAllEntries.mockResolvedValue([buildEntry(), buildEntry({ id: "entry_002" })]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.checkLocalEntries();
      });

      expect(result.current.localEntryCount).toBe(2);
    });

    it("calls entryStorageUtils.getAllEntries", async () => {
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.checkLocalEntries();
      });

      expect(mockGetAllEntries).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // migrateLocalEntries — no entries
  // =============================================================================

  describe("migrateLocalEntries with no entries", () => {
    it("clears local storage even with zero entries", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockClearAllEntries).toHaveBeenCalledTimes(1);
    });

    it("invalidates diary queries when no entries to migrate", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["diary"],
        refetchType: "all",
      });
    });

    it("invalidates statistics queries when no entries to migrate", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["statistics"],
        refetchType: "all",
      });
    });

    it("does not call uploadPhoto when no entries", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockUploadPhoto).not.toHaveBeenCalled();
    });

    it("does not call entryApi.create when no entries", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockEntryApiCreate).not.toHaveBeenCalled();
    });

    it("sets localEntryCount to 0 after migration", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(result.current.localEntryCount).toBe(0);
    });

    it("isMigrating is false after migration completes", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(result.current.isMigrating).toBe(false);
    });
  });

  // =============================================================================
  // migrateLocalEntries — entries with photoUris array
  // =============================================================================

  describe("migrateLocalEntries with entries having photoUris array", () => {
    const photoUri1 = "file:///photo1.jpg";
    const photoUri2 = "file:///photo2.jpg";
    const uploadedUrl1 = "https://r2.example.com/photo1.jpg";
    const uploadedUrl2 = "https://r2.example.com/photo2.jpg";

    beforeEach(() => {
      mockUploadPhoto.mockImplementation((uri: string) => {
        if (uri === photoUri1) return Promise.resolve(uploadedUrl1);
        if (uri === photoUri2) return Promise.resolve(uploadedUrl2);
        return Promise.resolve("https://r2.example.com/unknown.jpg");
      });
    });

    it("uploads each photo in photoUris array", async () => {
      const entry = buildEntry({
        meal: { photoUri: photoUri1, photoUris: [photoUri1, photoUri2], mealType: "breakfast" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      // uploadPhoto is called via photoUris.map(uploadPhoto), so receives (uri, index, array)
      expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
      expect(mockUploadPhoto).toHaveBeenCalledWith(photoUri1, 0, [photoUri1, photoUri2]);
      expect(mockUploadPhoto).toHaveBeenCalledWith(photoUri2, 1, [photoUri1, photoUri2]);
    });

    it("attaches photos to the created entry with correct params", async () => {
      const entry = buildEntry({
        meal: { photoUri: photoUri1, photoUris: [photoUri1, photoUri2], mealType: "breakfast" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockPhotoApiCreatePhoto).toHaveBeenCalledWith(mockCreatedEntry.id, {
        url: uploadedUrl1,
        is_primary: true,
        sort_order: 0,
      });
      expect(mockPhotoApiCreatePhoto).toHaveBeenCalledWith(mockCreatedEntry.id, {
        url: uploadedUrl2,
        is_primary: false,
        sort_order: 1,
      });
    });

    it("marks first photo as primary (is_primary: true)", async () => {
      const entry = buildEntry({
        meal: { photoUri: photoUri1, photoUris: [photoUri1, photoUri2], mealType: "breakfast" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      const firstCall = mockPhotoApiCreatePhoto.mock.calls[0]!;
      expect(firstCall[1].is_primary).toBe(true);
    });

    it("marks subsequent photos as non-primary (is_primary: false)", async () => {
      const entry = buildEntry({
        meal: { photoUri: photoUri1, photoUris: [photoUri1, photoUri2], mealType: "breakfast" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      const secondCall = mockPhotoApiCreatePhoto.mock.calls[1]!;
      expect(secondCall[1].is_primary).toBe(false);
    });

    it("sets sort_order based on photo index", async () => {
      const photoUri3 = "file:///photo3.jpg";
      const uploadedUrl3 = "https://r2.example.com/photo3.jpg";
      mockUploadPhoto.mockImplementation((uri: string) => {
        const map: Record<string, string> = {
          [photoUri1]: uploadedUrl1,
          [photoUri2]: uploadedUrl2,
          [photoUri3]: uploadedUrl3,
        };
        return Promise.resolve(map[uri] ?? "https://r2.example.com/unknown.jpg");
      });

      const entry = buildEntry({
        meal: {
          photoUri: photoUri1,
          photoUris: [photoUri1, photoUri2, photoUri3],
          mealType: "breakfast" as const,
        },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      const calls = mockPhotoApiCreatePhoto.mock.calls;
      expect(calls[0]![1].sort_order).toBe(0);
      expect(calls[1]![1].sort_order).toBe(1);
      expect(calls[2]![1].sort_order).toBe(2);
    });

    it("creates the server entry using the mapped request", async () => {
      const entry = buildEntry({
        meal: { photoUri: photoUri1, photoUris: [photoUri1], mealType: "breakfast" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockMapEntryToCreateRequest).toHaveBeenCalledWith(entry);
      expect(mockEntryApiCreate).toHaveBeenCalledWith(mockCreateRequest);
    });

    it("calls photoApi.createPhoto once per uploaded photo", async () => {
      const entry = buildEntry({
        meal: { photoUri: photoUri1, photoUris: [photoUri1, photoUri2], mealType: "breakfast" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockPhotoApiCreatePhoto).toHaveBeenCalledTimes(2);
    });
  });

  // =============================================================================
  // migrateLocalEntries — entries with single photoUri only
  // =============================================================================

  describe("migrateLocalEntries with entries having single photoUri only", () => {
    const singlePhotoUri = "file:///single-photo.jpg";
    const uploadedUrl = "https://r2.example.com/single-photo.jpg";

    beforeEach(() => {
      mockUploadPhoto.mockResolvedValue(uploadedUrl);
    });

    it("falls back to photoUri when photoUris is undefined", async () => {
      const entry = buildEntry({
        meal: { photoUri: singlePhotoUri, mealType: "dinner" as const },
        // photoUris intentionally absent
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      // uploadPhoto is called via [singlePhotoUri].map(uploadPhoto), so (uri, 0, array)
      expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
      expect(mockUploadPhoto).toHaveBeenCalledWith(singlePhotoUri, 0, [singlePhotoUri]);
    });

    it("falls back to photoUri when photoUris is an empty array", async () => {
      const entry = buildEntry({
        meal: { photoUri: singlePhotoUri, photoUris: [], mealType: "dinner" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      // uploadPhoto is called via [singlePhotoUri].map(uploadPhoto), so (uri, 0, array)
      expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
      expect(mockUploadPhoto).toHaveBeenCalledWith(singlePhotoUri, 0, [singlePhotoUri]);
    });

    it("attaches the single photo as primary with sort_order 0", async () => {
      const entry = buildEntry({
        meal: { photoUri: singlePhotoUri, mealType: "dinner" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockPhotoApiCreatePhoto).toHaveBeenCalledTimes(1);
      expect(mockPhotoApiCreatePhoto).toHaveBeenCalledWith(mockCreatedEntry.id, {
        url: uploadedUrl,
        is_primary: true,
        sort_order: 0,
      });
    });

    it("creates the server entry correctly", async () => {
      const entry = buildEntry({
        meal: { photoUri: singlePhotoUri, mealType: "dinner" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockEntryApiCreate).toHaveBeenCalledTimes(1);
      expect(mockEntryApiCreate).toHaveBeenCalledWith(mockCreateRequest);
    });
  });

  // =============================================================================
  // migrateLocalEntries — entries with no photos
  // =============================================================================

  describe("migrateLocalEntries with entries having no photos", () => {
    it("skips uploadPhoto when photoUri is empty string and photoUris is absent", async () => {
      const entry = buildEntry({
        meal: { photoUri: "", mealType: "snack" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockUploadPhoto).not.toHaveBeenCalled();
    });

    it("skips photoApi.createPhoto when no photos exist", async () => {
      const entry = buildEntry({
        meal: { photoUri: "", mealType: "snack" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockPhotoApiCreatePhoto).not.toHaveBeenCalled();
    });

    it("still creates the server entry even with no photos", async () => {
      const entry = buildEntry({
        meal: { photoUri: "", mealType: "snack" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockEntryApiCreate).toHaveBeenCalledTimes(1);
    });

    it("skips upload when photoUris is empty array and photoUri is empty", async () => {
      const entry = buildEntry({
        meal: { photoUri: "", photoUris: [], mealType: "snack" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockUploadPhoto).not.toHaveBeenCalled();
    });
  });

  // =============================================================================
  // migrateLocalEntries — mixed entries
  // =============================================================================

  describe("migrateLocalEntries with mixed entries", () => {
    it("processes all entries: with photos, single photo, and no photos", async () => {
      const entryWithMultiplePhotos = buildEntry({
        id: "entry_multi",
        meal: {
          photoUri: "file:///a.jpg",
          photoUris: ["file:///a.jpg", "file:///b.jpg"],
          mealType: "breakfast" as const,
        },
      });
      const entryWithSinglePhoto = buildEntry({
        id: "entry_single",
        meal: { photoUri: "file:///c.jpg", mealType: "lunch" as const },
      });
      const entryWithNoPhoto = buildEntry({
        id: "entry_none",
        meal: { photoUri: "", mealType: "dinner" as const },
      });

      mockGetAllEntries.mockResolvedValue([
        entryWithMultiplePhotos,
        entryWithSinglePhoto,
        entryWithNoPhoto,
      ]);
      mockUploadPhoto.mockImplementation((uri: string) =>
        Promise.resolve(`https://r2.example.com/${uri.split("/").pop()}`)
      );

      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      // 2 uploads for multi-photo entry + 1 for single-photo entry + 0 for no-photo entry
      expect(mockUploadPhoto).toHaveBeenCalledTimes(3);
      // 3 entries created
      expect(mockEntryApiCreate).toHaveBeenCalledTimes(3);
      // 2 photo attachments for multi-photo + 1 for single-photo + 0 for no-photo
      expect(mockPhotoApiCreatePhoto).toHaveBeenCalledTimes(3);
    });

    it("clears local storage once after all entries are migrated", async () => {
      const entries = [
        buildEntry({ id: "entry_1" }),
        buildEntry({ id: "entry_2" }),
        buildEntry({ id: "entry_3" }),
      ];
      mockGetAllEntries.mockResolvedValue(entries);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockClearAllEntries).toHaveBeenCalledTimes(1);
    });

    it("invalidates both diary and statistics queries exactly once", async () => {
      const entries = [buildEntry({ id: "entry_1" }), buildEntry({ id: "entry_2" })];
      mockGetAllEntries.mockResolvedValue(entries);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["diary"],
        refetchType: "all",
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["statistics"],
        refetchType: "all",
      });
    });

    it("processes entries sequentially in order", async () => {
      const callOrder: string[] = [];
      const entry1 = buildEntry({ id: "entry_1", notes: "first" });
      const entry2 = buildEntry({ id: "entry_2", notes: "second" });

      mockMapEntryToCreateRequest.mockImplementation((entry: any) => {
        callOrder.push(entry.notes as string);
        return mockCreateRequest;
      });
      mockGetAllEntries.mockResolvedValue([entry1, entry2]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(callOrder).toEqual(["first", "second"]);
    });
  });

  // =============================================================================
  // migrateLocalEntries — isMigrating state
  // =============================================================================

  describe("isMigrating state transitions", () => {
    it("sets isMigrating to false after successful migration", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(result.current.isMigrating).toBe(false);
    });

    it("sets isMigrating to false after failed migration", async () => {
      mockGetAllEntries.mockRejectedValue(new Error("Storage failure"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        try {
          await result.current.migrateLocalEntries();
        } catch {
          // expected to throw
        }
      });

      expect(result.current.isMigrating).toBe(false);
    });
  });

  // =============================================================================
  // Error handling
  // =============================================================================

  describe("error handling", () => {
    it("throws and sets migrationError when getAllEntries fails", async () => {
      mockGetAllEntries.mockRejectedValue(new Error("Storage read error"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await expect(result.current.migrateLocalEntries()).rejects.toThrow("Storage read error");
      });

      expect(result.current.migrationError).toBe("Storage read error");
    });

    it("throws and sets migrationError when uploadPhoto fails", async () => {
      const entry = buildEntry({
        meal: { photoUri: "file:///photo.jpg", mealType: "lunch" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockUploadPhoto.mockRejectedValue(new Error("Upload failed"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await expect(result.current.migrateLocalEntries()).rejects.toThrow("Upload failed");
      });

      expect(result.current.migrationError).toBe("Upload failed");
    });

    it("throws and sets migrationError when entryApi.create fails", async () => {
      const entry = buildEntry({
        meal: { photoUri: "", mealType: "lunch" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockEntryApiCreate.mockRejectedValue(new Error("API create failed"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await expect(result.current.migrateLocalEntries()).rejects.toThrow("API create failed");
      });

      expect(result.current.migrationError).toBe("API create failed");
    });

    it("throws and sets migrationError when photoApi.createPhoto fails", async () => {
      const entry = buildEntry({
        meal: { photoUri: "file:///photo.jpg", mealType: "lunch" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/photo.jpg");
      mockPhotoApiCreatePhoto.mockRejectedValue(new Error("Photo attach failed"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await expect(result.current.migrateLocalEntries()).rejects.toThrow("Photo attach failed");
      });

      expect(result.current.migrationError).toBe("Photo attach failed");
    });

    it("does NOT clear local storage when migration fails partway through", async () => {
      const entry = buildEntry({
        meal: { photoUri: "file:///photo.jpg", mealType: "lunch" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockUploadPhoto.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        try {
          await result.current.migrateLocalEntries();
        } catch {
          // expected
        }
      });

      expect(mockClearAllEntries).not.toHaveBeenCalled();
    });

    it("does NOT invalidate queries when migration fails", async () => {
      const entry = buildEntry({
        meal: { photoUri: "file:///photo.jpg", mealType: "lunch" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockUploadPhoto.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        try {
          await result.current.migrateLocalEntries();
        } catch {
          // expected
        }
      });

      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("uses a generic message for non-Error exceptions", async () => {
      mockGetAllEntries.mockRejectedValue("raw string error");
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        try {
          await result.current.migrateLocalEntries();
        } catch {
          // expected
        }
      });

      expect(result.current.migrationError).toBe("Migration failed");
    });

    it("resets migrationError to null at the start of a new migration attempt", async () => {
      // First attempt fails
      mockGetAllEntries.mockRejectedValueOnce(new Error("First failure"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        try {
          await result.current.migrateLocalEntries();
        } catch {
          // expected
        }
      });
      expect(result.current.migrationError).toBe("First failure");

      // Second attempt succeeds
      mockGetAllEntries.mockResolvedValueOnce([]);
      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(result.current.migrationError).toBeNull();
    });

    it("isMigrating returns to false in finally block on upload error", async () => {
      const entry = buildEntry({
        meal: { photoUri: "file:///photo.jpg", mealType: "breakfast" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockUploadPhoto.mockRejectedValue(new Error("Upload error"));
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        try {
          await result.current.migrateLocalEntries();
        } catch {
          // expected
        }
      });

      expect(result.current.isMigrating).toBe(false);
    });
  });

  // =============================================================================
  // Query cache invalidation
  // =============================================================================

  describe("query cache invalidation", () => {
    it("invalidates diary query with refetchType: all", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["diary"],
        refetchType: "all",
      });
    });

    it("invalidates statistics query with refetchType: all", async () => {
      mockGetAllEntries.mockResolvedValue([]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["statistics"],
        refetchType: "all",
      });
    });

    it("invalidates queries after clearing local storage (correct order)", async () => {
      const callOrder: string[] = [];
      mockGetAllEntries.mockResolvedValue([]);
      mockClearAllEntries.mockImplementation(async () => {
        callOrder.push("clearAllEntries");
      });
      mockQueryClient.invalidateQueries.mockImplementation(async () => {
        callOrder.push("invalidateQueries");
      });

      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(callOrder[0]).toBe("clearAllEntries");
      expect(callOrder[1]).toBe("invalidateQueries");
    });
  });

  // =============================================================================
  // Local storage cleared after success
  // =============================================================================

  describe("local storage cleared after success", () => {
    it("sets localEntryCount to 0 after successful migration with entries", async () => {
      const entries = [buildEntry({ id: "e1" }), buildEntry({ id: "e2" })];
      mockGetAllEntries.mockResolvedValue(entries);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(result.current.localEntryCount).toBe(0);
    });

    it("calls clearAllEntries exactly once regardless of entry count", async () => {
      const entries = [
        buildEntry({ id: "e1" }),
        buildEntry({ id: "e2" }),
        buildEntry({ id: "e3" }),
      ];
      mockGetAllEntries.mockResolvedValue(entries);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockClearAllEntries).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // Photo URI priority: photoUris vs photoUri
  // =============================================================================

  describe("photo URI source selection", () => {
    it("prefers photoUris array over single photoUri when photoUris is non-empty", async () => {
      const uris = ["file:///primary.jpg", "file:///secondary.jpg"];
      const entry = buildEntry({
        meal: {
          photoUri: "file:///fallback.jpg",
          photoUris: uris,
          mealType: "lunch" as const,
        },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/x.jpg");
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      // uploadPhoto is called via photoUris.map(uploadPhoto), so (uri, index, array)
      expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
      expect(mockUploadPhoto).toHaveBeenCalledWith("file:///primary.jpg", 0, uris);
      expect(mockUploadPhoto).toHaveBeenCalledWith("file:///secondary.jpg", 1, uris);
      // fallback photoUri must NOT be uploaded
      expect(mockUploadPhoto).not.toHaveBeenCalledWith("file:///fallback.jpg", expect.anything(), expect.anything());
    });

    it("uses photoUri as sole source when photoUris is absent", async () => {
      const soloUri = "file:///only-one.jpg";
      const entry = buildEntry({
        meal: {
          photoUri: soloUri,
          mealType: "dinner" as const,
          // photoUris deliberately omitted
        },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      mockUploadPhoto.mockResolvedValue("https://r2.example.com/only-one.jpg");
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      // uploadPhoto is called via [soloUri].map(uploadPhoto), so (uri, 0, array)
      expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
      expect(mockUploadPhoto).toHaveBeenCalledWith(soloUri, 0, [soloUri]);
    });

    it("produces zero uploads when both photoUris is empty array and photoUri is empty", async () => {
      const entry = buildEntry({
        meal: { photoUri: "", photoUris: [], mealType: "snack" as const },
      });
      mockGetAllEntries.mockResolvedValue([entry]);
      const { result } = renderHook(() => useMigration());

      await act(async () => {
        await result.current.migrateLocalEntries();
      });

      expect(mockUploadPhoto).not.toHaveBeenCalled();
      expect(mockPhotoApiCreatePhoto).not.toHaveBeenCalled();
    });
  });
});
