import {
  type MealMenuItem,
  type MealType,
  MENU_DATA_SOURCE,
  type MenuDataSource,
  type MenuId,
  type NutrientServingUnit,
} from "@/shared/api/types/api.dto";

export type NutrientModeType = "register" | "modify" | "create" | "edit" | "update";
export type NutrientEntrySource = "meal-record" | "menu-compare" | "general";

export type NutrientDetailLocationState = {
  modeType?: NutrientModeType;
  menuId?: MenuId;
  menu?: MealMenuItem;
  quantity?: number;
};

type NutrientModifyFlowLocationState = {
  source?: NutrientEntrySource;
  dateKey?: string;
  mealType?: MealType;
  wasQueuedInDraft?: boolean;
  foodName?: string;
  brandName?: string;
  servingUnit?: NutrientServingUnit;
};

type NutrientModifyBaseLocationState = NutrientDetailLocationState & NutrientModifyFlowLocationState;

export type NutrientModifyPersonalLocationState = NutrientModifyBaseLocationState & {
  dataSource: typeof MENU_DATA_SOURCE.PERSONAL;
};

export type NutrientModifyPublicLocationState = NutrientModifyBaseLocationState & {
  dataSource: typeof MENU_DATA_SOURCE.PUBLIC;
};

export type NutrientModifyLocationState =
  | NutrientModifyPersonalLocationState
  | NutrientModifyPublicLocationState
  | (NutrientModifyBaseLocationState & {
      // Backward compatibility for older deep links that did not pass dataSource.
      dataSource?: MenuDataSource;
    });
