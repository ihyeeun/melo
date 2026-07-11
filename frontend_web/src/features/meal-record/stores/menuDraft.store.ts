import { useEffect } from "react";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import {
  getCurrentMealRecordTime,
  normalizeMealRecordTime,
} from "@/features/meal-record/utils/mealRecordTime";
import {
  buildMenuDraftSignature,
  toMenuDraftSeed,
} from "@/features/meal-record/utils/menuDraftSync";
import {
  type MealServingInputMode,
  type MealTime,
  type MealType,
  MENU_INPUT_MODE,
} from "@/shared/api/types/api.dto";
import type { RegisterMealRequestDto } from "@/shared/api/types/api.request.dto";
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
  mealTime?: string;
  serverSignature?: string;
};

type SyncDraftFromServerParams = {
  key: MenuDraftKey;
  existingMenuCount: number;
  seedMenus?: MenuDraftType[];
  image?: string | null;
  mealTime?: string | null;
  serverSignature?: string;
};

type SyncMenuDraftWithDayMealsParams = {
  dateKey: string;
  mealType: MealType;
  dayMeals?: DayMealSummary | null;
  enabled?: boolean;
};

type ReplaceDraftParams = {
  key: MenuDraftKey;
  menus: MenuDraftType[];
  existingMenuCount?: number;
  image?: string | null;
  mealTime?: string | null;
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

type SetMealTimeParams = {
  key: MenuDraftKey;
  mealTime: string;
};

type PrepareRegisterRequestParams = {
  dateKey: string;
  mealType: MealType;
  menus: MenuDraftType[];
  image?: string | null;
  mealTime?: string | null;
};

type BuildRegisterRequestParams = {
  dateKey: string;
  mealType: MealType;
  fallbackImage?: string | null;
  fallbackMealTime?: string | null;
};

type UpsertPreviewsParams = {
  key: MenuDraftKey;
  previews: MealRecordTransferPreview[];
};

type MenuDraftStoreState = {
  drafts: Record<MenuDraftKey, MenusDraft>;
  syncDraftFromServer: (params: SyncDraftFromServerParams) => void;
  replaceDraft: (params: ReplaceDraftParams) => void;
  upsertMenu: (params: UpsertMenuParams) => void;
  removeMenu: (params: RemoveMenuParams) => void;
  removeImage: (params: RemoveImageParams) => void;
  setMealTime: (params: SetMealTimeParams) => void;
  prepareRegisterRequest: (params: PrepareRegisterRequestParams) => RegisterMealRequestDto;
  buildRegisterRequest: (params: BuildRegisterRequestParams) => RegisterMealRequestDto;
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

function toMealInputMode(mode: MealServingInputMode | undefined) {
  return mode === "unit" ? MENU_INPUT_MODE.UNIT : MENU_INPUT_MODE.WEIGHT;
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

function toSafeExistingMenuCount(existingMenuCount: number | undefined, menuCount: number) {
  const count = existingMenuCount ?? menuCount;

  return Math.max(0, Math.floor(count));
}

export function mergeMenuDraftMenus({
  baseMenus,
  overrideMenus,
  candidateIds = overrideMenus.map((menu) => menu.id),
}: {
  baseMenus: MenuDraftType[];
  overrideMenus: MenuDraftType[];
  candidateIds?: number[];
}) {
  const candidateIdSet = new Set(candidateIds);
  const menuById = new Map<number, MenuDraftType>();

  baseMenus
    .filter((menu) => !candidateIdSet.has(menu.id))
    .forEach((menu) => {
      menuById.set(menu.id, menu);
    });

  overrideMenus.forEach((menu) => {
    menuById.set(menu.id, {
      id: menu.id,
      quantity: menu.quantity,
      mode: normalizeInputMode(menu.mode),
    });
  });

  return [...menuById.values()];
}

function buildRegisterRequestFromDraft({
  dateKey,
  mealType,
  draft,
  fallbackImage,
  fallbackMealTime,
}: BuildRegisterRequestParams & { draft: MenusDraft }): RegisterMealRequestDto {
  const image = draft.image === null ? undefined : normalizeDraftImage(draft.image ?? fallbackImage);

  return {
    date: dateKey,
    time: Number(mealType) as MealTime,
    meal_time:
      normalizeMealRecordTime(draft.mealTime) ??
      normalizeMealRecordTime(fallbackMealTime) ??
      getCurrentMealRecordTime(),
    menu_ids: draft.existingMenus.map((menu) => menu.id),
    menu_quantities: draft.existingMenus.map((menu) => menu.quantity),
    menu_input_modes: draft.existingMenus.map((menu) => toMealInputMode(menu.mode)),
    ...(image ? { image } : {}),
  };
}

export const useMenuDraftStore = create<MenuDraftStoreState>()(
  devtools(
    (set, get) => ({
      drafts: {},

      syncDraftFromServer: ({
        key,
        existingMenuCount,
        seedMenus,
        image,
        mealTime,
        serverSignature,
      }) => {
        set((state) => {
          const prev = state.drafts[key];
          const safeCount = toSafeExistingMenuCount(existingMenuCount, seedMenus?.length ?? 0);
          const normalizedImage = normalizeDraftImage(image);
          const normalizedMealTime = normalizeMealRecordTime(mealTime);
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
                  mealTime: normalizedMealTime ?? undefined,
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
                  mealTime: normalizedMealTime ?? undefined,
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
                mealTime: prev.mealTime ?? normalizedMealTime ?? undefined,
                serverSignature: serverSignature ?? prev.serverSignature,
              },
            },
          };
        });
      },

      replaceDraft: ({ key, menus, existingMenuCount, image, mealTime, serverSignature }) => {
        set((state) => {
          const normalizedImage = normalizeDraftImage(image);
          const normalizedMealTime = normalizeMealRecordTime(mealTime);

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                existingMenuCount: toSafeExistingMenuCount(existingMenuCount, menus.length),
                existingMenus: [...menus],
                previewsById: {},
                image: normalizedImage,
                mealTime: normalizedMealTime ?? undefined,
                serverSignature,
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

      setMealTime: ({ key, mealTime }) => {
        set((state) => {
          const draft = state.drafts[key] ?? INIT_DRAFT;
          const normalizedMealTime = normalizeMealRecordTime(mealTime);

          if (!normalizedMealTime) {
            return state;
          }

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...draft,
                mealTime: normalizedMealTime,
              },
            },
          };
        });
      },

      prepareRegisterRequest: ({ dateKey, mealType, menus, image, mealTime }) => {
        const key = formatMenuDraftKey(dateKey, mealType);
        const normalizedImage = normalizeDraftImage(image);
        const normalizedMealTime = normalizeMealRecordTime(mealTime);

        set((state) => {
          const prev = state.drafts[key] ?? INIT_DRAFT;

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...prev,
                existingMenuCount: menus.length,
                existingMenus: [...menus],
                image: normalizedImage,
                mealTime: normalizedMealTime ?? undefined,
              },
            },
          };
        });

        return get().buildRegisterRequest({
          dateKey,
          mealType,
          fallbackImage: image,
          fallbackMealTime: mealTime,
        });
      },

      buildRegisterRequest: ({ dateKey, mealType, fallbackImage, fallbackMealTime }) => {
        const key = formatMenuDraftKey(dateKey, mealType);
        const draft = getDraftOrInit(get().drafts, key);

        return buildRegisterRequestFromDraft({
          dateKey,
          mealType,
          draft,
          fallbackImage,
          fallbackMealTime,
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

export const useMenuDraftReplace = () => useMenuDraftStore((store) => store.replaceDraft);
export const useMenuDraftUpsert = () => useMenuDraftStore((store) => store.upsertMenu);
export const useMenuDraftRemove = () => useMenuDraftStore((store) => store.removeMenu);
export const useMenuDraftRemoveImage = () => useMenuDraftStore((store) => store.removeImage);
export const useMenuDraftSetMealTime = () => useMenuDraftStore((store) => store.setMealTime);
export const useMenuDraftPrepareRegisterRequest = () =>
  useMenuDraftStore((store) => store.prepareRegisterRequest);
export const useMenuDraftBuildRegisterRequest = () =>
  useMenuDraftStore((store) => store.buildRegisterRequest);
export const useMenuDraftUpsertPreviews = () => useMenuDraftStore((store) => store.upsertPreviews);
export const useMenuDraftClear = () => useMenuDraftStore((store) => store.clearDraft);

export function useSyncMenuDraftWithDayMeals({
  dateKey,
  dayMeals,
  enabled = true,
  mealType,
}: SyncMenuDraftWithDayMealsParams) {
  const syncDraftFromServer = useMenuDraftStore((store) => store.syncDraftFromServer);

  useEffect(() => {
    if (!enabled || !dayMeals || dateKey.trim().length === 0) {
      return;
    }

    const key = formatMenuDraftKey(dateKey, mealType);
    const seedMenus = dayMeals.menusByTime[mealType].map(toMenuDraftSeed);
    const image = dayMeals.imagesByTime[mealType];
    const mealTime = dayMeals.mealRecordMealTimesByTime[mealType];

    syncDraftFromServer({
      key,
      existingMenuCount: seedMenus.length,
      seedMenus,
      image,
      mealTime,
      serverSignature: buildMenuDraftSignature({
        menus: seedMenus,
        image,
        mealTime,
      }),
    });
  }, [dateKey, dayMeals, enabled, mealType, syncDraftFromServer]);
}

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
