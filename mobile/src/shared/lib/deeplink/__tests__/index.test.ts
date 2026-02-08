// Mock storage before imports
jest.mock("@/shared/lib/storage", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

import { setPendingDeepLink, consumePendingDeepLink } from "../index";
import { storage } from "@/shared/lib/storage";

describe("deeplink helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setPendingDeepLink", () => {
    it("stores the path with batching disabled", () => {
      setPendingDeepLink("/diary/123");

      expect(storage.set).toHaveBeenCalledWith(
        "pending_deep_link",
        "/diary/123",
        { enableBatching: false }
      );
    });

    it("handles empty path", () => {
      setPendingDeepLink("");

      expect(storage.set).toHaveBeenCalledWith(
        "pending_deep_link",
        "",
        { enableBatching: false }
      );
    });

    it("handles complex paths", () => {
      setPendingDeepLink("/diary/456?tab=nutrition");

      expect(storage.set).toHaveBeenCalledWith(
        "pending_deep_link",
        "/diary/456?tab=nutrition",
        { enableBatching: false }
      );
    });
  });

  describe("consumePendingDeepLink", () => {
    it("retrieves and removes stored path", () => {
      (storage.get as jest.Mock).mockReturnValue("/diary/123");

      const result = consumePendingDeepLink();

      expect(storage.get).toHaveBeenCalledWith("pending_deep_link");
      expect(storage.remove).toHaveBeenCalledWith("pending_deep_link");
      expect(result).toBe("/diary/123");
    });

    it("returns null when no path is stored", () => {
      (storage.get as jest.Mock).mockReturnValue(null);

      const result = consumePendingDeepLink();

      expect(storage.get).toHaveBeenCalledWith("pending_deep_link");
      expect(storage.remove).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("returns undefined when path is undefined", () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      const result = consumePendingDeepLink();

      expect(storage.get).toHaveBeenCalledWith("pending_deep_link");
      expect(storage.remove).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("handles complex paths", () => {
      (storage.get as jest.Mock).mockReturnValue("/diary/456?tab=nutrition");

      const result = consumePendingDeepLink();

      expect(storage.remove).toHaveBeenCalledWith("pending_deep_link");
      expect(result).toBe("/diary/456?tab=nutrition");
    });

    it("does not remove path when it is an empty string (falsy)", () => {
      (storage.get as jest.Mock).mockReturnValue("");

      const result = consumePendingDeepLink();

      expect(storage.get).toHaveBeenCalledWith("pending_deep_link");
      expect(storage.remove).not.toHaveBeenCalled();
      expect(result).toBe("");
    });
  });
});
