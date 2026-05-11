import { create } from "zustand";
import { devtools } from "zustand/middleware";

type BrandSearchSelection = {
  brand: string;
  selectedAt: number;
};

type BrandSearchSelectionStoreState = {
  selections: Record<string, BrandSearchSelection>;
  setSelection: (key: string, brand: string) => void;
  clearSelection: (key: string) => void;
};

export function createBrandSearchSelectionKey() {
  return `${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

export const useBrandSearchSelectionStore = create<BrandSearchSelectionStoreState>()(
  devtools((set) => ({
    selections: {},

    setSelection: (key, brand) => {
      const normalizedBrand = brand.trim();
      if (!key || !normalizedBrand) {
        return;
      }

      set((state) => ({
        selections: {
          ...state.selections,
          [key]: {
            brand: normalizedBrand,
            selectedAt: Date.now(),
          },
        },
      }));
    },

    clearSelection: (key) => {
      if (!key) {
        return;
      }

      set((state) => {
        if (!state.selections[key]) {
          return state;
        }

        const nextSelections = { ...state.selections };
        delete nextSelections[key];

        return {
          selections: nextSelections,
        };
      });
    },
  })),
);

export function useBrandSearchSelectedBrand(key: string) {
  return useBrandSearchSelectionStore((state) => state.selections[key]?.brand);
}

export function useSetBrandSearchSelection() {
  return useBrandSearchSelectionStore((state) => state.setSelection);
}

export function useClearBrandSearchSelection() {
  return useBrandSearchSelectionStore((state) => state.clearSelection);
}
