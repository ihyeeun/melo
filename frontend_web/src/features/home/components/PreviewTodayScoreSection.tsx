import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/PreviewTodayScoreSection.module.css";
import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import {
  calculateDayMealNutrition,
  type DailyNutritionMetrics,
  hasValidDailyNutritionTarget,
} from "@/shared/utils/nutrientScore";

const SCORE_CHARACTER_SOURCES = [
  { maxScore: 20, src: "/icons/characters/score-0.png" },
  { maxScore: 40, src: "/icons/characters/score-21.png" },
  { maxScore: 60, src: "/icons/characters/score-41.png" },
  { maxScore: 80, src: "/icons/characters/score-61.png" },
  { maxScore: 100, src: "/icons/characters/score-81.png" },
] as const;

const DEFAULT_CHARACTER_SRC = SCORE_CHARACTER_SOURCES[0].src;

export default function PreviewTodayScoreSection() {
  const selectedDateKey = useSelectedDateKey();
  const {
    data: dayMeal,
    isError: isSummaryError,
    isPending: isSummaryPending,
  } = useDayMealsQuery(selectedDateKey);
  const {
    data: profile,
    isError: isProfileError,
    isPending: isProfilePending,
  } = useGetProfileQuery();

  if (isSummaryPending || isProfilePending) {
    return <PreviewTodayScoreSkeleton />;
  }

  const nutritionMetrics = calculateDayMealNutrition(dayMeal, profile);
  const nutrition = resolveNutritionCardContent({
    dayMeal,
    isProfileError,
    isSummaryError,
    nutritionMetrics,
    profile,
  });

  return (
    <PreviewTodayScoreCard
      characterSrc={getScoreCharacterSrc(nutrition.score ?? 0)}
      message={nutrition.message}
      score={nutrition.score}
    />
  );
}

function resolveNutritionCardContent({
  dayMeal,
  isProfileError,
  isSummaryError,
  nutritionMetrics,
  profile,
}: {
  dayMeal: DayMealSummary | undefined;
  isProfileError: boolean;
  isSummaryError: boolean;
  nutritionMetrics: DailyNutritionMetrics | null;
  profile: ProfileResponseDto | undefined;
}) {
  if (isProfileError) {
    return { message: "목표 정보를 불러오지 못했어요", score: null };
  }

  if (isSummaryError) {
    return { message: "식사 정보를 불러오지 못했어요", score: null };
  }

  if (!hasValidDailyNutritionTarget(profile)) {
    return { message: "목표를 먼저 설정해 주세요", score: null };
  }

  if (!dayMeal) {
    return { message: "식사 정보를 확인할 수 없어요", score: null };
  }

  if (dayMeal.totalCalories <= 0) {
    return { message: "아직 식단 기록을 하지 않았어요", score: 0 };
  }

  if (!nutritionMetrics) {
    return { message: "영양 정보를 확인할 수 없어요", score: null };
  }

  return {
    message: nutritionMetrics.score.overallMessage,
    score: nutritionMetrics.score.totalScore,
  };
}

function getScoreCharacterSrc(score: number) {
  const safeScore = Math.round(Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0)));

  return (
    SCORE_CHARACTER_SOURCES.find(({ maxScore }) => safeScore <= maxScore)?.src ??
    DEFAULT_CHARACTER_SRC
  );
}

export function PreviewTodayScorePreview() {
  const score = 78;

  return (
    <PreviewTodayScoreCard
      characterSrc={getScoreCharacterSrc(score)}
      message="칼로리와 영양 밸런스가 좋아요!"
      score={score}
    />
  );
}

function PreviewTodayScoreCard({
  characterSrc,
  message,
  score,
}: {
  characterSrc: string;
  message: string;
  score: number | null;
}) {
  return (
    <article className={styles.root}>
      <div className={styles.summaryArea}>
        <div className={styles.titleArea}>
          <p className="text-primary title-s-semi">오늘의 영양 밸런스</p>
          <p className={`${styles.message} text-tertiary body-s-regular`}>{message}</p>
        </div>

        <p className={`text-primary title-xl-medium ${styles.score}`}>
          {score ?? "--"}
          <span className="text-tertiary body-l-regular"> 점</span>
        </p>
      </div>

      <img
        className={styles.character}
        src={characterSrc}
        width={154}
        height={154}
        alt=""
        aria-hidden="true"
      />
    </article>
  );
}

function PreviewTodayScoreSkeleton() {
  return (
    <SkeletonStatus className={styles.root} label="오늘 식사 점수를 불러오는 중입니다.">
      <div className={styles.summaryArea}>
        <div className={styles.skeletonTitleArea}>
          <Skeleton width={136} height={25} radius={999} />
          <Skeleton width={154} height={20} radius={999} />
        </div>
        <Skeleton width={72} height={45} radius={999} />
      </div>

      <Skeleton className={styles.characterSkeleton} width={154} height={154} radius={20} />
    </SkeletonStatus>
  );
}
