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
    return parent;
  }

  return childSum ?? 0;
}

function scaleOptionalNutrient(value: OptionalNutrientValue, scaleFactor: number) {
  const nutrient = toFiniteNutrientValue(value);

  return nutrient === null ? undefined : nutrient * scaleFactor;
}

export type MenuWithQuantity = MenuSimpleResponseDto & {
  quantity: number;
  serving_input_mode: MealServingInputMode;
};

export type DayMealSummary = {
  totalCalories: number;
  totalNutrients: {
    carbs: number;
    protein: number;
    fat: number;
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
  const recordCountByTime: Record<MealTimeKey, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
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

  meals.meal_list.forEach((meal) => {
    recordCountByTime[meal.time] += 1;

    if (typeof meal.image === "string" && meal.image.trim().length > 0) {
      // 같은 time에 여러 건이면 마지막 이미지로 덮어씀
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
      const carbs = resolveSummaryNutrientValue(menu.carbs, [menu.sugars]) * scaleFactor;
      const protein = menu.protein * scaleFactor;
      const fat =
        resolveSummaryNutrientValue(menu.fat, [menu.sat_fat, menu.trans_fat, menu.un_sat_fat]) *
        scaleFactor;
      const sugars = scaleOptionalNutrient(menu.sugars, scaleFactor);
      const satFat = scaleOptionalNutrient(menu.sat_fat, scaleFactor);
      const transFat = scaleOptionalNutrient(menu.trans_fat, scaleFactor);
      const unSatFat = scaleOptionalNutrient(menu.un_sat_fat, scaleFactor);

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

      menusByTime[meal.time].push(menuItem);

      totalCalories += calories;
      totalNutrients.carbs += carbs;
      totalNutrients.protein += protein;
      totalNutrients.fat += fat;

      switch (meal.time) {
        case 0: {
          caloriesByTime.breakfast += calories;
          nutrientsByTime.breakfast.carbs += carbs;
          nutrientsByTime.breakfast.protein += protein;
          nutrientsByTime.breakfast.fat += fat;
          break;
        }
        case 1: {
          caloriesByTime.lunch += calories;
          nutrientsByTime.lunch.carbs += carbs;
          nutrientsByTime.lunch.protein += protein;
          nutrientsByTime.lunch.fat += fat;
          break;
        }
        case 2: {
          caloriesByTime.dinner += calories;
          nutrientsByTime.dinner.carbs += carbs;
          nutrientsByTime.dinner.protein += protein;
          nutrientsByTime.dinner.fat += fat;
          break;
        }
        case 3: {
          caloriesByTime.snack += calories;
          nutrientsByTime.snack.carbs += carbs;
          nutrientsByTime.snack.protein += protein;
          nutrientsByTime.snack.fat += fat;
          break;
        }
        case 4: {
          caloriesByTime.lateNight += calories;
          nutrientsByTime.lateNight.carbs += carbs;
          nutrientsByTime.lateNight.protein += protein;
          nutrientsByTime.lateNight.fat += fat;
          break;
        }
        default: {
          break;
        }
      }
    });
  });

  return {
    totalCalories,
    totalNutrients,
    caloriesByTime,
    nutrientsByTime,
    menusByTime,
    imagesByTime,
    didNotEatByTime: {
      0: recordCountByTime[0] > 0 && menusByTime[0].length === 0,
      1: recordCountByTime[1] > 0 && menusByTime[1].length === 0,
      2: recordCountByTime[2] > 0 && menusByTime[2].length === 0,
      3: recordCountByTime[3] > 0 && menusByTime[3].length === 0,
      4: recordCountByTime[4] > 0 && menusByTime[4].length === 0,
    },
  };
}
