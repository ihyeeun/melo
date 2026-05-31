import { useEffect } from "react";

import ActionCard from "@/features/home/components/cards/ActionCard";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import style from "@/features/home/styles/PreviewTodayScoreSection.module.css";
import {
  getCalorieSummary,
  hasValidTargets,
  resolveTargetCalories,
} from "@/features/home/utils/todayMealFeedback";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import ScoreProgress from "@/shared/commons/progress/Progress";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import {
  useSetTargets,
  useTargetsLoadedState,
  useTargetsState,
} from "@/shared/stores/targetNutrient.store";
import {
  calculateDailyNutritionMetricsForDisplay,
  getCalorieProgressPercent,
} from "@/shared/utils/nutrientScore";

export default function PreviewTodayScoreSection({ selectedDate }: { selectedDate: string }) {
  const navigation = useNavigate();

  const { data: dayMealSummary, isPending: isSummaryPending } = useDayMealsQuery(selectedDate);

  const targets = useTargetsState();
  const setTargets = useSetTargets();
  const hasTargetsLoaded = useTargetsLoadedState();
  const targetCalories = resolveTargetCalories(targets);
  const hasTargetCalories = targetCalories !== null;
  const shouldFetchProfile = hasTargetsLoaded && !hasTargetCalories;
  const { data: profile, isPending: isProfilePending } = useGetProfileQuery({
    enabled: shouldFetchProfile,
  });

  useEffect(() => {
    if (!profile || hasTargetCalories) {
      return;
    }

    setTargets({
      target_calories: profile.target_calories,
      target_ratio: profile.target_ratio,
    });
  }, [hasTargetCalories, profile, setTargets]);

  const nutritionInput =
    hasValidTargets(targets) && dayMealSummary
      ? {
          actualCalories: dayMealSummary.totalCalories,
          targetCalories: targets.target_calories,
          actualMacrosInGram: {
            carbs: dayMealSummary.totalNutrients.carbs,
            protein: dayMealSummary.totalNutrients.protein,
            fat: dayMealSummary.totalNutrients.fat,
          },
          targetMacroRatios: {
            carbs: targets.target_ratio[0],
            protein: targets.target_ratio[1],
            fat: targets.target_ratio[2],
          },
        }
      : null;

  const nutritionMetrics = nutritionInput
    ? calculateDailyNutritionMetricsForDisplay(nutritionInput)
    : null;
  const score = nutritionInput ? (nutritionMetrics?.score.totalScore ?? 0) : null;
  const calorieSummary = getCalorieSummary(dayMealSummary?.totalCalories ?? 0, targetCalories);
  const isCalorieExceeded =
    targetCalories !== null && (dayMealSummary?.totalCalories ?? 0) > targetCalories;
  const isTargetInfoPending = shouldFetchProfile && isProfilePending;

  const handleTodayMealScoreClick = () => {
    if (!hasValidTargets(targets)) {
      toast.warning("목표 칼로리 설정 후 이용할 수 있어요");
      return;
    }

    if (!dayMealSummary) {
      return;
    }

    const scoreForNavigation = nutritionMetrics?.score.totalScore ?? 0;

    navigation(PATH.TODAY_MEAL_SCORE, {
      state: {
        score: scoreForNavigation,
        targets: targets,
        currents: dayMealSummary,
        calorieMessage: calorieSummary.message,
      },
    });
  };

  if (isSummaryPending) {
    return <PreviewTodayScoreSkeleton />;
  }

  return (
    <ActionCard className={style.content} onClick={handleTodayMealScoreClick}>
      <section className={style.scoreContainer}>
        <div className={style.scoreText}>
          <img src="/icons/face-2.svg" width={50} alt="" aria-hidden="true" />
          <span className={`typo-title1`}>{score ?? "--"}점</span>
        </div>
        {!isTargetInfoPending ? (
          <p className={`typo-body3 ${style.textAssistive}`}>{calorieSummary.message}</p>
        ) : null}
      </section>

      <section className={style.caloriesContainer}>
        <p className={`${style.calorieText} textNoWrap typo-title2`}>
          <span className={`${style.score} typo-h2`}>
            {calorieSummary.roundedCurrentCalories.toLocaleString("ko-KR")}
          </span>
          {"/ "}
          {calorieSummary.roundedTargetCalories !== null
            ? calorieSummary.roundedTargetCalories.toLocaleString("ko-KR")
            : "--"}{" "}
          kcal
          <SystemIcon name="chevron-right-normal" size={24} className={style.icon} />
        </p>
        <ScoreProgress
          value={
            nutritionMetrics?.calorieProgressPercent ??
            getCalorieProgressPercent(dayMealSummary?.totalCalories || 0, targetCalories ?? 0)
          }
          variant={isCalorieExceeded ? "danger-white" : "primary-white"}
        />
      </section>
    </ActionCard>
  );
}

function PreviewTodayScoreSkeleton() {
  return (
    <ActionCard className={style.content}>
      <SkeletonStatus className={style.skeletonContent} label="오늘 식사 점수를 불러오는 중입니다.">
        <section className={style.scoreContainer}>
          <div className={style.scoreText}>
            <Skeleton width={50} height={50} variant="circle" />
            <Skeleton width={68} height={30} radius={999} />
          </div>
        </section>

        <section className={style.caloriesContainer}>
          <div className={`${style.calorieText} textNoWrap`}>
            <Skeleton width={92} height={24} radius={999} />
            <Skeleton width={112} height={24} radius={999} />
          </div>

          <Skeleton width="100%" height={12} radius={999} />
        </section>
      </SkeletonStatus>
    </ActionCard>
  );
}
