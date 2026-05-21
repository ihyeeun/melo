import { useEffect, useMemo } from "react";

import { useRecommendNutrientMutation } from "@/features/onboarding/hooks/mutations/useRecommendMutation";
import type { StepComponentProps } from "@/features/onboarding/onboarding.types";
import styles from "@/features/onboarding/styles/OnboardingSteps.module.css";
import NumberField from "@/shared/commons/input/NumberField";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";

const INTERNAL_DECIMALS = 4;
const NUTRIENT_INPUT_PATTERN = /^(?:100(?:\.0?)?|[0-9]{0,2}(?:\.[0-9]?)?)$/;
const NUTRIENT_ENERGY_PER_GRAM = {
  carbs: 4,
  protein: 4,
  fat: 9,
} as const;

type NutrientType = keyof typeof NUTRIENT_ENERGY_PER_GRAM;

function roundToPrecision(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculateTargetKcal(targetCalories: number, ratioPercent: number) {
  const kcal = (targetCalories * ratioPercent) / 100;
  return roundToPrecision(kcal, INTERNAL_DECIMALS);
}

function calculateTargetGram(targetKcal: number, nutrientType: NutrientType) {
  const gram = targetKcal / NUTRIENT_ENERGY_PER_GRAM[nutrientType];
  return roundToPrecision(gram, INTERNAL_DECIMALS);
}

function formatRoundedValue(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "--";
  return Math.round(value).toString();
}

function isAllowedNutrientInput(nextInputValue: string) {
  return NUTRIENT_INPUT_PATTERN.test(nextInputValue);
}

export default function StepNutrient({ data, update }: StepComponentProps) {
  const requestPayload = useMemo(
    () => ({
      target_calories: data.target_calories,
      weight: data.weight,
      goal: data.goal,
      target_weight: data.target_weight,
    }),
    [data.goal, data.target_calories, data.weight, data.target_weight],
  );

  const { mutate, data: nutrient, isPending } = useRecommendNutrientMutation();

  useEffect(() => {
    mutate(requestPayload);
  }, [mutate, requestPayload]);

  useEffect(() => {
    if (!nutrient) return;
    update({
      carbs: nutrient.carbs,
      protein: nutrient.protein,
      fat: nutrient.fat,
    });
  }, [nutrient, update]);

  return (
    <section className={styles.content}>
      <div
        className={`${styles.onboardingTitle} ${styles.onboardingTitleGroup} ${styles.onboardingTitleGroupCompact}`}
      >
        <h2 className="typo-title1">추천하는 탄단지 비율이에요</h2>
        {isPending ? (
          <div className={styles.onboardingLoadingRow}>
            <LoadingIndicator iconSize={24} label="추천 탄단지 비율을 계산하는 중입니다." />
            <p className={styles.onboardingSubtitle}>추천 비율을 계산하고 있어요</p>
          </div>
        ) : (
          <p className={styles.onboardingSubtitle}>비율을 수정할 수 있어요</p>
        )}
      </div>
      <div className={styles.onboardingNutrientContent}>
        <p className={`${styles.onboardingNutrientGoal} ${styles.textPrimary} typo-title1`}>
          목표 칼로리 {data.target_calories ?? "--"}kcal
        </p>
        <div className={styles.onboardingNutrientList}>
          <NutrientCard
            label="탄수화물"
            nutrientType="carbs"
            targetCalories={data.target_calories}
            value={data.carbs ?? 0}
            onChange={(v) => update({ carbs: v })}
          />
          <NutrientCard
            label="단백질"
            nutrientType="protein"
            targetCalories={data.target_calories}
            value={data.protein ?? 0}
            onChange={(v) => update({ protein: v })}
          />
          <NutrientCard
            label="지방"
            nutrientType="fat"
            targetCalories={data.target_calories}
            value={data.fat ?? 0}
            onChange={(v) => update({ fat: v })}
          />
        </div>
      </div>
    </section>
  );
}

type NutrientCardProps = {
  label: string;
  nutrientType: NutrientType;
  targetCalories?: number;
  value?: number;
  onChange: (v?: number) => void;
};

function NutrientCard({ label, nutrientType, targetCalories, value, onChange }: NutrientCardProps) {
  const targetKcal =
    value === undefined || targetCalories === undefined
      ? undefined
      : calculateTargetKcal(targetCalories, value);

  const targetGram =
    targetKcal === undefined ? undefined : calculateTargetGram(targetKcal, nutrientType);

  return (
    <div className={styles.onboardingNutrientCard}>
      <label className={`${styles.onboardingNutrientLabel} typo-title3`}>{label}</label>
      <NumberField
        value={value}
        onChange={onChange}
        min={0}
        max={100}
        step={0.5}
        snapOnStep
        unit="%"
        isInputTextAllowed={isAllowedNutrientInput}
        classNames={{
          decrement: styles.weightAdjustButton,
          increment: styles.weightAdjustButton,
        }}
      />

      <div className={styles.onboardingNutrientDivider} />

      <div className={styles.onboardingNutrientMeta}>
        <span className="typo-body1">{formatRoundedValue(targetGram)}g</span>
        <span className="typo-body1">{formatRoundedValue(targetKcal)}kcal</span>
      </div>
    </div>
  );
}
