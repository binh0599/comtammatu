"use client";
import { create } from "zustand";

interface DateRange {
  from: Date;
  to: Date;
}

interface AdminUiState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Branch filter (for multi-branch admins)
  selectedBranchId: number | null;
  selectBranch: (branchId: number | null) => void;

  // Date range filter (for reports)
  dateRange: DateRange | null;
  setDateRange: (range: DateRange | null) => void;

  // Search
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
}

export const useAdminUiStore = create<AdminUiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  selectedBranchId: null,
  selectBranch: (branchId) => set({ selectedBranchId: branchId }),

  dateRange: null,
  setDateRange: (range) => set({ dateRange: range }),

  globalSearch: "",
  setGlobalSearch: (search) => set({ globalSearch: search }),
}));
