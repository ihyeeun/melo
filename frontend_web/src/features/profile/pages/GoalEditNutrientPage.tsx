import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { registerWeight } from "@/features/home/api/todayRecord.api";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
import { useRecommendNutrientMutation } from "@/features/onboarding/hooks/mutations/useRecommendMutation";
import {
  updateActivity,
  updateBirthYear,
  updateGender,
  updateGoal,
  updateHeight,
  updateTargetCalories,
  updateTargetRatio,
  updateTargetWeight,
  updateWeight,
} from "@/features/profile/api/profile";
import {
  hasNutrientTotal,
  isRatioChanged,
  validateStartPlan,
} from "@/features/profile/goalEdit.model";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import {
  useEnsureGoalEditFlow,
  useFinishGoalEditFlow,
  useGoalEditDraft,
  useGoalEditHasActiveFlow,
  useGoalEditInitialDraft,
  useUpdateGoalEditDraft,
} from "@/features/profile/stores/goalEditFlow.store";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import type {
  ProfileResponseDto,
  WeightStepsResponseDto,
} from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { toast } from "@/shared/commons/toast/toast";
import { resetStackflow, useNavigate } from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

const INTERNAL_DECIMALS = 4;
const NUTRIENT_INPUT_PATTERN = /^(?:100(?:\.0?)?|[0-9]{0,2}(?:\.[0-9]?)?)$/;
const NUTRIENTS = [
  { type: "carbs", label: "탄수화물", energyPerGram: 4 },
  { type: "protein", label: "단백질", energyPerGram: 4 },
  { type: "fat", label: "지방", energyPerGram: 9 },
] as const;

type NutrientType = (typeof NUTRIENTS)[number]["type"];

function roundToPrecision(value: number) {
  const factor = 10 ** INTERNAL_DECIMALS;
  return Math.round(value * factor) / factor;
}

function formatRoundedValue(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "--";
  return Math.round(value).toString();
}

function isAllowedNutrientInput(nextInputValue: string) {
  return NUTRIENT_INPUT_PATTERN.test(nextInputValue);
}

export default function GoalEditNutrientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isPending } = useGetProfileQuery();
  const draft = useGoalEditDraft();
  const hasActiveFlow = useGoalEditHasActiveFlow();
  const initialDraft = useGoalEditInitialDraft();
  const ensureGoalEditFlow = useEnsureGoalEditFlow();
  const finishGoalEditFlow = useFinishGoalEditFlow();
  const updateDraft = useUpdateGoalEditDraft();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const visibleDraft = hasActiveFlow || isSubmitting ? draft : null;
  const hasEditedNutrientsRef = useRef(false);
  const {
    mutate: recommendNutrient,
    isIdle: isRecommendationIdle,
    isPending: isRecommendationLoading,
    isError: isRecommendationError,
  } = useRecommendNutrientMutation();
  const { target_calories, weight, goal, target_weight } = visibleDraft ?? {};
  const requestPayload = useMemo(() => {
    if (
      target_calories === undefined ||
      weight === undefined ||
      goal === undefined ||
      target_weight === undefined
    ) {
      return undefined;
    }

    return { target_calories, weight, goal, target_weight };
  }, [target_calories, weight, goal, target_weight]);
  const isRecommendationPending =
    requestPayload !== undefined && (isRecommendationIdle || isRecommendationLoading);

  useEffect(() => {
    if (!profile) {
      return;
    }

    ensureGoalEditFlow(profile);
  }, [ensureGoalEditFlow, profile]);

  useEffect(() => {
    if (!requestPayload) return;

    let cancelled = false;
    hasEditedNutrientsRef.current = false;

    recommendNutrient(requestPayload, {
      onSuccess: (nutrient) => {
        if (cancelled || hasEditedNutrientsRef.current) return;

        updateDraft({ carbs: nutrient.carbs, protein: nutrient.protein, fat: nutrient.fat });
      },
      onError: () => {
        if (cancelled) return;

        toast.warning("추천 비율을 불러오지 못했어요", "탄단지 비율을 직접 입력해주세요.");
      },
    });

    return () => {
      cancelled = true;
    };
  }, [recommendNutrient, requestPayload, updateDraft]);

  const handleNutrientChange = (nutrientType: NutrientType, value?: number) => {
    hasEditedNutrientsRef.current = true;
    updateDraft({ [nutrientType]: value });
  };

  const handleBack = () => {
    if (isSubmitting) return;
    navigate(-1);
  };

  const handleComplete = async () => {
    if (!visibleDraft || !initialDraft || isRecommendationPending || isSubmitting) {
      return;
    }

    const errorMessage = validateStartPlan(visibleDraft);
    if (errorMessage) {
      toast.warning(errorMessage);
      return;
    }

    if (visibleDraft.target_calories === undefined) {
      toast.warning("목표 칼로리를 입력해주세요");
      return;
    }

    if (!hasNutrientTotal(visibleDraft)) {
      toast.show({
        title: "탄단지 비율의 합을 100으로 맞춰주세요",
        type: "error",
        position: "bottom",
        timeout: 3000,
      });
      return;
    }

    const today = getTodayFormatDateKey();
    const updateTasks: Array<() => Promise<ProfileResponseDto>> = [];

    if (visibleDraft.gender !== undefined && visibleDraft.gender !== initialDraft.gender) {
      updateTasks.push(() => updateGender(visibleDraft.gender!));
    }

    if (visibleDraft.birthYear !== undefined && visibleDraft.birthYear !== initialDraft.birthYear) {
      updateTasks.push(() => updateBirthYear(visibleDraft.birthYear!));
    }

    if (visibleDraft.height !== undefined && visibleDraft.height !== initialDraft.height) {
      updateTasks.push(() => updateHeight(visibleDraft.height!));
    }

    if (visibleDraft.weight !== undefined && visibleDraft.weight !== initialDraft.weight) {
      updateTasks.push(async () => {
        const nextWeight = visibleDraft.weight!;
        const previousWeight = initialDraft.weight;
        const updatedProfile = await updateWeight(nextWeight);

        try {
          await registerWeight({ date: today, weight: nextWeight });
        } catch (error) {
          console.error("Failed to register updated weight", error);

          if (previousWeight !== undefined) {
            try {
              await updateWeight(previousWeight);
            } catch (rollbackError) {
              console.error("Failed to rollback profile weight", rollbackError);
            }
          }

          throw error;
        }

        queryClient.setQueryData<WeightStepsResponseDto>(
          homeQueryKeys.bodyStats(today),
          (previous) => ({
            weight: nextWeight,
            steps: previous?.steps ?? 0,
          }),
        );

        return updatedProfile;
      });
    }

    if (visibleDraft.activity !== undefined && visibleDraft.activity !== initialDraft.activity) {
      updateTasks.push(() => updateActivity(visibleDraft.activity!));
    }

    if (visibleDraft.goal !== undefined && visibleDraft.goal !== initialDraft.goal) {
      updateTasks.push(() => updateGoal(visibleDraft.goal!));
    }

    if (
      visibleDraft.target_weight !== undefined &&
      visibleDraft.target_weight !== initialDraft.target_weight
    ) {
      updateTasks.push(() => updateTargetWeight(visibleDraft.target_weight!));
    }

    if (
      visibleDraft.target_calories !== undefined &&
      visibleDraft.target_calories !== initialDraft.target_calories
    ) {
      updateTasks.push(() => updateTargetCalories(visibleDraft.target_calories!));
    }

    if (isRatioChanged(initialDraft, visibleDraft)) {
      updateTasks.push(() =>
        updateTargetRatio([visibleDraft.carbs!, visibleDraft.protein!, visibleDraft.fat!]),
      );
    }

    if (updateTasks.length === 0) {
      toast.warning("변경된 내용이 없어요");
      return;
    }

    try {
      setIsSubmitting(true);

      for (const task of updateTasks) {
        await task();
      }

      track(EVENT_NAME.USER_PROFILE_UPDATED);
      toast.success("목표를 수정했어요");
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile,
      });
      finishGoalEditFlow();

      resetStackflow(PATH.PROFILE, {
        animate: false,
      });
    } catch (error) {
      console.error(error);
      toast.warning("목표 수정에 실패했어요");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${styles.page} page`}>
      <PageHeader onBack={handleBack} />

      <main className="main">
        {isPending && !visibleDraft && <p>프로필 목표 정보를 불러오는 중입니다</p>}
        {!isPending && !visibleDraft && <p>프로필을 불러오지 못했어요</p>}

        {visibleDraft && (
          <div className={styles.content}>
            <section className={styles.nutrientTitleGroup}>
              <h2 className="title-l-semi text-primary">새롭게 추천하는 탄단지 비율이에요</h2>
              <p className="body-l-regular text-primary">
                {isRecommendationPending
                  ? "추천 비율을 계산하고 있어요"
                  : isRecommendationError
                    ? "추천 비율을 불러오지 못했어요. 직접 입력해주세요"
                    : "원하는대로 비율을 수정할 수 있어요"}
              </p>
            </section>

            <section className={styles.macroEditCardGroup}>
              {NUTRIENTS.map(({ type, label, energyPerGram }) => {
                const value = visibleDraft[type] ?? 0;
                const targetKcal =
                  visibleDraft.target_calories === undefined
                    ? undefined
                    : roundToPrecision((visibleDraft.target_calories * value) / 100);
                const targetGram =
                  targetKcal === undefined
                    ? undefined
                    : roundToPrecision(targetKcal / energyPerGram);

                return (
                  <div key={type} className={styles.macroCard}>
                    <div className={styles.macroInfo}>
                      <span className="title-s-semi text-primary">{label}</span>
                      <div className={styles.macroAmount}>
                        <span className="body-s-regular text-secondary">
                          {formatRoundedValue(targetGram)} g
                        </span>
                        <span className="body-s-regular text-secondary">
                          {formatRoundedValue(targetKcal)} kcal
                        </span>
                      </div>
                    </div>

                    <NumberField
                      value={value}
                      onChange={(nextValue) => handleNutrientChange(type, nextValue)}
                      min={0}
                      max={100}
                      step={0.5}
                      snapOnStep
                      unit="%"
                      isInputTextAllowed={isAllowedNutrientInput}
                      unstyled
                      inputProps={{ "aria-label": `${label} 비율` }}
                      classNames={{
                        group: styles.macroInputArea,
                        decrement: styles.macroAdjustButton,
                        increment: styles.macroAdjustButton,
                        inputWrapper: styles.macroInputSection,
                        input: `${styles.macroInput} title-m-medium`,
                        unit: `title-m-medium text-primary`,
                      }}
                      decrementIcon={<SystemIcon name="minus" size={18} />}
                      incrementIcon={<SystemIcon name="plus" size={18} />}
                    />
                  </div>
                );
              })}

              <article className={styles.macroTotalCard}>
                <span className="body-l-medium text-tertiary">
                  목표 칼로리 {visibleDraft.target_calories ?? "--"} kcal
                </span>
                <span className="title-s-semi text-primary marginLeft">
                  총{" "}
                  {(visibleDraft?.carbs ?? 0) +
                    (visibleDraft?.protein ?? 0) +
                    (visibleDraft?.fat ?? 0)}
                  %
                </span>
              </article>
            </section>
          </div>
        )}
      </main>

      <footer className="footer">
        <Button
          onClick={handleComplete}
          disabled={!visibleDraft || isRecommendationPending || isSubmitting}
          fullWidth
          variant={"default"}
          size="m"
        >
          {isSubmitting ? "수정 중.." : "완료"}
        </Button>
      </footer>

      {/* <CheckButtonModal
        open={isNutrientTotalModalOpen}
        onOpenChange={setIsNutrientTotalModalOpen}
        title="영양소 비율 확인"
        description="탄단지 비율의 합을 100으로 맞춰주세요"
      /> */}
    </div>
  );
}
