import { create } from "zustand";
import type { Entry } from "./types";
import { formatDateToString } from "@/shared/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type UploadStatus = "pending" | "uploading" | "failed";

export interface PendingUpload {
  tempId: string;
  status: UploadStatus;
  entry: Omit<Entry, "id" | "createdAt" | "updatedAt">;
  photoUris: string[];
  createdAt: Date;
}

interface UploadQueueState {
  queue: Map<string, PendingUpload>;

  // Actions
  enqueue: (entry: Omit<Entry, "id" | "createdAt" | "updatedAt">, photoUris: string[]) => string;
  markUploading: (tempId: string) => void;
  markFailed: (tempId: string) => void;
  remove: (tempId: string) => void;
  retry: (tempId: string) => void;
  getPendingForDate: (date: Date) => PendingUpload[];
  getNextPending: () => PendingUpload | undefined;
}

// =============================================================================
// STORE
// =============================================================================

let counter = 0;

export const useUploadQueueStore = create<UploadQueueState>((set, get) => ({
  queue: new Map(),

  enqueue: (entry, photoUris) => {
    const tempId = `pending-${Date.now()}-${++counter}`;
    set((state) => {
      const next = new Map(state.queue);
      next.set(tempId, {
        tempId,
        status: "pending",
        entry,
        photoUris,
        createdAt: new Date(),
      });
      return { queue: next };
    });
    return tempId;
  },

  markUploading: (tempId) => {
    set((state) => {
      const item = state.queue.get(tempId);
      if (!item) return state;
      const next = new Map(state.queue);
      next.set(tempId, { ...item, status: "uploading" });
      return { queue: next };
    });
  },

  markFailed: (tempId) => {
    set((state) => {
      const item = state.queue.get(tempId);
      if (!item) return state;
      const next = new Map(state.queue);
      next.set(tempId, { ...item, status: "failed" });
      return { queue: next };
    });
  },

  remove: (tempId) => {
    set((state) => {
      const next = new Map(state.queue);
      next.delete(tempId);
      return { queue: next };
    });
  },

  retry: (tempId) => {
    set((state) => {
      const item = state.queue.get(tempId);
      if (!item || item.status !== "failed") return state;
      const next = new Map(state.queue);
      next.set(tempId, { ...item, status: "pending" });
      return { queue: next };
    });
  },

  getPendingForDate: (date) => {
    const dateStr = formatDateToString(date);
    const items: PendingUpload[] = [];
    for (const item of get().queue.values()) {
      if (formatDateToString(item.entry.timestamp) === dateStr) {
        items.push(item);
      }
    }
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getNextPending: () => {
    for (const item of get().queue.values()) {
      if (item.status === "pending") return item;
    }
    return undefined;
  },
}));
