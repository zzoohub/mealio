import { create } from "zustand";

interface GuestEntryStore {
  /** Incremented on every guest MMKV mutation so subscribers re-render. */
  version: number;
  bump: () => void;
}

export const useGuestEntryStore = create<GuestEntryStore>()((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
