import ActivityCaloriesPopover from "@/features/health/components/ActivityCaloriesPopover";
import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import Tile from "@/features/home/components/cards/Tile";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/PreviewTodayScoreSection.module.css";
import { getDayNutritionSummary } from "@/features/home/utils/dayMealSummary";
import {
  NET_CARBS_NOTICE_MESSAGE,
  NutrientWarningPopover,
} from "@/features/meal-record/components/NutrientWarningPopover";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import ScoreProgress from "@/shared/commons/progress/Progress";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

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
    isWorkoutRecordPending,
    summary: activitySummary,
  } = useActivityCalories(selectedDateKey);
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

  if (isSummaryPending || isProfilePending || isWorkoutRecordPending) {
    return <PreviewTodayScoreSkeleton />;
  }

  const nutritionSummary = getDayNutritionSummary(
    dayMeal,
    profile,
    activitySummary?.calories,
  );
  const nutrition = isProfileError
    ? { message: "목표 정보를 불러오지 못했어요", score: null }
    : isSummaryError
      ? { message: "식사 정보를 불러오지 못했어요", score: null }
      : nutritionSummary;
  const characterSrc = getScoreCharacterSrc(nutrition.score ?? 0);

  return (
    <div className={styles.root}>
      <article className={styles.nutritionBalanceCard}>
        <div className={styles.summaryArea}>
          <div className={styles.titleArea}>
            <p className="text-primary title-s-semi">오늘의 영양 밸런스</p>
            <p className={`${styles.message} text-tertiary body-s-regular`}>{nutrition.message}</p>
          </div>

          <p className={`text-primary title-xl-medium ${styles.score}`}>
            {nutrition.score ?? "--"}
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

      <section className={styles.nutritionSection}>
        <Tile className={styles.calorieGroup}>
          <p className={`body-l-medium text-primary`}>칼로리</p>
          <div className={styles.calorieValue}>
            <p>
              <span className={`title-l-semi text-primary ${styles.currentCalorie}`}>
                {nutritionSummary.calories.current.toLocaleString("ko-KR")}
              </span>{" "}
              <span className={`body-l-regular text-tertiary`}>
                / {nutritionSummary.calories.target.toLocaleString("ko-KR")} kcal
              </span>
            </p>
            <ActivityCaloriesPopover
              activityCalories={nutritionSummary.calories.activity}
              baseTargetCalories={nutritionSummary.calories.baseTarget}
            />
          </div>
          <ScoreProgress variant="primary" value={nutritionSummary.calories.progressPercent} />
        </Tile>

        <Tile className={styles.macrosGroup}>
          <div className={styles.macrosItem}>
            <div className={styles.macroTitle}>
              <p className="body-s-medium text-primary">탄수화물</p>
              {nutritionSummary.notices.carbsEstimatedFromSubNutrients && (
                <NutrientWarningPopover
                  ariaLabel="순탄수 기준 안내"
                  messages={NET_CARBS_NOTICE_MESSAGE}
                />
              )}
            </div>
            <p>
              <span className="body-s-medium text-primary">
                {nutritionSummary.nutrients.carbs.current.toLocaleString("ko-KR")}
              </span>{" "}
              <span className="caption-m-regular text-tertiary">
                / {nutritionSummary.nutrients.carbs.target.toLocaleString("ko-KR")}g
              </span>
            </p>
            <ScoreProgress
              variant="navy"
              value={nutritionSummary.nutrients.carbs.progressPercent}
            />
          </div>
          <div className={styles.macrosItem}>
            <p className="body-s-medium text-primary">단백질</p>
            <p>
              <span className="body-s-medium text-primary">
                {nutritionSummary.nutrients.protein.current.toLocaleString("ko-KR")}
              </span>{" "}
              <span className="caption-m-regular text-tertiary">
                / {nutritionSummary.nutrients.protein.target.toLocaleString("ko-KR")}g
              </span>
            </p>
            <ScoreProgress
              variant="navy"
              value={nutritionSummary.nutrients.protein.progressPercent}
            />
          </div>
          <div className={styles.macrosItem}>
            <p className="body-s-medium text-primary">지방</p>
            <p>
              <span className="body-s-medium text-primary">
                {nutritionSummary.nutrients.fat.current.toLocaleString("ko-KR")}
              </span>{" "}
              <span className="caption-m-regular text-tertiary">
                / {nutritionSummary.nutrients.fat.target.toLocaleString("ko-KR")}g
              </span>
            </p>
            <ScoreProgress variant="navy" value={nutritionSummary.nutrients.fat.progressPercent} />
          </div>
        </Tile>
      </section>
    </div>
  );
}

function getScoreCharacterSrc(score: number) {
  const safeScore = Math.round(Math.min(100, Math.max(0, Number.isFinite(score) ? score : 0)));

  return (
    SCORE_CHARACTER_SOURCES.find(({ maxScore }) => safeScore <= maxScore)?.src ??
    DEFAULT_CHARACTER_SRC
  );
}

function PreviewTodayScoreSkeleton() {
  return (
    <SkeletonStatus className={styles.root} label="오늘 식사 점수를 불러오는 중입니다.">
      <div className={styles.summaryArea}>
        <div className={styles.skeletonTitleArea}>
          <Skeleton width={136} height={25} radius={12} />
          <Skeleton width={154} height={20} radius={12} />
        </div>
        <Skeleton className={styles.score} width={72} height={45} radius={12} />
      </div>

      <Skeleton className={styles.skeletonCharacter} width={100} height={100} radius={100} />
    </SkeletonStatus>
  );
}
