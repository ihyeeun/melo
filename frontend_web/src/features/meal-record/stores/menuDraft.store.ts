import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { MealServingInputMode, MealType } from "@/shared/api/types/api.dto";
import type { MealRecordTransferPreview } from "@/shared/types/mealRecordTransfer";

export type MenuDraftKey = `${string}:${MealType}`;
export function formatMenuDraftKey(date: string, mealType: MealType): MenuDraftKey {
  return `${date}:${mealType}`;
}

export type MenuDraftType = {
  id: number;
  quantity: number;
  mode?: MealServingInputMode;
};

type MenusDraft = {
  existingMenuCount: number;
  existingMenus: MenuDraftType[];
  previewsById: Record<number, MealRecordTransferPreview>;
  image?: string | null;
  serverSignature?: string;
};

type InitDraftParams = {
  key: MenuDraftKey;
  existingMenuCount: number;
  seedMenus?: MenuDraftType[];
  image?: string | null;
  serverSignature?: string;
};

type UpsertMenuParams = {
  key: MenuDraftKey;
  id: number;
  quantity: number;
  mode?: MealServingInputMode;
};

type RemoveMenuParams = {
  key: MenuDraftKey;
  id: number;
};

type RemoveImageParams = {
  key: MenuDraftKey;
};

type UpsertPreviewsParams = {
  key: MenuDraftKey;
  previews: MealRecordTransferPreview[];
};

type MenuDraftStoreState = {
  drafts: Record<MenuDraftKey, MenusDraft>;
  initDraft: (params: InitDraftParams) => void;
  upsertMenu: (params: UpsertMenuParams) => void;
  removeMenu: (params: RemoveMenuParams) => void;
  removeImage: (params: RemoveImageParams) => void;
  upsertPreviews: (params: UpsertPreviewsParams) => void;
  clearDraft: (key: MenuDraftKey) => void;
};

const INIT_DRAFT: MenusDraft = {
  existingMenuCount: 0,
  existingMenus: [],
  previewsById: {},
};

function normalizeDraftImage(image?: string | null) {
  if (typeof image !== "string") {
    return undefined;
  }

  const trimmedImage = image.trim();
  return trimmedImage.length > 0 ? trimmedImage : undefined;
}

function getDraftOrInit(drafts: Record<MenuDraftKey, MenusDraft>, key: MenuDraftKey): MenusDraft {
  return drafts[key] ?? INIT_DRAFT;
}

function normalizeInputMode(mode: MealServingInputMode | null | undefined) {
  if (mode === "weight") {
    return "weight" as const;
  }

  if (mode === "unit") {
    return "unit" as const;
  }

  return undefined;
}

export const useMenuDraftStore = create<MenuDraftStoreState>()(
  devtools(
    (set) => ({
      drafts: {},

      initDraft: ({ key, existingMenuCount, seedMenus, image, serverSignature }) => {
        set((state) => {
          const prev = state.drafts[key];
          const safeCount = Math.max(0, Math.floor(existingMenuCount));
          const normalizedImage = normalizeDraftImage(image);
          const hasDraftPreviews = Object.keys(prev?.previewsById ?? {}).length > 0;
          const hasServerChanged =
            typeof serverSignature === "string" &&
            ((typeof prev?.serverSignature === "string" &&
              prev.serverSignature !== serverSignature) ||
              (prev?.serverSignature === undefined && !hasDraftPreviews));

          if (!prev) {
            return {
              drafts: {
                ...state.drafts,
                [key]: {
                  existingMenuCount: safeCount,
                  existingMenus: [...(seedMenus ?? [])],
                  previewsById: {},
                  image: normalizedImage,
                  serverSignature,
                },
              },
            };
          }

          if (hasServerChanged) {
            return {
              drafts: {
                ...state.drafts,
                [key]: {
                  existingMenuCount: safeCount,
                  existingMenus: [...(seedMenus ?? [])],
                  previewsById: {},
                  image: normalizedImage,
                  serverSignature,
                },
              },
            };
          }

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...prev,
                existingMenuCount: Math.max(prev.existingMenuCount, safeCount),
                image: prev.image !== undefined ? prev.image : normalizedImage,
                serverSignature: serverSignature ?? prev.serverSignature,
              },
            },
          };
        });
      },

      upsertMenu: ({ key, id, quantity, mode }) => {
        set((state) => {
          const draft = state.drafts[key] ?? INIT_DRAFT;
          const safeQuantity =
            typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
              ? Math.round(quantity * 10) / 10
              : 1;
          const normalizedMode = normalizeInputMode(mode);

          const existingIndex = draft.existingMenus.findIndex((menu) => menu.id === id);
          const nextMenus =
            existingIndex < 0
              ? [...draft.existingMenus, { id, quantity: safeQuantity, mode: normalizedMode }]
              : draft.existingMenus.map((menu, index) =>
                  index === existingIndex
                    ? { ...menu, quantity: safeQuantity, mode: normalizedMode ?? menu.mode }
                    : menu,
                );

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...draft,
                existingMenus: nextMenus,
              },
            },
          };
        });
      },

      removeMenu: ({ key, id }) => {
        set((state) => {
          const draft = state.drafts[key];
          if (!draft) {
            return state;
          }

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...draft,
                existingMenus: draft.existingMenus.filter((menu) => menu.id !== id),
              },
            },
          };
        });
      },

      removeImage: ({ key }) => {
        set((state) => {
          const draft = state.drafts[key];
          if (!draft) {
            return state;
          }

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...draft,
                image: null,
              },
            },
          };
        });
      },

      upsertPreviews: ({ key, previews }) => {
        set((state) => {
          if (!Array.isArray(previews) || previews.length === 0) {
            return state;
          }

          const draft = state.drafts[key] ?? INIT_DRAFT;
          const nextPreviews = { ...draft.previewsById };

          previews.forEach((preview) => {
            if (!preview || typeof preview !== "object") {
              return;
            }

            if (
              typeof preview.id !== "number" ||
              !Number.isInteger(preview.id) ||
              preview.id <= 0
            ) {
              return;
            }

            nextPreviews[preview.id] = preview;
          });

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...draft,
                previewsById: nextPreviews,
              },
            },
          };
        });
      },

      clearDraft: (key) => {
        set((state) => {
          const nextDrafts = { ...state.drafts };
          delete nextDrafts[key];

          return {
            drafts: nextDrafts,
          };
        });
      },
    }),
    { name: "MenuDraftStore" },
  ),
);

export const useMenuDraftInit = () => useMenuDraftStore((store) => store.initDraft);
export const useMenuDraftUpsert = () => useMenuDraftStore((store) => store.upsertMenu);
export const useMenuDraftRemove = () => useMenuDraftStore((store) => store.removeMenu);
export const useMenuDraftRemoveImage = () => useMenuDraftStore((store) => store.removeImage);
export const useMenuDraftUpsertPreviews = () => useMenuDraftStore((store) => store.upsertPreviews);
export const useMenuDraftClear = () => useMenuDraftStore((store) => store.clearDraft);

export function useMenuDraft(date: string, mealType: MealType) {
  const key = formatMenuDraftKey(date, mealType);
  return useMenuDraftStore((store) => getDraftOrInit(store.drafts, key));
}

export function useMenuDraftExistingMenuCount(date: string, mealType: MealType) {
  const key = formatMenuDraftKey(date, mealType);
  return useMenuDraftStore((store) => getDraftOrInit(store.drafts, key).existingMenuCount);
}

export function useMenuDraftMenus(date: string, mealType: MealType) {
  const key = formatMenuDraftKey(date, mealType);
  return useMenuDraftStore((store) => getDraftOrInit(store.drafts, key).existingMenus);
}

export function useMenuDraftSelectedCount(date: string, mealType: MealType) {
  const key = formatMenuDraftKey(date, mealType);
  return useMenuDraftStore((store) => getDraftOrInit(store.drafts, key).existingMenus.length);
}
