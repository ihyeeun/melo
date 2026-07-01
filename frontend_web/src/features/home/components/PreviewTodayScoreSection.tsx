import ActivityCaloriesPopover from "@/features/health/components/ActivityCaloriesPopover";
import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import ActionCard from "@/features/home/components/cards/ActionCard";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import style from "@/features/home/styles/PreviewTodayScoreSection.module.css";
import {
  getActivityAdjustedTargetCalories,
  getActivityCalorieProgressDash,
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
import { useTargetsLoadedState, useTargetsState } from "@/shared/stores/targetNutrient.store";
import { calculateDailyNutritionMetricsForDisplay } from "@/shared/utils/nutrientScore";

type PreviewTodayScoreSectionProps = {
  selectedDate: string;
};

type PreviewTodayScoreCardProps = {
  currentCalories: number;
  date?: string;
  isCalorieExceeded: boolean;
  message: string;
  onClick?: () => void;
  progressDash?: { label?: string; value: number } | null;
  progressMax: number | null;
  progressValue: number;
  score: number | null;
  targetCalories: number | null;
};

export default function PreviewTodayScoreSection({ selectedDate }: PreviewTodayScoreSectionProps) {
  const navigation = useNavigate();

  const { data: dayMealSummary, isPending: isSummaryPending } = useDayMealsQuery(selectedDate);
  const { summary: activitySummary } = useActivityCalories(selectedDate);

  const targets = useTargetsState();
  const hasTargetsLoaded = useTargetsLoadedState();
  const targetCalories = resolveTargetCalories(targets);
  const adjustedTargetCalories = getActivityAdjustedTargetCalories(
    targetCalories,
    activitySummary?.calories,
  );
  const hasTargetCalories = targetCalories !== null;
  const shouldFetchProfile = hasTargetsLoaded && !hasTargetCalories;
  const { isPending: isProfilePending } = useGetProfileQuery({
    enabled: shouldFetchProfile,
  });

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
  const calorieSummary = getCalorieSummary(
    dayMealSummary?.totalCalories ?? 0,
    adjustedTargetCalories,
  );
  const isCalorieExceeded =
    adjustedTargetCalories !== null &&
    (dayMealSummary?.totalCalories ?? 0) > adjustedTargetCalories;
  const isTargetInfoPending = shouldFetchProfile && isProfilePending;
  const progressDash = getActivityCalorieProgressDash({
    targetCalories,
    adjustedTargetCalories,
  });

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
      },
    });
  };

  if (isSummaryPending) {
    return <PreviewTodayScoreSkeleton />;
  }

  return (
    <PreviewTodayScoreCard
      score={score}
      message={isTargetInfoPending ? "목표 정보를 불러오는 중입니다." : calorieSummary.message}
      currentCalories={calorieSummary.roundedCurrentCalories}
      targetCalories={calorieSummary.roundedTargetCalories}
      progressValue={calorieSummary.roundedCurrentCalories}
      progressMax={calorieSummary.roundedTargetCalories}
      progressDash={progressDash}
      isCalorieExceeded={isCalorieExceeded}
      onClick={handleTodayMealScoreClick}
      date={selectedDate}
    />
  );
}

export function PreviewTodayScorePreview() {
  return (
    <PreviewTodayScoreCard
      score={84}
      message="오늘 목표까지 1,240kcal 남았어요"
      currentCalories={560}
      targetCalories={1800}
      progressValue={560}
      progressMax={1800}
      isCalorieExceeded={false}
    />
  );
}

function PreviewTodayScoreCard({
  currentCalories,
  date,
  isCalorieExceeded,
  message,
  onClick,
  progressDash = null,
  progressMax,
  progressValue,
  score,
  targetCalories,
}: PreviewTodayScoreCardProps) {
  return (
    <ActionCard className={style.content} onClick={onClick}>
      <section className={style.scoreContainer}>
        <div className={style.scoreText}>
          <img src="/icons/face-2.svg" width={50} alt="" aria-hidden="true" />
          <span className={`typo-title1`}>{score ?? "--"}점</span>
        </div>
        <p className={`typo-body3 ${style.textAssistive}`}>{message}</p>
      </section>

      <section className={style.caloriesContainer}>
        <p className={`${style.calorieText} textNoWrap typo-title2`}>
          <span className={`${style.score} typo-h2`}>
            {currentCalories.toLocaleString("ko-KR")}
          </span>
          {"/ "}
          {targetCalories !== null ? targetCalories.toLocaleString("ko-KR") : "--"} kcal
          {date ? <ActivityCaloriesPopover /> : null}
          <SystemIcon name="chevron-right-normal" size={24} className={style.icon} />
        </p>
        <ScoreProgress
          value={progressMax === null ? 0 : progressValue}
          max={progressMax ?? 100}
          dash={progressDash}
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
          <Skeleton width={136} height={18} radius={999} />
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
