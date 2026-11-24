import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { calendarKeys } from "@/features/calendar/hooks/queries/calendar.queryKey";
import { registerWeight } from "@/features/home/api/todayRecord.api";
import { queryKeys as homeQueryKeys } from "@/features/home/hooks/queries/todayRecord.queryKey";
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
  getRatioRecommendationKey,
  hasNutrientTotal,
  isRatioChanged,
  roundRecommendedRatio,
  toTargetRatio,
  validateStartPlan,
} from "@/features/profile/goalEdit.model";
import { useRecommendNutrientMutation } from "@/features/profile/hooks/mutations/useRecommendMutation";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import {
  useEnsureGoalEditFlow,
  useFinishGoalEditFlow,
  useGoalEditDraft,
  useGoalEditFlowStore,
  useGoalEditHasActiveFlow,
  useGoalEditInitialDraft,
  useSetGoalEditRecommendationBasis,
  useUpdateGoalEditDraft,
} from "@/features/profile/stores/goalEditFlow.store";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import type { WeightStepsResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
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
  return Math.round(value).toLocaleString("ko-KR");
}

function isAllowedNutrientInput(nextInputValue: string) {
  return NUTRIENT_INPUT_PATTERN.test(nextInputValue);
}

type GoalUpdateTask = {
  run: () => Promise<unknown>;
  // 처음 값이 없던 항목은 되돌릴 수 없다
  undo?: () => Promise<unknown>;
};

// 저장한 순서의 반대로 처음 값을 다시 저장한다. 하나라도 되돌리지 못하면 false
async function rollbackGoalUpdateTasks(tasks: GoalUpdateTask[]) {
  let isRolledBack = true;

  for (const task of [...tasks].reverse()) {
    if (!task.undo) {
      isRolledBack = false;
      continue;
    }

    try {
      await task.undo();
    } catch (error) {
      isRolledBack = false;
      console.error("Failed to rollback goal update", error);
    }
  }

  return isRolledBack;
}

// screen: PRF-01-005
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
  const setRecommendationBasis = useSetGoalEditRecommendationBasis();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNutrientTotalModalOpen, setIsNutrientTotalModalOpen] = useState(false);
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
    const basisKey = getRatioRecommendationKey(requestPayload);

    recommendNutrient(requestPayload, {
      onSuccess: (nutrient) => {
        if (cancelled || hasEditedNutrientsRef.current) return;
        // 계산에 들어가는 값(목표 칼로리 등)이 그대로면 지금 비율(저장된 값 · 직접 고친 값)을 유지한다
        if (useGoalEditFlowStore.getState().recommendationBasis.ratio === basisKey) return;

        const [carbs, protein, fat] = roundRecommendedRatio([
          nutrient.carbs,
          nutrient.protein,
          nutrient.fat,
        ]);
        updateDraft({ carbs, protein, fat });
        setRecommendationBasis({ ratio: basisKey });
      },
      onError: (error) => {
        if (isRequestAbortError(error)) return;
        if (cancelled) return;

        toast.error("추천 비율을 불러오지 못했어요", "탄단지 비율을 직접 입력해주세요");
      },
    });

    return () => {
      cancelled = true;
    };
  }, [recommendNutrient, requestPayload, setRecommendationBasis, updateDraft]);

  const handleNutrientChange = (nutrientType: NutrientType, value?: number) => {
    hasEditedNutrientsRef.current = true;
    updateDraft({ [nutrientType]: value });
    if (visibleDraft) {
      setRecommendationBasis({ ratio: getRatioRecommendationKey(visibleDraft) });
    }
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

    if (!hasNutrientTotal(toTargetRatio(visibleDraft))) {
      setIsNutrientTotalModalOpen(true);
      return;
    }

    const today = getTodayFormatDateKey();
    // 항목마다 API가 따로라, 중간에 실패하면 앞서 저장한 항목을 처음 값으로 되돌려 전부 저장되거나 전부 안 되게 한다
    const updateTasks: GoalUpdateTask[] = [];
    const pushFieldTask = <T,>(
      next: T | undefined,
      initial: T | undefined,
      update: (value: T) => Promise<unknown>,
    ) => {
      if (next === undefined || next === initial) return;
      updateTasks.push({
        run: () => update(next),
        undo: initial === undefined ? undefined : () => update(initial),
      });
    };

    pushFieldTask(visibleDraft.gender, initialDraft.gender, updateGender);
    pushFieldTask(visibleDraft.birthYear, initialDraft.birthYear, updateBirthYear);
    pushFieldTask(visibleDraft.height, initialDraft.height, updateHeight);
    pushFieldTask(visibleDraft.weight, initialDraft.weight, updateWeight);
    pushFieldTask(visibleDraft.activity, initialDraft.activity, updateActivity);
    pushFieldTask(visibleDraft.goal, initialDraft.goal, updateGoal);
    pushFieldTask(visibleDraft.target_weight, initialDraft.target_weight, updateTargetWeight);
    pushFieldTask(visibleDraft.target_calories, initialDraft.target_calories, updateTargetCalories);

    if (isRatioChanged(initialDraft, visibleDraft)) {
      const { carbs, protein, fat } = initialDraft;
      updateTasks.push({
        run: () =>
          updateTargetRatio([visibleDraft.carbs!, visibleDraft.protein!, visibleDraft.fat!]),
        undo:
          carbs === undefined || protein === undefined || fat === undefined
            ? undefined
            : () => updateTargetRatio([carbs, protein, fat]),
      });
    }

    // 체중 기록은 되돌릴 수 없어서 프로필 항목을 모두 저장한 뒤 마지막에 남긴다
    if (visibleDraft.weight !== undefined && visibleDraft.weight !== initialDraft.weight) {
      const nextWeight = visibleDraft.weight;
      updateTasks.push({
        run: async () => {
          await registerWeight({ date: today, weight: nextWeight });

          queryClient.setQueryData<WeightStepsResponseDto>(
            homeQueryKeys.bodyStats(today),
            (previous) => ({
              weight: nextWeight,
              steps: previous?.steps ?? 0,
            }),
          );
          await queryClient.invalidateQueries({
            queryKey: calendarKeys.monthly.month({ date: today.slice(0, 7), mode: "weight" }),
          });
        },
      });
    }

    // 바뀐 게 없으면 저장할 것 없이 끝내고 프로필로 돌아간다
    if (updateTasks.length === 0) {
      finishGoalEditFlow();
      resetStackflow(PATH.PROFILE, {
        animate: false,
      });
      return;
    }

    const completedTasks: GoalUpdateTask[] = [];

    try {
      setIsSubmitting(true);

      for (const task of updateTasks) {
        await task.run();
        completedTasks.push(task);
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
      if (isRequestAbortError(error)) return;
      console.error(error);

      const isRolledBack = await rollbackGoalUpdateTasks(completedTasks);
      if (isRolledBack) {
        toast.error("목표를 수정하지 못했어요", "잠시 후 다시 시도해주세요");
        return;
      }

      // 되돌리지 못한 항목이 있으면 서버 값을 다시 받아 프로필에 맞춘다
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile,
      });
      toast.error("목표를 수정하지 못했어요", "일부 항목만 저장됐을 수 있어요. 다시 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${styles.page} page`}>
      <PageHeader title="목표 재설정" onBack={handleBack} />

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
                    : "원하는 대로 비율을 수정할 수 있어요"}
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
                  목표 칼로리 {visibleDraft.target_calories?.toLocaleString("ko-KR") ?? "--"} kcal
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
          {isSubmitting ? "수정 중…" : "완료"}
        </Button>
      </footer>

      {/* screen: PRF-01-005_modal-macro-ratio-error */}
      <CheckButtonModal
        open={isNutrientTotalModalOpen}
        onOpenChange={setIsNutrientTotalModalOpen}
        title="영양소 비율 확인"
        description="탄단지 비율의 합을 100%로 맞춰주세요"
      />
    </div>
  );
}
