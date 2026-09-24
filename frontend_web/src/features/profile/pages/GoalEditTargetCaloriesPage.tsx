import { useEffect, useMemo, useRef } from "react";

import { useTargetCaloriesMutation } from "@/features/onboarding/hooks/mutations/useRecommendMutation";
import { getGoalWeekEstimate } from "@/features/onboarding/utils/calculateGoalWeek";
import {
  GOAL_CALORIES_MAX,
  GOAL_CALORIES_MIN,
  type GoalEditDraft,
  validateGoalCalories,
} from "@/features/profile/goalEdit.model";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import {
  useEnsureGoalEditFlow,
  useGoalEditDraft,
  useGoalEditHasActiveFlow,
  useUpdateGoalEditDraft,
} from "@/features/profile/stores/goalEditFlow.store";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { NumberInput } from "@/shared/commons/input/NumberInput";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

function getGoalWeekMessage(data: GoalEditDraft) {
  const targetCalories = data.target_calories;

  if (targetCalories === undefined) {
    return "목표 칼로리를 입력하면 예상 기간을 확인할 수 있어요";
  }

  if (
    !Number.isInteger(targetCalories) ||
    targetCalories < GOAL_CALORIES_MIN ||
    targetCalories > GOAL_CALORIES_MAX
  ) {
    return "목표 칼로리는 1~99999 사이로 입력해주세요";
  }

  const estimate = getGoalWeekEstimate(data, targetCalories);
  if (estimate.status === "invalid" && estimate.reason === "insufficient_data") {
    return "목표 달성 기간을 계산할 정보가 부족해요";
  }

  if (estimate.status === "invalid") {
    return "해당 칼로리로는 목표 달성이 어려워요";
  }

  return `목표 달성까지 약 ${estimate.weeks}주 걸려요`;
}

export default function GoalEditTargetCaloriesPage() {
  const navigate = useNavigate();
  const { data: profile, isPending } = useGetProfileQuery();
  const draft = useGoalEditDraft();
  const hasActiveFlow = useGoalEditHasActiveFlow();
  const ensureGoalEditFlow = useEnsureGoalEditFlow();
  const updateDraft = useUpdateGoalEditDraft();
  const visibleDraft = hasActiveFlow ? draft : null;
  const hasEditedCaloriesRef = useRef(false);
  const {
    mutate: recommendCalories,
    data: recommendedCalories,
    isIdle: isRecommendationIdle,
    isPending: isRecommendationLoading,
    isError: isRecommendationError,
  } = useTargetCaloriesMutation();
  const { gender, birthYear, weight, height, activity, goal, target_weight } = visibleDraft ?? {};

  const requestPayload = useMemo(() => {
    if (
      gender === undefined ||
      birthYear === undefined ||
      weight === undefined ||
      height === undefined ||
      activity === undefined ||
      goal === undefined
    ) {
      return undefined;
    }

    return { gender, birthYear, weight, height, activity, goal, target_weight };
  }, [gender, birthYear, weight, height, activity, goal, target_weight]);
  const isRecommendationPending =
    requestPayload !== undefined && (isRecommendationIdle || isRecommendationLoading);
  const recommendationMessage = isRecommendationPending
    ? "추천 목표 칼로리를 계산하고 있어요"
    : isRecommendationError
      ? "추천 목표 칼로리를 불러오지 못했어요"
      : recommendedCalories === undefined
        ? "추천 목표 칼로리를 계산할 정보가 부족해요"
        : `추천하는 목표 칼로리는 ${Math.trunc(recommendedCalories)}kcal 예요`;

  useEffect(() => {
    if (!profile) {
      return;
    }

    ensureGoalEditFlow(profile);
  }, [ensureGoalEditFlow, profile]);

  useEffect(() => {
    if (!requestPayload) return;

    let cancelled = false;
    hasEditedCaloriesRef.current = false;

    recommendCalories(requestPayload, {
      onSuccess: (calories) => {
        // 늦게 도착한 추천값이 사용자가 입력하거나 지운 값을 덮어쓰지 않도록 한다.
        if (cancelled || hasEditedCaloriesRef.current) return;

        updateDraft({ target_calories: Math.trunc(calories) });
      },
      onError: () => {
        if (cancelled) return;

        toast.warning("추천 목표 칼로리를 불러오지 못했어요", "목표 칼로리를 직접 입력해주세요.");
      },
    });

    return () => {
      cancelled = true;
    };
  }, [recommendCalories, requestPayload, updateDraft]);

  const handleTargetCaloriesChange = (value?: number) => {
    if (value !== undefined && value > GOAL_CALORIES_MAX) return;

    hasEditedCaloriesRef.current = true;
    updateDraft({ target_calories: value === undefined ? undefined : Math.trunc(value) });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleGoNutrient = () => {
    if (!visibleDraft || isRecommendationPending) return;

    const validationError = validateGoalCalories(visibleDraft);
    if (validationError) {
      toast.warning(validationError.title, validationError.description);
      return;
    }

    navigate(PATH.GOAL_EDIT_NUTRIENT);
  };

  return (
    <div className={`${styles.page} page`}>
      <PageHeader onBack={handleBack} />

      <main className="main">
        {isPending && !visibleDraft && (
          <p className={styles.loadingText}>프로필 목표 정보를 불러오는 중입니다.</p>
        )}
        {!isPending && !visibleDraft && (
          <p className={styles.loadingText}>프로필을 불러오지 못했어요</p>
        )}

        {visibleDraft && (
          <section>
            <div className={styles.caloriesTitleGroup}>
              <h2 className="title-l-semi text-primary">
                수정한 목표에 맞게
                <br />
                목표 칼로리도 다시 추천해드릴게요
              </h2>
              <p className="body-l-regular text-primary">{recommendationMessage}</p>
            </div>

            <NumberInput
              value={visibleDraft.target_calories}
              onChange={handleTargetCaloriesChange}
              placeholder="목표 칼로리 입력"
              min={GOAL_CALORIES_MIN}
              max={GOAL_CALORIES_MAX}
              step={1}
              inputMode="numeric"
              unit="kcal"
              normalizeOnBlur={false}
            />

            <p
              className={`body-l-regular text-secondary textCenter ${styles.calculateWeekMessage}`}
            >
              {getGoalWeekMessage(visibleDraft)}
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <Button
          onClick={handleGoNutrient}
          disabled={!visibleDraft || isRecommendationPending}
          fullWidth
          variant={draft?.target_calories ? "default" : "disabled"}
          size="m"
        >
          다음
        </Button>
      </footer>
    </div>
  );
}
