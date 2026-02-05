import { useGuestEntryStore } from "../guestEntryStore";

describe("guestEntryStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useGuestEntryStore.setState({ version: 0 });
  });

  // =============================================================================
  // Initial State
  // =============================================================================

  describe("initial state", () => {
    it("starts with version 0", () => {
      const state = useGuestEntryStore.getState();
      expect(state.version).toBe(0);
    });

    it("has bump function defined", () => {
      const state = useGuestEntryStore.getState();
      expect(typeof state.bump).toBe("function");
    });
  });

  // =============================================================================
  // bump() Functionality
  // =============================================================================

  describe("bump", () => {
    it("increments version from 0 to 1", () => {
      const { bump } = useGuestEntryStore.getState();
      bump();
      const state = useGuestEntryStore.getState();
      expect(state.version).toBe(1);
    });

    it("increments version from 1 to 2", () => {
      useGuestEntryStore.setState({ version: 1 });
      const { bump } = useGuestEntryStore.getState();
      bump();
      const state = useGuestEntryStore.getState();
      expect(state.version).toBe(2);
    });

    it("increments version multiple times", () => {
      const { bump } = useGuestEntryStore.getState();
      bump();
      bump();
      bump();
      const state = useGuestEntryStore.getState();
      expect(state.version).toBe(3);
    });

    it("increments version sequentially", () => {
      const { bump } = useGuestEntryStore.getState();
      for (let i = 1; i <= 10; i++) {
        bump();
        expect(useGuestEntryStore.getState().version).toBe(i);
      }
    });

    it("handles large version numbers", () => {
      useGuestEntryStore.setState({ version: 999 });
      const { bump } = useGuestEntryStore.getState();
      bump();
      const state = useGuestEntryStore.getState();
      expect(state.version).toBe(1000);
    });
  });

  // =============================================================================
  // State Isolation
  // =============================================================================

  describe("state isolation", () => {
    it("maintains version state across multiple calls", () => {
      const state1 = useGuestEntryStore.getState();
      state1.bump();
      const state2 = useGuestEntryStore.getState();
      expect(state2.version).toBe(1);
    });

    it("version is accessible from different getState calls", () => {
      useGuestEntryStore.getState().bump();
      const version1 = useGuestEntryStore.getState().version;
      const version2 = useGuestEntryStore.getState().version;
      expect(version1).toBe(version2);
      expect(version1).toBe(1);
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe("edge cases", () => {
    it("handles negative version numbers", () => {
      useGuestEntryStore.setState({ version: -5 });
      const { bump } = useGuestEntryStore.getState();
      bump();
      expect(useGuestEntryStore.getState().version).toBe(-4);
    });

    it("handles zero version after bump and reset", () => {
      useGuestEntryStore.getState().bump();
      expect(useGuestEntryStore.getState().version).toBe(1);
      useGuestEntryStore.setState({ version: 0 });
      expect(useGuestEntryStore.getState().version).toBe(0);
    });

    it("bump does not affect other state properties", () => {
      const { bump } = useGuestEntryStore.getState();
      bump();
      const state = useGuestEntryStore.getState();
      expect(state.bump).toBeDefined();
      expect(typeof state.bump).toBe("function");
    });
  });

  // =============================================================================
  // Concurrent Operations
  // =============================================================================

  describe("concurrent operations", () => {
    it("handles rapid consecutive bump calls", () => {
      const { bump } = useGuestEntryStore.getState();
      bump();
      bump();
      bump();
      bump();
      bump();
      expect(useGuestEntryStore.getState().version).toBe(5);
    });

    it("version increments correctly when called in sequence", () => {
      const iterations = 100;
      const { bump } = useGuestEntryStore.getState();
      for (let i = 0; i < iterations; i++) {
        bump();
      }
      expect(useGuestEntryStore.getState().version).toBe(iterations);
    });
  });
});
