import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

import ActionCard from "@/features/home/components/cards/ActionCard";
import { queryKeys } from "@/features/home/hooks/queries/queryKey";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import style from "@/features/home/styles/PreviewTodayScoreSection.module.css";
import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import {
  getCalorieSummary,
  hasValidTargets,
  resolveTargetCalories,
} from "@/features/home/utils/todayMealFeedback";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
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

  const { isPending: isSummaryPending } = useDayMealsQuery(selectedDate);

  const queryClient = useQueryClient();
  const dayMealSummary = queryClient.getQueryData<DayMealSummary>(
    queryKeys.dayMeals.byDate(selectedDate),
  );

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

    if (score === null || !dayMealSummary) {
      // TODO 새로고침하거나 그런 동작을 넣어야할거같은데
      return;
    }

    navigation(PATH.TODAY_MEAL_SCORE, {
      state: {
        score,
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
      <div className={style.scoreContainer}>
        <div className={style.scoreTextContainer}>
          <div className={style.scoreText}>
            <p className={`${style.calorieText} textNoWrap typo-title2`}>
              <span className={`${style.score} typo-h2`}>
                {calorieSummary.roundedCurrentCalories.toLocaleString("ko-KR")}
              </span>
              {"/ "}
              {calorieSummary.roundedTargetCalories !== null
                ? calorieSummary.roundedTargetCalories.toLocaleString("ko-KR")
                : "--"}{" "}
              kcal
            </p>

            <div className={style.dividerContainer} />

            <span className={`typo-title2`}>{score ?? "--"}점</span>

            <ChevronRight size={24} className={style.icon} />
          </div>

          <ScoreProgress
            value={
              nutritionMetrics?.calorieProgressPercent ??
              getCalorieProgressPercent(dayMealSummary?.totalCalories || 0, targetCalories ?? 0)
            }
            variant={isCalorieExceeded ? "danger-white" : "primary-white"}
          />
        </div>

        {isTargetInfoPending ? (
          <div className={style.badgeContentContainer}>
            <Skeleton width={154} height={18} radius={999} />
          </div>
        ) : (
          <Badge>{calorieSummary.message}</Badge>
        )}
      </div>
    </ActionCard>
  );
}

function PreviewTodayScoreSkeleton() {
  return (
    <ActionCard className={style.content}>
      <SkeletonStatus className={style.scoreContainer} label="오늘 식사 점수를 불러오는 중입니다.">
        <div className={style.scoreTextContainer}>
          <div className={style.scoreText}>
            <Skeleton width={168} height={36} radius={999} />
            <span className={style.dividerContainer} />
            <Skeleton width={52} height={28} radius={999} />
            <Skeleton className={style.icon} width={24} height={24} variant="circle" />
          </div>

          <Skeleton width="100%" height={8} radius={999} />
        </div>

        <div className={style.badgeContentContainer}>
          <Skeleton width={164} height={18} radius={999} />
        </div>
      </SkeletonStatus>
    </ActionCard>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <div className={style.badgeContentContainer}>
      <p className="typo-body3">{children}</p>
    </div>
  );
}
