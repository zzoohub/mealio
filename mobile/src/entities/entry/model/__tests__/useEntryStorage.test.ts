// Mock native modules
jest.mock("react-native", () => ({}));

// Mock dependencies
jest.mock("@/shared/lib/storage", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("@/shared/config", () => ({
  GUEST_LIMITS: {
    MAX_ENTRIES: 10,
  },
  ERROR_MESSAGES: {
    GUEST_ENTRY_LIMIT_REACHED: "Guest entry limit reached",
  },
}));

import { entryStorageUtils } from "../useEntryStorage";
import { useGuestEntryStore } from "../guestEntryStore";
import { storage } from "@/shared/lib/storage";
import type { Entry } from "../types";

const mockStorage = storage as jest.Mocked<typeof storage>;

// Helper function to convert Entry to JSON-serializable format (simulating MMKV storage)
const toStorageFormat = (entry: Entry) => ({
  ...entry,
  timestamp: entry.timestamp.toISOString(),
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
});

describe("entryStorageUtils - guestEntryStore bump integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state AND the bump function
    useGuestEntryStore.setState({
      version: 0,
      bump: () => useGuestEntryStore.setState((s) => ({ version: s.version + 1 })),
    });
    mockStorage.get.mockResolvedValue([]);
    mockStorage.set.mockResolvedValue(undefined);
    mockStorage.remove.mockResolvedValue(undefined);
  });

  // =============================================================================
  // saveEntry - bump integration
  // =============================================================================

  describe("saveEntry", () => {
    const mockEntry = {
      userId: "guest",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Test entry",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };

    it("bumps version after saving entry", async () => {
      const initialVersion = useGuestEntryStore.getState().version;
      expect(initialVersion).toBe(0);

      await entryStorageUtils.saveEntry(mockEntry, false);

      const newVersion = useGuestEntryStore.getState().version;
      expect(newVersion).toBe(1);
    });

    it("bumps version when saving entry as logged in user", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.saveEntry(mockEntry, true);

      expect(useGuestEntryStore.getState().version).toBe(initialVersion + 1);
    });

    it("does not bump version when save fails", async () => {
      mockStorage.set.mockRejectedValueOnce(new Error("Storage error"));
      const initialVersion = useGuestEntryStore.getState().version;

      await expect(
        entryStorageUtils.saveEntry(mockEntry, false)
      ).rejects.toThrow();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("does not bump version when guest entry limit reached", async () => {
      // Mock 10 existing entries (at limit)
      const existingEntries = Array.from({ length: 10 }, (_, i) => ({
        id: `entry_${i}`,
        userId: "guest",
        timestamp: new Date(),
        notes: `Entry ${i}`,
        meal: { photoUri: "file:///test.jpg", mealType: "breakfast" as const },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      mockStorage.get.mockResolvedValueOnce(existingEntries);

      const initialVersion = useGuestEntryStore.getState().version;

      await expect(
        entryStorageUtils.saveEntry(mockEntry, false)
      ).rejects.toThrow("Guest entry limit reached");

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("bumps version multiple times for multiple saves", async () => {
      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(1);

      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(2);

      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(3);
    });

    it("calls storage.set before bumping version", async () => {
      let setCallTime: number | null = null;
      let bumpCallTime: number | null = null;

      mockStorage.set.mockImplementation(async () => {
        setCallTime = Date.now();
      });

      const originalBump = useGuestEntryStore.getState().bump;
      const mockBump = jest.fn(() => {
        bumpCallTime = Date.now();
        originalBump();
      });
      useGuestEntryStore.setState({
        bump: mockBump,
      });

      await entryStorageUtils.saveEntry(mockEntry, false);

      expect(setCallTime).not.toBeNull();
      expect(bumpCallTime).not.toBeNull();
      expect(mockBump).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // updateEntry - bump integration
  // =============================================================================

  describe("updateEntry", () => {
    const existingEntry: Entry = {
      id: "entry_123",
      userId: "guest",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Original notes",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast",
      },
      createdAt: new Date("2024-01-15T08:00:00Z"),
      updatedAt: new Date("2024-01-15T08:00:00Z"),
    };

    it("bumps version after updating entry", async () => {
      mockStorage.get.mockResolvedValueOnce([toStorageFormat(existingEntry)]);
      mockStorage.set.mockResolvedValueOnce(undefined);
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.updateEntry("entry_123", {
        notes: "Updated notes",
      });

      expect(useGuestEntryStore.getState().version).toBe(initialVersion + 1);
    });

    it("does not bump version when entry not found", async () => {
      mockStorage.get.mockResolvedValueOnce([]);
      const initialVersion = useGuestEntryStore.getState().version;

      await expect(
        entryStorageUtils.updateEntry("nonexistent", { notes: "New notes" })
      ).rejects.toThrow("Failed to update entry");

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("does not bump version when update fails", async () => {
      mockStorage.get.mockResolvedValueOnce([toStorageFormat(existingEntry)]);
      mockStorage.set.mockRejectedValueOnce(new Error("Storage error"));
      const initialVersion = useGuestEntryStore.getState().version;

      await expect(
        entryStorageUtils.updateEntry("entry_123", { notes: "New notes" })
      ).rejects.toThrow();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("bumps version for multiple updates", async () => {
      mockStorage.get.mockResolvedValue([toStorageFormat(existingEntry)]);
      mockStorage.set.mockResolvedValue(undefined);

      await entryStorageUtils.updateEntry("entry_123", { notes: "Update 1" });
      expect(useGuestEntryStore.getState().version).toBe(1);

      await entryStorageUtils.updateEntry("entry_123", { notes: "Update 2" });
      expect(useGuestEntryStore.getState().version).toBe(2);

      await entryStorageUtils.updateEntry("entry_123", { notes: "Update 3" });
      expect(useGuestEntryStore.getState().version).toBe(3);
    });

    it("calls storage.set before bumping version", async () => {
      mockStorage.get.mockResolvedValueOnce([toStorageFormat(existingEntry)]);
      let setCallTime: number | null = null;
      let bumpCallTime: number | null = null;

      mockStorage.set.mockImplementation(async () => {
        setCallTime = Date.now();
      });

      const originalBump = useGuestEntryStore.getState().bump;
      const mockBump = jest.fn(() => {
        bumpCallTime = Date.now();
        originalBump();
      });
      useGuestEntryStore.setState({
        bump: mockBump,
      });

      await entryStorageUtils.updateEntry("entry_123", { notes: "Updated" });

      expect(setCallTime).not.toBeNull();
      expect(bumpCallTime).not.toBeNull();
      expect(mockBump).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // deleteEntry - bump integration
  // =============================================================================

  describe("deleteEntry", () => {
    const entries: Entry[] = [
      {
        id: "entry_1",
        userId: "guest",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Entry 1",
        meal: { photoUri: "file:///test1.jpg", mealType: "breakfast" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "entry_2",
        userId: "guest",
        timestamp: new Date("2024-01-15T12:00:00Z"),
        notes: "Entry 2",
        meal: { photoUri: "file:///test2.jpg", mealType: "lunch" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("bumps version after deleting entry", async () => {
      mockStorage.get.mockResolvedValueOnce(entries.map(toStorageFormat));
      mockStorage.set.mockResolvedValueOnce(undefined);
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.deleteEntry("entry_1");

      expect(useGuestEntryStore.getState().version).toBe(initialVersion + 1);
    });

    it("bumps version even when deleting nonexistent entry", async () => {
      mockStorage.get.mockResolvedValueOnce(entries.map(toStorageFormat));
      mockStorage.set.mockResolvedValueOnce(undefined);
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.deleteEntry("nonexistent");

      expect(useGuestEntryStore.getState().version).toBe(initialVersion + 1);
    });

    it("does not bump version when delete fails", async () => {
      mockStorage.get.mockResolvedValueOnce(entries.map(toStorageFormat));
      mockStorage.set.mockRejectedValueOnce(new Error("Storage error"));
      const initialVersion = useGuestEntryStore.getState().version;

      await expect(entryStorageUtils.deleteEntry("entry_1")).rejects.toThrow();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("bumps version for multiple deletes", async () => {
      mockStorage.get.mockResolvedValue(entries.map(toStorageFormat));
      mockStorage.set.mockResolvedValue(undefined);

      await entryStorageUtils.deleteEntry("entry_1");
      expect(useGuestEntryStore.getState().version).toBe(1);

      await entryStorageUtils.deleteEntry("entry_2");
      expect(useGuestEntryStore.getState().version).toBe(2);
    });

    it("calls storage.set before bumping version", async () => {
      mockStorage.get.mockResolvedValueOnce(entries.map(toStorageFormat));
      let setCallTime: number | null = null;
      let bumpCallTime: number | null = null;

      mockStorage.set.mockImplementation(async () => {
        setCallTime = Date.now();
      });

      const originalBump = useGuestEntryStore.getState().bump;
      const mockBump = jest.fn(() => {
        bumpCallTime = Date.now();
        originalBump();
      });
      useGuestEntryStore.setState({
        bump: mockBump,
      });

      await entryStorageUtils.deleteEntry("entry_1");

      expect(setCallTime).not.toBeNull();
      expect(bumpCallTime).not.toBeNull();
      expect(mockBump).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // clearAllEntries - bump integration
  // =============================================================================

  describe("clearAllEntries", () => {
    it("bumps version after clearing all entries", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.clearAllEntries();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion + 1);
    });

    it("does not bump version when clear fails", async () => {
      mockStorage.remove.mockRejectedValueOnce(new Error("Storage error"));
      const initialVersion = useGuestEntryStore.getState().version;

      await expect(entryStorageUtils.clearAllEntries()).rejects.toThrow();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("bumps version only once when called multiple times", async () => {
      await entryStorageUtils.clearAllEntries();
      expect(useGuestEntryStore.getState().version).toBe(1);

      await entryStorageUtils.clearAllEntries();
      expect(useGuestEntryStore.getState().version).toBe(2);
    });

    it("calls storage.remove before bumping version", async () => {
      let removeCallTime: number | null = null;
      let bumpCallTime: number | null = null;

      mockStorage.remove.mockImplementation(async () => {
        removeCallTime = Date.now();
      });

      const originalBump = useGuestEntryStore.getState().bump;
      const mockBump = jest.fn(() => {
        bumpCallTime = Date.now();
        originalBump();
      });
      useGuestEntryStore.setState({
        bump: mockBump,
      });

      await entryStorageUtils.clearAllEntries();

      expect(removeCallTime).not.toBeNull();
      expect(bumpCallTime).not.toBeNull();
      expect(mockBump).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================================================
  // Read Operations - No bump
  // =============================================================================

  describe("read operations do not bump version", () => {
    const mockEntries: Entry[] = [
      {
        id: "entry_1",
        userId: "guest",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        notes: "Entry 1",
        meal: { photoUri: "file:///test1.jpg", mealType: "breakfast" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockStorage.get.mockResolvedValue(mockEntries);
    });

    it("getAllEntries does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getAllEntries();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getEntryById does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getEntryById("entry_1");

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getEntriesFiltered does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getEntriesFiltered({
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getRecentEntries does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getRecentEntries(5);

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getEntriesForDate does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getEntriesForDate(new Date("2024-01-15"));

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getTodaysEntries does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getTodaysEntries();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getNutritionStats does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getNutritionStats(
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("canGuestSaveEntry does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.canGuestSaveEntry(false);

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getGuestEntriesRemaining does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getGuestEntriesRemaining(false);

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });

    it("getEntryCount does not bump version", async () => {
      const initialVersion = useGuestEntryStore.getState().version;

      await entryStorageUtils.getEntryCount();

      expect(useGuestEntryStore.getState().version).toBe(initialVersion);
    });
  });

  // =============================================================================
  // Integration - Complex Scenarios
  // =============================================================================

  describe("complex mutation scenarios", () => {
    const mockEntry = {
      userId: "guest",
      timestamp: new Date("2024-01-15T08:00:00Z"),
      notes: "Test entry",
      meal: {
        photoUri: "file:///test.jpg",
        mealType: "breakfast" as const,
      },
    };

    it("bumps version correctly for save -> update -> delete sequence", async () => {
      // Save - needs 2 get calls (canGuestSaveEntry + getAllEntries)
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      const savedEntry = await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(1);

      // Update
      mockStorage.get.mockResolvedValueOnce([toStorageFormat(savedEntry)]);
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.updateEntry(savedEntry.id, { notes: "Updated" });
      expect(useGuestEntryStore.getState().version).toBe(2);

      // Delete
      mockStorage.get.mockResolvedValueOnce([toStorageFormat(savedEntry)]);
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.deleteEntry(savedEntry.id);
      expect(useGuestEntryStore.getState().version).toBe(3);
    });

    it("bumps version correctly for multiple saves and clears", async () => {
      // First save
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(1);

      // Second save
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(2);

      // Clear
      await entryStorageUtils.clearAllEntries();
      expect(useGuestEntryStore.getState().version).toBe(3);

      // Third save
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(4);
    });

    it("version continues to increment after errors", async () => {
      // First successful save
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(1);

      // Simulate error - storage.set fails
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockRejectedValueOnce(new Error("Storage error"));
      await expect(
        entryStorageUtils.saveEntry(mockEntry, false)
      ).rejects.toThrow();
      expect(useGuestEntryStore.getState().version).toBe(1); // No bump on error

      // Successful operation after error
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(2);
    });

    it("handles interleaved mutations correctly", async () => {
      // Save entry1
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      const entry1 = await entryStorageUtils.saveEntry(mockEntry, false);
      expect(useGuestEntryStore.getState().version).toBe(1);

      // Save entry2
      mockStorage.get.mockResolvedValueOnce([]); // canGuestSaveEntry
      mockStorage.get.mockResolvedValueOnce([]); // getAllEntries
      mockStorage.set.mockResolvedValueOnce(undefined);
      const entry2 = await entryStorageUtils.saveEntry(
        { ...mockEntry, notes: "Entry 2" },
        false
      );
      expect(useGuestEntryStore.getState().version).toBe(2);

      // Update entry1
      mockStorage.get.mockResolvedValueOnce([entry1, entry2].map(toStorageFormat));
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.updateEntry(entry1.id, { notes: "Updated 1" });
      expect(useGuestEntryStore.getState().version).toBe(3);

      // Delete entry2
      mockStorage.get.mockResolvedValueOnce([entry1, entry2].map(toStorageFormat));
      mockStorage.set.mockResolvedValueOnce(undefined);
      await entryStorageUtils.deleteEntry(entry2.id);
      expect(useGuestEntryStore.getState().version).toBe(4);

      // Clear all
      await entryStorageUtils.clearAllEntries();
      expect(useGuestEntryStore.getState().version).toBe(5);
    });
  });
});
