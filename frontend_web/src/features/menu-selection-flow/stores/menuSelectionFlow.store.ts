import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { MealServingInputMode, MealType } from "@/shared/api/types/api.dto";

export const MENU_SELECTION_FLOW_TARGET = {
  MEAL_RECORD: "meal-record",
  FOLDER: "folder",
  MENU_SET: "menu-set",
} as const;

export type MenuSelectionFlowTarget =
  (typeof MENU_SELECTION_FLOW_TARGET)[keyof typeof MENU_SELECTION_FLOW_TARGET];

export type MenuSelectionFlowId = string;

export type MenuSelectionFlowInitialMenuServing = {
  menuQuantity: number;
  menuInputMode?: MealServingInputMode;
};

export type MenuSelectionFlow = {
  menuSelectionFlowId: MenuSelectionFlowId;
  menuSelectionFlowTarget: MenuSelectionFlowTarget;
  menuSelectionCompletionReturnPath?: string;
  parentMenuSelectionFlowId?: MenuSelectionFlowId;
  relatedMealRecordDateKey?: string;
  relatedMealRecordMealType?: MealType;
  initialMenuServingByMenuId?: Record<number, MenuSelectionFlowInitialMenuServing>;
  pendingReplacementSourceMenuId?: number;
};

export type CreateMenuSelectionFlowParams = {
  menuSelectionFlowTarget: MenuSelectionFlowTarget;
  menuSelectionCompletionReturnPath?: string;
  parentMenuSelectionFlowId?: MenuSelectionFlowId | null;
  relatedMealRecordDateKey?: string;
  relatedMealRecordMealType?: MealType;
  initialMenuServingByMenuId?: Record<number, MenuSelectionFlowInitialMenuServing>;
};

type SetPendingReplacementSourceMenuIdParams = {
  menuSelectionFlowId: MenuSelectionFlowId;
  pendingReplacementSourceMenuId: number;
};

type ClearPendingReplacementSourceMenuIdParams = {
  menuSelectionFlowId: MenuSelectionFlowId;
};

type MenuSelectionFlowStoreState = {
  menuSelectionFlowsById: Record<MenuSelectionFlowId, MenuSelectionFlow>;
  createMenuSelectionFlow: (params: CreateMenuSelectionFlowParams) => MenuSelectionFlowId;
  removeMenuSelectionFlow: (menuSelectionFlowId: MenuSelectionFlowId) => void;
  setPendingReplacementSourceMenuId: (params: SetPendingReplacementSourceMenuIdParams) => void;
  clearPendingReplacementSourceMenuId: (params: ClearPendingReplacementSourceMenuIdParams) => void;
};

let menuSelectionFlowSequence = 0;

function createMenuSelectionFlowId() {
  menuSelectionFlowSequence += 1;
  return `menu-selection-flow-${Date.now()}-${menuSelectionFlowSequence}`;
}

function toPositiveMenuId(value: number) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

export const useMenuSelectionFlowStore = create<MenuSelectionFlowStoreState>()(
  devtools(
    (set) => ({
      menuSelectionFlowsById: {},

      createMenuSelectionFlow: ({
        menuSelectionFlowTarget,
        menuSelectionCompletionReturnPath,
        parentMenuSelectionFlowId,
        relatedMealRecordDateKey,
        relatedMealRecordMealType,
        initialMenuServingByMenuId,
      }) => {
        const menuSelectionFlowId = createMenuSelectionFlowId();

        set((state) => ({
          menuSelectionFlowsById: {
            ...state.menuSelectionFlowsById,
            [menuSelectionFlowId]: {
              menuSelectionFlowId,
              menuSelectionFlowTarget,
              ...(menuSelectionCompletionReturnPath
                ? { menuSelectionCompletionReturnPath }
                : {}),
              ...(parentMenuSelectionFlowId ? { parentMenuSelectionFlowId } : {}),
              ...(relatedMealRecordDateKey ? { relatedMealRecordDateKey } : {}),
              ...(relatedMealRecordMealType ? { relatedMealRecordMealType } : {}),
              ...(initialMenuServingByMenuId
                ? { initialMenuServingByMenuId }
                : {}),
            },
          },
        }));

        return menuSelectionFlowId;
      },

      removeMenuSelectionFlow: (menuSelectionFlowId) => {
        set((state) => {
          const nextMenuSelectionFlowsById = { ...state.menuSelectionFlowsById };
          delete nextMenuSelectionFlowsById[menuSelectionFlowId];

          return {
            menuSelectionFlowsById: nextMenuSelectionFlowsById,
          };
        });
      },

      setPendingReplacementSourceMenuId: ({
        menuSelectionFlowId,
        pendingReplacementSourceMenuId,
      }) => {
        const safePendingReplacementSourceMenuId = toPositiveMenuId(
          pendingReplacementSourceMenuId,
        );

        if (safePendingReplacementSourceMenuId === null) {
          return;
        }

        set((state) => {
          const menuSelectionFlow = state.menuSelectionFlowsById[menuSelectionFlowId];
          if (!menuSelectionFlow) {
            return state;
          }

          return {
            menuSelectionFlowsById: {
              ...state.menuSelectionFlowsById,
              [menuSelectionFlowId]: {
                ...menuSelectionFlow,
                pendingReplacementSourceMenuId: safePendingReplacementSourceMenuId,
              },
            },
          };
        });
      },

      clearPendingReplacementSourceMenuId: ({ menuSelectionFlowId }) => {
        set((state) => {
          const menuSelectionFlow = state.menuSelectionFlowsById[menuSelectionFlowId];
          if (!menuSelectionFlow) {
            return state;
          }

          const nextMenuSelectionFlow = { ...menuSelectionFlow };
          delete nextMenuSelectionFlow.pendingReplacementSourceMenuId;

          return {
            menuSelectionFlowsById: {
              ...state.menuSelectionFlowsById,
              [menuSelectionFlowId]: nextMenuSelectionFlow,
            },
          };
        });
      },
    }),
    { name: "MenuSelectionFlowStore" },
  ),
);

export const useMenuSelectionFlowById = (menuSelectionFlowId?: MenuSelectionFlowId | null) =>
  useMenuSelectionFlowStore((store) =>
    menuSelectionFlowId ? store.menuSelectionFlowsById[menuSelectionFlowId] : undefined,
  );

export const useMenuSelectionFlowCreateFlow = () =>
  useMenuSelectionFlowStore((store) => store.createMenuSelectionFlow);

export const useMenuSelectionFlowRemoveFlow = () =>
  useMenuSelectionFlowStore((store) => store.removeMenuSelectionFlow);

export const useMenuSelectionFlowSetPendingReplacementSourceMenuId = () =>
  useMenuSelectionFlowStore((store) => store.setPendingReplacementSourceMenuId);

export const useMenuSelectionFlowClearPendingReplacementSourceMenuId = () =>
  useMenuSelectionFlowStore((store) => store.clearPendingReplacementSourceMenuId);
