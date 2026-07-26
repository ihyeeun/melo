import { useEffect } from "react";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import { MAX_MEAL_RECORD_MENUS } from "@/features/meal-record/constants/menu.constants";
import {
  getCurrentMealRecordTime,
  normalizeMealRecordTime,
} from "@/features/meal-record/utils/mealRecordTime";
import {
  buildMenuDraftSignature,
  type MenuSetDraftSeed,
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

export type MenuSetDraftType = MenuSetDraftSeed & {
  menu_names: string[];
};

type MenusDraft = {
  existingMenuCount: number;
  existingMenus: MenuDraftType[];
  existingMenuSets: MenuSetDraftType[];
  previewsById: Record<number, MealRecordTransferPreview>;
  image?: string | null;
  mealTime?: string;
  serverSignature?: string;
};

type SyncDraftFromServerParams = {
  key: MenuDraftKey;
  existingMenuCount: number;
  seedMenus?: MenuDraftType[];
  seedMenuSets?: MenuSetDraftType[];
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
  menuSets?: MenuSetDraftType[];
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

type ApplyMenuSetParams = {
  key: MenuDraftKey;
  menuSet: MenuSetDraftType;
};

type RemoveMenuSetParams = {
  key: MenuDraftKey;
  setId: number;
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
  menuSets?: MenuSetDraftType[];
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

export const APPLY_MENU_SET_RESULT = {
  APPLIED: "applied",
  INVALID: "invalid",
  LIMIT_EXCEEDED: "limit_exceeded",
} as const;

export type ApplyMenuSetResult =
  (typeof APPLY_MENU_SET_RESULT)[keyof typeof APPLY_MENU_SET_RESULT];

type MenuDraftStoreState = {
  drafts: Record<MenuDraftKey, MenusDraft>;
  syncDraftFromServer: (params: SyncDraftFromServerParams) => void;
  replaceDraft: (params: ReplaceDraftParams) => void;
  upsertMenu: (params: UpsertMenuParams) => void;
  removeMenu: (params: RemoveMenuParams) => void;
  applyMenuSet: (params: ApplyMenuSetParams) => ApplyMenuSetResult;
  removeMenuSet: (params: RemoveMenuSetParams) => void;
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
  existingMenuSets: [],
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

function toPositiveInt(value: number) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeMenuSetDraft(menuSet: MenuSetDraftType) {
  const setId = toPositiveInt(menuSet.set_id);
  if (setId === null) {
    return null;
  }

  const setName = typeof menuSet.set_name === "string" ? menuSet.set_name.trim() : "";
  if (setName.length === 0) {
    return null;
  }

  const menuIds = Array.isArray(menuSet.menu_ids)
    ? [...new Set(menuSet.menu_ids.filter((id) => toPositiveInt(id) !== null))]
    : [];
  const menuNames = Array.isArray(menuSet.menu_names)
    ? menuSet.menu_names
        .filter((name) => typeof name === "string" && name.trim().length > 0)
        .map((name) => name.trim())
    : [];
  const totalCalories =
    typeof menuSet.total_calories === "number" && Number.isFinite(menuSet.total_calories)
      ? Math.max(0, menuSet.total_calories)
      : 0;

  return {
    set_id: setId,
    set_name: setName,
    menu_ids: menuIds,
    menu_names: menuNames,
    total_calories: totalCalories,
  };
}

function normalizeMenuSetDrafts(menuSets: MenuSetDraftType[] | undefined) {
  const menuSetById = new Map<number, MenuSetDraftType>();

  menuSets?.forEach((menuSet) => {
    const normalizedMenuSet = normalizeMenuSetDraft(menuSet);
    if (!normalizedMenuSet) {
      return;
    }

    menuSetById.set(normalizedMenuSet.set_id, normalizedMenuSet);
  });

  return [...menuSetById.values()];
}

function getMenuSetMenuIdSet(menuSets: MenuSetDraftType[]) {
  return new Set(menuSets.flatMap((menuSet) => menuSet.menu_ids));
}

function removeMenusIncludedInMenuSets(
  menus: MenuDraftType[],
  menuSets: MenuSetDraftType[],
) {
  const menuSetMenuIdSet = getMenuSetMenuIdSet(menuSets);
  if (menuSetMenuIdSet.size === 0) {
    return menus;
  }

  return menus.filter((menu) => !menuSetMenuIdSet.has(menu.id));
}

function getMealRecordDraftItemCount({
  menus,
  menuSets,
}: {
  menus: MenuDraftType[];
  menuSets: MenuSetDraftType[];
}) {
  return menus.length + menuSets.length;
}

export function getMenuDraftSelectedItemCount(
  draft:
    | {
        existingMenus?: MenuDraftType[];
        existingMenuSets?: MenuSetDraftType[];
      }
    | null
    | undefined,
) {
  const menuSets = draft?.existingMenuSets ?? [];
  return getMealRecordDraftItemCount({
    menus: removeMenusIncludedInMenuSets(draft?.existingMenus ?? [], menuSets),
    menuSets,
  });
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
  const requestMenus = removeMenusIncludedInMenuSets(draft.existingMenus, draft.existingMenuSets);
  const menuSetIds = draft.existingMenuSets.map((menuSet) => menuSet.set_id);

  return {
    date: dateKey,
    time: Number(mealType) as MealTime,
    meal_time:
      normalizeMealRecordTime(draft.mealTime) ??
      normalizeMealRecordTime(fallbackMealTime) ??
      getCurrentMealRecordTime(),
    menu_ids: requestMenus.map((menu) => menu.id),
    menu_quantities: requestMenus.map((menu) => menu.quantity),
    menu_input_modes: requestMenus.map((menu) => toMealInputMode(menu.mode)),
    ...(menuSetIds.length > 0 ? { menu_set_ids: menuSetIds } : {}),
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
        seedMenuSets,
        image,
        mealTime,
        serverSignature,
      }) => {
        set((state) => {
          const prev = state.drafts[key];
          const safeCount = toSafeExistingMenuCount(existingMenuCount, seedMenus?.length ?? 0);
          const normalizedMenuSets = normalizeMenuSetDrafts(seedMenuSets);
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
                  existingMenuSets: normalizedMenuSets,
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
                  existingMenuSets: normalizedMenuSets,
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
                existingMenuSets:
                  normalizedMenuSets.length > 0 ? normalizedMenuSets : prev.existingMenuSets,
                image: prev.image !== undefined ? prev.image : normalizedImage,
                mealTime: prev.mealTime ?? normalizedMealTime ?? undefined,
                serverSignature: serverSignature ?? prev.serverSignature,
              },
            },
          };
        });
      },

      replaceDraft: ({
        key,
        menus,
        menuSets,
        existingMenuCount,
        image,
        mealTime,
        serverSignature,
      }) => {
        set((state) => {
          const normalizedImage = normalizeDraftImage(image);
          const normalizedMealTime = normalizeMealRecordTime(mealTime);
          const normalizedMenuSets = normalizeMenuSetDrafts(menuSets);

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                existingMenuCount: toSafeExistingMenuCount(existingMenuCount, menus.length),
                existingMenus: removeMenusIncludedInMenuSets([...menus], normalizedMenuSets),
                existingMenuSets: normalizedMenuSets,
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
          const isIncludedInMenuSet = draft.existingMenuSets.some((menuSet) =>
            menuSet.menu_ids.includes(id),
          );

          if (isIncludedInMenuSet) {
            return state;
          }

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

      applyMenuSet: ({ key, menuSet }) => {
        const normalizedMenuSet = normalizeMenuSetDraft(menuSet);
        if (!normalizedMenuSet) {
          return APPLY_MENU_SET_RESULT.INVALID;
        }

        const draft = get().drafts[key] ?? INIT_DRAFT;
        const menuSetMenuIdSet = new Set(normalizedMenuSet.menu_ids);
        const nextMenus = draft.existingMenus.filter((menu) => !menuSetMenuIdSet.has(menu.id));
        const existingMenuSetIndex = draft.existingMenuSets.findIndex(
          (item) => item.set_id === normalizedMenuSet.set_id,
        );
        const nextMenuSets =
          existingMenuSetIndex < 0
            ? [...draft.existingMenuSets, normalizedMenuSet]
            : draft.existingMenuSets.map((item, index) =>
                index === existingMenuSetIndex ? normalizedMenuSet : item,
              );

        if (
          getMealRecordDraftItemCount({
            menus: nextMenus,
            menuSets: nextMenuSets,
          }) > MAX_MEAL_RECORD_MENUS
        ) {
          return APPLY_MENU_SET_RESULT.LIMIT_EXCEEDED;
        }

        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: {
              ...draft,
              existingMenus: nextMenus,
              existingMenuSets: nextMenuSets,
            },
          },
        }));

        return APPLY_MENU_SET_RESULT.APPLIED;
      },

      removeMenuSet: ({ key, setId }) => {
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
                existingMenuSets: draft.existingMenuSets.filter(
                  (menuSet) => menuSet.set_id !== setId,
                ),
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

      prepareRegisterRequest: ({ dateKey, mealType, menus, menuSets, image, mealTime }) => {
        const key = formatMenuDraftKey(dateKey, mealType);
        const normalizedImage = normalizeDraftImage(image);
        const normalizedMealTime = normalizeMealRecordTime(mealTime);
        const normalizedMenuSets = normalizeMenuSetDrafts(menuSets);

        set((state) => {
          const prev = state.drafts[key] ?? INIT_DRAFT;

          return {
            drafts: {
              ...state.drafts,
              [key]: {
                ...prev,
                existingMenuCount: menus.length,
                existingMenus: removeMenusIncludedInMenuSets([...menus], normalizedMenuSets),
                existingMenuSets: normalizedMenuSets,
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
export const useMenuDraftApplyMenuSet = () => useMenuDraftStore((store) => store.applyMenuSet);
export const useMenuDraftRemoveMenuSet = () => useMenuDraftStore((store) => store.removeMenuSet);
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
    const seedMenuSets = dayMeals.menuSetsByTime[mealType];
    const image = dayMeals.imagesByTime[mealType];
    const mealTime = dayMeals.mealRecordMealTimesByTime[mealType];

    syncDraftFromServer({
      key,
      existingMenuCount: seedMenus.length,
      seedMenus,
      seedMenuSets,
      image,
      mealTime,
      serverSignature: buildMenuDraftSignature({
        menus: seedMenus,
        menuSets: seedMenuSets,
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

export function useMenuDraftMenuSets(date: string, mealType: MealType) {
  const key = formatMenuDraftKey(date, mealType);
  return useMenuDraftStore((store) => getDraftOrInit(store.drafts, key).existingMenuSets);
}

export function useMenuDraftSelectedCount(date: string, mealType: MealType) {
  const key = formatMenuDraftKey(date, mealType);
  return useMenuDraftStore((store) => getMenuDraftSelectedItemCount(getDraftOrInit(store.drafts, key)));
}
