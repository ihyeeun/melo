import type {
  MealMenuInputMode,
  MealRecordResponseDto,
  MealResponseDto,
  MealServingInputMode,
  MenuSimpleResponseDto,
} from "@/shared/api/types/api.dto";
import { MENU_INPUT_MODE } from "@/shared/api/types/api.dto";

type MealTimeKey = 0 | 1 | 2 | 3 | 4;
type OptionalNutrientValue = number | null | undefined;

function toFiniteNutrientValue(value: OptionalNutrientValue) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sumFiniteNutrientValues(values: ReadonlyArray<OptionalNutrientValue>) {
  const finiteValues = values
    .map(toFiniteNutrientValue)
    .filter((value): value is number => value !== null);

  if (finiteValues.length === 0) {
    return null;
  }

  return finiteValues.reduce((sum, value) => sum + value, 0);
}

function resolveSummaryNutrientValue(
  parentValue: OptionalNutrientValue,
  childValues: ReadonlyArray<OptionalNutrientValue>,
) {
  const parent = toFiniteNutrientValue(parentValue);
  const childSum = sumFiniteNutrientValues(childValues);

  if (parent !== null && !(parent === 0 && childSum !== null && childSum > 0)) {
    return {
      isEstimatedFromSubNutrients: false,
      value: parent,
    };
  }

  return {
    isEstimatedFromSubNutrients: childSum !== null,
    value: childSum ?? 0,
  };
}

function scaleOptionalNutrient(value: OptionalNutrientValue, scaleFactor: number) {
  const nutrient = toFiniteNutrientValue(value);

  return nutrient === null ? undefined : nutrient * scaleFactor;
}

function compareMealRecordSavedAt(a: MealResponseDto, b: MealResponseDto) {
  const aTime = getMealRecordSavedAtTime(a);
  const bTime = getMealRecordSavedAtTime(b);

  if (aTime !== null && bTime !== null && aTime !== bTime) {
    return aTime - bTime;
  }

  if (aTime === null && bTime !== null) return -1;
  if (aTime !== null && bTime === null) return 1;
  return 0;
}

function getMealRecordSavedAtTime(meal: MealResponseDto) {
  const updatedAt = Date.parse(meal.updatedAt);

  if (Number.isFinite(updatedAt)) {
    return updatedAt;
  }

  const createdAt = Date.parse(meal.createdAt);

  return Number.isFinite(createdAt) ? createdAt : null;
}

export type MenuWithQuantity = MenuSimpleResponseDto & {
  quantity: number;
  serving_input_mode: MealServingInputMode;
};

export type MealRecordTimestamp = Pick<MealResponseDto, "createdAt" | "updatedAt">;

export type DayMealSummary = {
  totalCalories: number;
  totalNutrients: {
    carbs: number;
    protein: number;
    fat: number;
  };
  nutrientNotices: {
    carbsEstimatedFromSubNutrients: boolean;
  };
  caloriesByTime: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
    lateNight: number;
  };
  nutrientsByTime: {
    breakfast: {
      carbs: number;
      protein: number;
      fat: number;
    };
    lunch: {
      carbs: number;
      protein: number;
      fat: number;
    };
    dinner: {
      carbs: number;
      protein: number;
      fat: number;
    };
    snack: {
      carbs: number;
      protein: number;
      fat: number;
    };
    lateNight: {
      carbs: number;
      protein: number;
      fat: number;
    };
  };
  menusByTime: {
    0: MenuWithQuantity[];
    1: MenuWithQuantity[];
    2: MenuWithQuantity[];
    3: MenuWithQuantity[];
    4: MenuWithQuantity[];
  };
  imagesByTime: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
  };
  mealRecordTimestampsByTime: {
    0: MealRecordTimestamp | null;
    1: MealRecordTimestamp | null;
    2: MealRecordTimestamp | null;
    3: MealRecordTimestamp | null;
    4: MealRecordTimestamp | null;
  };
  didNotEatByTime: {
    0: boolean;
    1: boolean;
    2: boolean;
    3: boolean;
    4: boolean;
  };
};

export function dayMealSummary(meals: MealRecordResponseDto): DayMealSummary {
  let totalCalories = 0;
  const totalNutrients = {
    carbs: 0,
    protein: 0,
    fat: 0,
  };
  const caloriesByTime = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
    lateNight: 0,
  };
  const nutrientsByTime = {
    breakfast: { carbs: 0, protein: 0, fat: 0 },
    lunch: { carbs: 0, protein: 0, fat: 0 },
    dinner: { carbs: 0, protein: 0, fat: 0 },
    snack: { carbs: 0, protein: 0, fat: 0 },
    lateNight: { carbs: 0, protein: 0, fat: 0 },
  };
  const menusByTime: Record<MealTimeKey, MenuWithQuantity[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
  };
  const imagesByTime: Record<MealTimeKey, string> = {
    0: "",
    1: "",
    2: "",
    3: "",
    4: "",
  };
  const mealRecordTimestampsByTime: Record<MealTimeKey, MealRecordTimestamp | null> = {
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
  };
  const recordCountByTime: Record<MealTimeKey, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };
  const nutrientNotices = {
    carbsEstimatedFromSubNutrients: false,
  };

  const resolveServingInputMode = (
    meal: MealResponseDto,
    menuIndex: number,
  ): MealServingInputMode => {
    const menuInputModes = Array.isArray(meal.menu_input_modes)
      ? (meal.menu_input_modes as MealMenuInputMode[])
      : [];

    return menuInputModes[menuIndex] === MENU_INPUT_MODE.WEIGHT ? "weight" : "unit";
  };

  const resolveConsumedWeight = (
    meal: MealResponseDto,
    menu: MenuSimpleResponseDto,
    menuIndex: number,
  ) => {
    const consumedWeight = meal.menu_quantities[menuIndex];
    if (
      typeof consumedWeight === "number" &&
      Number.isFinite(consumedWeight) &&
      consumedWeight > 0
    ) {
      return consumedWeight;
    }

    // Fallback to one base serving weight when the payload is missing.
    if (typeof menu.weight === "number" && Number.isFinite(menu.weight) && menu.weight > 0) {
      return menu.weight;
    }

    return 1;
  };

  const mealList = [...meals.meal_list].sort(compareMealRecordSavedAt);
  const applyMenuNutrients = (
    mealTime: MealTimeKey,
    menu: Pick<MenuWithQuantity, "calories" | "carbs" | "protein" | "fat">,
    multiplier: 1 | -1,
  ) => {
    totalCalories += menu.calories * multiplier;
    totalNutrients.carbs += menu.carbs * multiplier;
    totalNutrients.protein += menu.protein * multiplier;
    totalNutrients.fat += menu.fat * multiplier;

    switch (mealTime) {
      case 0: {
        caloriesByTime.breakfast += menu.calories * multiplier;
        nutrientsByTime.breakfast.carbs += menu.carbs * multiplier;
        nutrientsByTime.breakfast.protein += menu.protein * multiplier;
        nutrientsByTime.breakfast.fat += menu.fat * multiplier;
        break;
      }
      case 1: {
        caloriesByTime.lunch += menu.calories * multiplier;
        nutrientsByTime.lunch.carbs += menu.carbs * multiplier;
        nutrientsByTime.lunch.protein += menu.protein * multiplier;
        nutrientsByTime.lunch.fat += menu.fat * multiplier;
        break;
      }
      case 2: {
        caloriesByTime.dinner += menu.calories * multiplier;
        nutrientsByTime.dinner.carbs += menu.carbs * multiplier;
        nutrientsByTime.dinner.protein += menu.protein * multiplier;
        nutrientsByTime.dinner.fat += menu.fat * multiplier;
        break;
      }
      case 3: {
        caloriesByTime.snack += menu.calories * multiplier;
        nutrientsByTime.snack.carbs += menu.carbs * multiplier;
        nutrientsByTime.snack.protein += menu.protein * multiplier;
        nutrientsByTime.snack.fat += menu.fat * multiplier;
        break;
      }
      case 4: {
        caloriesByTime.lateNight += menu.calories * multiplier;
        nutrientsByTime.lateNight.carbs += menu.carbs * multiplier;
        nutrientsByTime.lateNight.protein += menu.protein * multiplier;
        nutrientsByTime.lateNight.fat += menu.fat * multiplier;
        break;
      }
      default: {
        break;
      }
    }
  };

  mealList.forEach((meal) => {
    recordCountByTime[meal.time] += 1;
    mealRecordTimestampsByTime[meal.time] = {
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    };

    if (typeof meal.image === "string" && meal.image.trim().length > 0) {
      // 같은 time에 여러 건이면 최신 이미지로 덮어씀
      imagesByTime[meal.time] = meal.image;
    }

    meal.menu_list.forEach((menu, menuIndex) => {
      const servingInputMode = resolveServingInputMode(meal, menuIndex);
      const consumedWeight = resolveConsumedWeight(meal, menu, menuIndex);
      const baseWeight =
        typeof menu.weight === "number" && Number.isFinite(menu.weight) && menu.weight > 0
          ? menu.weight
          : 1;
      const scaleFactor = consumedWeight / baseWeight;
      const calories = menu.calories * scaleFactor;
      const resolvedCarbs = resolveSummaryNutrientValue(menu.carbs, [menu.sugars]);
      const carbs = resolvedCarbs.value * scaleFactor;
      const protein = menu.protein * scaleFactor;
      const resolvedFat = resolveSummaryNutrientValue(menu.fat, [
        menu.sat_fat,
        menu.trans_fat,
        menu.un_sat_fat,
      ]);
      const fat = resolvedFat.value * scaleFactor;
      const sugars = scaleOptionalNutrient(menu.sugars, scaleFactor);
      const satFat = scaleOptionalNutrient(menu.sat_fat, scaleFactor);
      const transFat = scaleOptionalNutrient(menu.trans_fat, scaleFactor);
      const unSatFat = scaleOptionalNutrient(menu.un_sat_fat, scaleFactor);

      if (resolvedCarbs.isEstimatedFromSubNutrients) {
        nutrientNotices.carbsEstimatedFromSubNutrients = true;
      }

      const menuItem: MenuWithQuantity = {
        id: menu.id,
        data_source: menu.data_source,
        is_deleted: menu.is_deleted,
        name: menu.name,
        brand: menu?.brand,
        category: menu.category,
        unit: menu.unit,
        weight: menu.weight,
        unit_quantity: menu.unit_quantity,
        calories,
        carbs,
        protein,
        fat,
        ...(sugars !== undefined ? { sugars } : {}),
        ...(satFat !== undefined ? { sat_fat: satFat } : {}),
        ...(transFat !== undefined ? { trans_fat: transFat } : {}),
        ...(unSatFat !== undefined ? { un_sat_fat: unSatFat } : {}),
        quantity: consumedWeight,
        serving_input_mode: servingInputMode,
      };

      const existingMenuIndex = menusByTime[meal.time].findIndex((item) => item.id === menu.id);
      if (existingMenuIndex !== -1) {
        const [existingMenu] = menusByTime[meal.time].splice(existingMenuIndex, 1);
        if (existingMenu) {
          applyMenuNutrients(meal.time, existingMenu, -1);
        }
      }

      menusByTime[meal.time].push(menuItem);
      applyMenuNutrients(meal.time, menuItem, 1);
    });
  });

  return {
    totalCalories,
    totalNutrients,
    nutrientNotices,
    caloriesByTime,
    nutrientsByTime,
    menusByTime,
    imagesByTime,
    mealRecordTimestampsByTime,
    didNotEatByTime: {
      0: recordCountByTime[0] > 0 && menusByTime[0].length === 0,
      1: recordCountByTime[1] > 0 && menusByTime[1].length === 0,
      2: recordCountByTime[2] > 0 && menusByTime[2].length === 0,
      3: recordCountByTime[3] > 0 && menusByTime[3].length === 0,
      4: recordCountByTime[4] > 0 && menusByTime[4].length === 0,
    },
  };
}
