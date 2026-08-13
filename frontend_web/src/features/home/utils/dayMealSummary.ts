import type {
  MealMenuInputMode,
  MealServingInputMode,
} from "@/shared/api/types/api.dto";
import { MENU_INPUT_MODE } from "@/shared/api/types/api.dto";
import type {
  MealRecordResponseDto,
  MealResponseDto,
  MenuSimpleResponseDto,
} from "@/shared/api/types/api.response.dto";
import {
  calculateDailyNutritionMetricsForDisplay,
  calculateMacroPercentToGram,
  type MacroGrams,
  type NutrientGrade,
} from "@/shared/utils/nutrientScore";

type MealTimeKey = 0 | 1 | 2 | 3 | 4;
type OptionalNutrientValue = number | null | undefined;

function isMealTimeKey(value: number): value is MealTimeKey {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
}

function getMenuIsDeleted(menu: MenuSimpleResponseDto) {
  const value = (menu as { is_deleted?: unknown }).is_deleted;
  return typeof value === "number" ? value : 0;
}

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
  is_deleted?: number;
  quantity: number;
  serving_input_mode: MealServingInputMode;
};

export type MealRecordTimestamp = Pick<MealResponseDto, "createdAt" | "updatedAt">;
export type MealRecordMealTime = string;

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
  mealRecordMealTimesByTime: {
    0: MealRecordMealTime | null;
    1: MealRecordMealTime | null;
    2: MealRecordMealTime | null;
    3: MealRecordMealTime | null;
    4: MealRecordMealTime | null;
  };
  didNotEatByTime: {
    0: boolean;
    1: boolean;
    2: boolean;
    3: boolean;
    4: boolean;
  };
};

export type DayNutritionStatus = "ready" | "empty" | "missingTarget" | "unavailable";
export type DayNutritionNutrientKey = "carbs" | "protein" | "fat";
export type DayNutritionGrade = NutrientGrade;

export type DayNutritionTarget = {
  target_calories: number;
  target_ratio: readonly number[];
};

export type DayNutritionNutrientSummary = {
  current: number;
  target: number;
  actualRatio: number;
  targetRatio: number;
  progressPercent: number;
  score: number | null;
  grade: DayNutritionGrade | null;
  deviation: number;
};

export type DayNutritionSummary = {
  status: DayNutritionStatus;
  score: number | null;
  calorieScore: number | null;
  macroScore: number | null;
  grade: DayNutritionGrade | null;
  balanceGrade: DayNutritionGrade | null;
  macroAverageDeviation: number;
  message: string;
  calories: {
    activity: number;
    baseTarget: number;
    current: number;
    target: number;
    difference: number;
    intakePercent: number;
    progressPercent: number;
    deviationPercent: number;
  };
  nutrients: Record<DayNutritionNutrientKey, DayNutritionNutrientSummary>;
  notices: DayMealSummary["nutrientNotices"];
};

export function getActivityAdjustedTargetCalories(
  targetCalories: number | null,
  activityCalories: number | null | undefined,
) {
  if (targetCalories === null || !Number.isFinite(targetCalories) || targetCalories <= 0) {
    return null;
  }

  const safeActivityCalories =
    typeof activityCalories === "number" && Number.isFinite(activityCalories) && activityCalories > 0
      ? activityCalories
      : 0;

  return Math.round(targetCalories + safeActivityCalories);
}

function hasValidDayNutritionTarget(
  target: DayNutritionTarget | null | undefined,
): target is DayNutritionTarget {
  if (
    !target ||
    !Number.isFinite(target.target_calories) ||
    target.target_calories <= 0 ||
    !Array.isArray(target.target_ratio) ||
    target.target_ratio.length < 3
  ) {
    return false;
  }

  const targetRatios = target.target_ratio.slice(0, 3);

  return targetRatios.every(Number.isFinite) && targetRatios.some((ratio) => ratio > 0);
}

function calculateTargetNutrients(
  target: DayNutritionTarget | null | undefined,
): MacroGrams {
  if (!hasValidDayNutritionTarget(target)) {
    return { carbs: 0, protein: 0, fat: 0 };
  }

  const [carbsRatio, proteinRatio, fatRatio] = target.target_ratio;

  return {
    carbs: calculateMacroPercentToGram({
      nutrientType: "carbs",
      totalCalories: target.target_calories,
      percent: carbsRatio,
    }),
    protein: calculateMacroPercentToGram({
      nutrientType: "protein",
      totalCalories: target.target_calories,
      percent: proteinRatio,
    }),
    fat: calculateMacroPercentToGram({
      nutrientType: "fat",
      totalCalories: target.target_calories,
      percent: fatRatio,
    }),
  };
}

function calculateTargetRatios(
  target: DayNutritionTarget | null | undefined,
): Record<DayNutritionNutrientKey, number> {
  if (!hasValidDayNutritionTarget(target)) {
    return { carbs: 0, protein: 0, fat: 0 };
  }

  const [carbs, protein, fat] = target.target_ratio;
  const total = carbs + protein + fat;

  if (total <= 0) {
    return { carbs: 0, protein: 0, fat: 0 };
  }

  return {
    carbs: (carbs / total) * 100,
    protein: (protein / total) * 100,
    fat: (fat / total) * 100,
  };
}

function getNutrientProgressPercent(current: number, target: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.round((current / target) * 100), 0), 100);
}

/**
 * 화면에서 사용하는 하루 영양 정보의 단일 진입점.
 * 식사 집계와 목표값을 받아 현재/목표 섭취량, 점수, 등급, 안내 문구를 한 번에 반환한다.
 * 세부 점수 공식은 nutrientScore 내부 구현으로 숨긴다.
 */
export function getDayNutritionSummary(
  dayMeal: DayMealSummary | null | undefined,
  target: DayNutritionTarget | null | undefined,
  activityCalories?: number | null,
): DayNutritionSummary {
  const currentNutrients = {
    carbs: Math.round(dayMeal?.totalNutrients.carbs ?? 0),
    protein: Math.round(dayMeal?.totalNutrients.protein ?? 0),
    fat: Math.round(dayMeal?.totalNutrients.fat ?? 0),
  };
  const hasValidTarget = hasValidDayNutritionTarget(target);
  const targetNutrients = calculateTargetNutrients(target);
  const targetRatios = calculateTargetRatios(target);
  const currentCalories = Math.round(dayMeal?.totalCalories ?? 0);
  const baseTargetCalories = Math.round(hasValidTarget ? target.target_calories : 0);
  const safeActivityCalories =
    typeof activityCalories === "number" &&
    Number.isFinite(activityCalories) &&
    activityCalories > 0
      ? Math.round(activityCalories)
      : 0;
  const targetCalories = hasValidTarget
    ? Math.round(target.target_calories + safeActivityCalories)
    : 0;
  const nutritionMetrics =
    dayMeal && hasValidTarget
      ? calculateDailyNutritionMetricsForDisplay({
          actualCalories: dayMeal.totalCalories,
          targetCalories,
          actualMacrosInGram: dayMeal.totalNutrients,
          targetMacroRatios: {
            carbs: target.target_ratio[0],
            protein: target.target_ratio[1],
            fat: target.target_ratio[2],
          },
        })
      : null;

  const createNutrientSummary = (
    key: DayNutritionNutrientKey,
  ): DayNutritionNutrientSummary => ({
    current: currentNutrients[key],
    target: targetNutrients[key],
    actualRatio: nutritionMetrics?.actualMacroRatios[key] ?? 0,
    targetRatio: nutritionMetrics?.score.macro[key].targetRatio ?? targetRatios[key],
    progressPercent: getNutrientProgressPercent(
      currentNutrients[key],
      targetNutrients[key],
    ),
    score: nutritionMetrics?.score.macro[key].score ?? null,
    grade: nutritionMetrics?.score.macro[key].grade ?? null,
    deviation: nutritionMetrics?.score.macro[key].deviation ?? 0,
  });

  const nutrients = {
    carbs: createNutrientSummary("carbs"),
    protein: createNutrientSummary("protein"),
    fat: createNutrientSummary("fat"),
  };

  const createResult = ({
    status,
    message,
    score = null,
  }: {
    status: DayNutritionStatus;
    message: string;
    score?: number | null;
  }): DayNutritionSummary => ({
    status,
    score,
    calorieScore: nutritionMetrics?.score.calorieScore ?? null,
    macroScore: nutritionMetrics?.score.macroScore ?? null,
    grade: nutritionMetrics?.score.overallGrade ?? null,
    balanceGrade: nutritionMetrics?.score.macroBalanceGrade ?? null,
    macroAverageDeviation: nutritionMetrics?.score.macroAverageDeviation ?? 0,
    message,
    calories: {
      activity: safeActivityCalories,
      baseTarget: baseTargetCalories,
      current: nutritionMetrics?.roundedActualCalories ?? currentCalories,
      target: nutritionMetrics?.roundedTargetCalories ?? targetCalories,
      difference: Math.round(
        nutritionMetrics?.calorieDiff ?? targetCalories - currentCalories,
      ),
      intakePercent: nutritionMetrics?.calorieIntakePercent ?? 0,
      progressPercent: nutritionMetrics?.calorieProgressPercent ?? 0,
      deviationPercent: nutritionMetrics?.score.calorieDiffPercent ?? 0,
    },
    nutrients,
    notices: dayMeal?.nutrientNotices ?? {
      carbsEstimatedFromSubNutrients: false,
    },
  });

  if (!hasValidTarget) {
    return createResult({
      status: "missingTarget",
      message: "목표를 먼저 설정해 주세요",
    });
  }

  if (!dayMeal) {
    return createResult({
      status: "unavailable",
      message: "식사 정보를 확인할 수 없어요",
    });
  }

  if (dayMeal.totalCalories <= 0) {
    return createResult({
      status: "empty",
      message: "아직 식단 기록을 하지 않았어요",
      score: 0,
    });
  }

  if (!nutritionMetrics) {
    return createResult({
      status: "unavailable",
      message: "영양 정보를 확인할 수 없어요",
    });
  }

  return createResult({
    status: "ready",
    message: nutritionMetrics.score.overallMessage,
    score: nutritionMetrics.score.totalScore,
  });
}

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
  const mealRecordMealTimesByTime: Record<MealTimeKey, MealRecordMealTime | null> = {
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
    if (!isMealTimeKey(meal.time)) {
      return;
    }

    const mealTime = meal.time;
    recordCountByTime[mealTime] += 1;
    mealRecordTimestampsByTime[mealTime] = {
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    };

    if (typeof meal.meal_time === "string" && meal.meal_time.trim().length > 0) {
      mealRecordMealTimesByTime[mealTime] = meal.meal_time;
    }

    if (typeof meal.image === "string" && meal.image.trim().length > 0) {
      // 같은 time에 여러 건이면 최신 이미지로 덮어씀
      imagesByTime[mealTime] = meal.image;
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
        is_deleted: getMenuIsDeleted(menu),
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

      const existingMenuIndex = menusByTime[mealTime].findIndex((item) => item.id === menu.id);
      if (existingMenuIndex !== -1) {
        const [existingMenu] = menusByTime[mealTime].splice(existingMenuIndex, 1);
        if (existingMenu) {
          applyMenuNutrients(mealTime, existingMenu, -1);
        }
      }

      menusByTime[mealTime].push(menuItem);
      applyMenuNutrients(mealTime, menuItem, 1);
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
    mealRecordMealTimesByTime,
    didNotEatByTime: {
      0: recordCountByTime[0] > 0 && menusByTime[0].length === 0,
      1: recordCountByTime[1] > 0 && menusByTime[1].length === 0,
      2: recordCountByTime[2] > 0 && menusByTime[2].length === 0,
      3: recordCountByTime[3] > 0 && menusByTime[3].length === 0,
      4: recordCountByTime[4] > 0 && menusByTime[4].length === 0,
    },
  };
}
