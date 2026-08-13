export type MacroKey = "carbs" | "protein" | "fat";
export type NutrientGrade =
  | "appropriate"
  | "slightlyUnbalanced"
  | "unbalanced"
  | "severelyUnbalanced";

export type MacroRatios = Record<MacroKey, number>;
export type MacroGrams = Record<MacroKey, number>;

export type MacroScoreDetail = {
  actualRatio: number;
  targetRatio: number;
  deviation: number;
  score: number;
  grade: NutrientGrade;
};

export type NutrientScoreResult = {
  totalScore: number;
  calorieScore: number;
  macroScore: number;
  calorieDiffPercent: number;
  macroAverageDeviation: number;
  overallGrade: NutrientGrade;
  overallMessage: string;
  macroBalanceGrade: NutrientGrade;
  macro: Record<MacroKey, MacroScoreDetail>;
};

type NutrientScoreInput = {
  actualCalories: number;
  targetCalories: number;
  actualMacroRatios: MacroRatios;
  targetMacroRatios: MacroRatios;
};

export type DailyNutritionMetricsInput = {
  actualCalories: number;
  targetCalories: number;
  actualMacrosInGram: MacroGrams;
  targetMacroRatios: MacroRatios;
};

export type DayMealNutritionSource = {
  totalCalories: number;
  totalNutrients: MacroGrams;
};

export type DailyNutritionTargetSource = {
  target_calories: number;
  target_ratio: readonly number[];
};

export type DailyNutritionMetrics = {
  roundedActualCalories: number;
  roundedTargetCalories: number;
  calorieDiff: number;
  calorieIntakePercent: number;
  calorieProgressPercent: number;
  actualMacroRatios: MacroRatios;
  score: NutrientScoreResult;
};

const MACRO_MAX_SCORE: Record<MacroKey, number> = {
  // 탄단지 점수 총합 50점이 되도록 가중치 분배 (17+17+16)
  carbs: 17,
  protein: 17,
  fat: 16,
};

const MACRO_KCAL_PER_GRAM: Record<MacroKey, number> = {
  carbs: 4,
  protein: 4,
  fat: 9,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * 탄/단/지 값(그램 또는 퍼센트 입력)을 합계 100% 비율로 정규화한다.
 * - 합계가 0 이하이면 0%로 처리한다.
 */
function normalizeMacroRatios(ratios: MacroRatios): MacroRatios {
  const total = ratios.carbs + ratios.protein + ratios.fat;
  if (total <= 0) {
    return { carbs: 0, protein: 0, fat: 0 };
  }

  return {
    carbs: (ratios.carbs / total) * 100,
    protein: (ratios.protein / total) * 100,
    fat: (ratios.fat / total) * 100,
  };
}

function getGradeByDeviation(deviation: number): NutrientGrade {
  // 목표 비율과의 차이(percentage point)로 등급 분류
  if (deviation <= 5) return "appropriate";
  if (deviation <= 10) return "slightlyUnbalanced";
  if (deviation <= 15) return "unbalanced";
  return "severelyUnbalanced";
}

function getMacroItemScore(key: MacroKey, deviation: number) {
  const maxScore = MACRO_MAX_SCORE[key];
  if (deviation <= 5) return maxScore;
  if (deviation <= 10) return key === "fat" ? 13 : 14;
  if (deviation <= 15) return key === "fat" ? 9 : 10;
  return key === "fat" ? 4 : 5;
}

function getCalorieScoreByDiff(calorieDiffPercent: number) {
  // 칼로리 점수는 최대 50점, 목표와 가까울수록 높은 점수
  if (calorieDiffPercent <= 5) return 50;
  if (calorieDiffPercent <= 10) return 40;
  if (calorieDiffPercent <= 15) return 30;
  if (calorieDiffPercent <= 20) return 20;
  return 10;
}

function getNutrientGuideMessageByScore(score: number) {
  if (score >= 81) {
    return "오늘 식사, 정말 완벽해요!";
  }
  if (score >= 61) {
    return "칼로리와 영양 밸런스가 좋아요!";
  }
  if (score >= 41) {
    return "조금만 더 신경 쓰면 최고예요!";
  }

  if (score >= 21) {
    return "탄단지 밸런스를 조금 더 맞춰봐요";
  }

  return "칼로리와 영양 균형을 맞춰봐요";
}

function getNutrientGradeByScore(score: number): NutrientGrade {
  if (score >= 85) return "appropriate";
  if (score >= 70) return "slightlyUnbalanced";
  if (score >= 50) return "unbalanced";
  return "severelyUnbalanced";
}

function calculateCalorieDiffPercent(actualCalories: number, targetCalories: number) {
  if (targetCalories <= 0) return 0;
  return Math.abs((actualCalories - targetCalories) / targetCalories) * 100;
}

function calculateCalorieIntakePercent(actualCalories: number, targetCalories: number) {
  if (targetCalories <= 0) return 0;
  return Math.round((actualCalories / targetCalories) * 100);
}

export function getCalorieProgressPercent(actualCalories: number, targetCalories: number) {
  const percent = calculateCalorieIntakePercent(actualCalories, targetCalories);
  return clamp(percent, 0, 100);
}

function toMacroRatiosFromGrams(grams: MacroGrams): MacroRatios {
  // 목표 탄단지 비율(target_ratio)은 "열량 비율(%)"이므로,
  // 실제 섭취도 g 그대로가 아니라 kcal(탄4/단4/지9)로 변환해 같은 기준으로 비교한다.
  const macroCalories = {
    carbs: Math.max(0, grams.carbs) * MACRO_KCAL_PER_GRAM.carbs,
    protein: Math.max(0, grams.protein) * MACRO_KCAL_PER_GRAM.protein,
    fat: Math.max(0, grams.fat) * MACRO_KCAL_PER_GRAM.fat,
  };

  return normalizeMacroRatios(macroCalories);
}

/**
 * 최종 식사 점수 계산의 단일 기준 함수.
 * - 칼로리 점수(최대 50점): 목표 대비 오차율로 계산
 * - 탄단지 점수(최대 50점): 목표 비율 대비 편차로 계산
 * - 최종 점수: 위 두 점수 합산(0~100 clamp)
 */
function calculateNutrientScore({
  actualCalories,
  targetCalories,
  actualMacroRatios,
  targetMacroRatios,
}: NutrientScoreInput): NutrientScoreResult {
  const normalizedActual = normalizeMacroRatios(actualMacroRatios);
  const normalizedTarget = normalizeMacroRatios(targetMacroRatios);

  const carbsDeviation = Math.abs(normalizedActual.carbs - normalizedTarget.carbs);
  const proteinDeviation = Math.abs(normalizedActual.protein - normalizedTarget.protein);
  const fatDeviation = Math.abs(normalizedActual.fat - normalizedTarget.fat);

  const macro: Record<MacroKey, MacroScoreDetail> = {
    carbs: {
      actualRatio: roundTo(normalizedActual.carbs),
      targetRatio: roundTo(normalizedTarget.carbs),
      deviation: roundTo(carbsDeviation),
      score: getMacroItemScore("carbs", carbsDeviation),
      grade: getGradeByDeviation(carbsDeviation),
    },
    protein: {
      actualRatio: roundTo(normalizedActual.protein),
      targetRatio: roundTo(normalizedTarget.protein),
      deviation: roundTo(proteinDeviation),
      score: getMacroItemScore("protein", proteinDeviation),
      grade: getGradeByDeviation(proteinDeviation),
    },
    fat: {
      actualRatio: roundTo(normalizedActual.fat),
      targetRatio: roundTo(normalizedTarget.fat),
      deviation: roundTo(fatDeviation),
      score: getMacroItemScore("fat", fatDeviation),
      grade: getGradeByDeviation(fatDeviation),
    },
  };

  const macroScore = macro.carbs.score + macro.protein.score + macro.fat.score;
  const calorieDiffPercent = calculateCalorieDiffPercent(actualCalories, targetCalories);
  const calorieScore = getCalorieScoreByDiff(calorieDiffPercent);
  const totalScore = clamp(calorieScore + macroScore, 0, 100);

  const macroAverageDeviation = roundTo((carbsDeviation + proteinDeviation + fatDeviation) / 3);
  const macroBalanceGrade = getGradeByDeviation(macroAverageDeviation);
  const overallGrade = getNutrientGradeByScore(totalScore);

  return {
    totalScore,
    calorieScore,
    macroScore,
    calorieDiffPercent: roundTo(calorieDiffPercent),
    macroAverageDeviation,
    overallGrade,
    overallMessage: getNutrientGuideMessageByScore(totalScore),
    macroBalanceGrade,
    macro,
  };
}

/**
 * 화면에서 재사용하기 위한 "하루 영양 지표" 집계 함수.
 * - 점수 계산(calculateNutrientScore)
 * - 칼로리 진행률/차이값
 * - 실제 탄단지 비율(%)까지 한 번에 반환
 */
export function calculateDailyNutritionMetrics({
  actualCalories,
  targetCalories,
  actualMacrosInGram,
  targetMacroRatios,
}: DailyNutritionMetricsInput): DailyNutritionMetrics {
  const safeActualCalories = Number.isFinite(actualCalories) ? actualCalories : 0;
  const safeTargetCalories =
    Number.isFinite(targetCalories) && targetCalories > 0 ? targetCalories : 0;

  const actualMacroRatios = toMacroRatiosFromGrams(actualMacrosInGram);
  const score = calculateNutrientScore({
    actualCalories: safeActualCalories,
    targetCalories: safeTargetCalories,
    actualMacroRatios,
    targetMacroRatios,
  });

  const calorieIntakePercent = calculateCalorieIntakePercent(
    safeActualCalories,
    safeTargetCalories,
  );

  return {
    roundedActualCalories: Math.round(safeActualCalories),
    roundedTargetCalories: Math.round(safeTargetCalories),
    calorieDiff: safeTargetCalories - safeActualCalories,
    calorieIntakePercent,
    calorieProgressPercent: clamp(calorieIntakePercent, 0, 100),
    actualMacroRatios: {
      carbs: roundTo(actualMacroRatios.carbs),
      protein: roundTo(actualMacroRatios.protein),
      fat: roundTo(actualMacroRatios.fat),
    },
    score,
  };
}

/**
 * UI 표시 정책용 영양 지표 계산.
 * - 식사 기록이 없으면(총 칼로리 0 이하) 점수는 0점으로 노출되므로 null을 반환한다.
 */
export function calculateDailyNutritionMetricsForDisplay(
  input: DailyNutritionMetricsInput,
): DailyNutritionMetrics | null {
  const safeActualCalories = Number.isFinite(input.actualCalories) ? input.actualCalories : 0;
  if (safeActualCalories <= 0) {
    return null;
  }

  return calculateDailyNutritionMetrics(input);
}

export function hasValidDailyNutritionTarget(
  target: DailyNutritionTargetSource | null | undefined,
): target is DailyNutritionTargetSource {
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

/**
 * 하루 식사 집계와 사용자 목표를 기존 점수 계산 입력으로 변환한다.
 * 화면에서는 개별 칼로리·탄단지 필드를 다시 조립하지 않고 이 함수를 사용한다.
 */
export function calculateDayMealNutrition(
  dayMeal: DayMealNutritionSource | null | undefined,
  target: DailyNutritionTargetSource | null | undefined,
) {
  if (!dayMeal || !hasValidDailyNutritionTarget(target)) {
    return null;
  }

  return calculateDailyNutritionMetricsForDisplay({
    actualCalories: dayMeal.totalCalories,
    targetCalories: target.target_calories,
    actualMacrosInGram: dayMeal.totalNutrients,
    targetMacroRatios: {
      carbs: target.target_ratio[0],
      protein: target.target_ratio[1],
      fat: target.target_ratio[2],
    },
  });
}

export function calculateMacroPercentToGram({
  nutrientType,
  totalCalories,
  percent,
}: {
  nutrientType: MacroKey;
  totalCalories: number;
  percent: number;
}) {
  if (!Number.isFinite(totalCalories) || !Number.isFinite(percent)) return 0;
  if (totalCalories <= 0 || percent <= 0) return 0;

  const targetKcal = (totalCalories * percent) / 100;
  const grams = targetKcal / MACRO_KCAL_PER_GRAM[nutrientType];

  return roundTo(grams, 0);
}
