"use client";
import { create } from "zustand";

interface KdsUiState {
  // Sound
  soundEnabled: boolean;
  toggleSound: () => void;

  // View mode
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;

  // Station filter (when viewing all stations)
  selectedStationId: number | null;
  selectStation: (stationId: number | null) => void;

  // Auto-scroll
  autoScroll: boolean;
  toggleAutoScroll: () => void;
}

export const useKdsUiStore = create<KdsUiState>((set) => ({
  soundEnabled: true,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  viewMode: "grid",
  setViewMode: (mode) => set({ viewMode: mode }),

  selectedStationId: null,
  selectStation: (stationId) => set({ selectedStationId: stationId }),

  autoScroll: true,
  toggleAutoScroll: () => set((s) => ({ autoScroll: !s.autoScroll })),
}));
