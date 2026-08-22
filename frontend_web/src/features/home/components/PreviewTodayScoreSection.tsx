import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import Tile from "@/features/home/components/cards/Tile";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/PreviewTodayScoreSection.module.css";
import type { HomeDashboardMode } from "@/features/home/types/homeDashboard.types";
import { getDayNutritionSummary } from "@/features/home/utils/dayMealSummary";
import MenstruationCardButton from "@/features/menstruation/components/MenstruationCardButton";
import type { MenstrualPhase } from "@/features/menstruation/types/menstruation.type";
import type { ProfileResponseDto } from "@/shared/api/types/api.response.dto";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
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

type Props = {
  dashboardMode: HomeDashboardMode;
  menstrualPhase: MenstrualPhase | null;
  isMenstruationPending: boolean;
  profile: ProfileResponseDto | undefined;
  isProfileError: boolean;
  isProfilePending: boolean;
};

export default function PreviewTodayScoreSection({
  dashboardMode,
  menstrualPhase,
  isMenstruationPending,
  profile,
  isProfileError,
  isProfilePending,
}: Props) {
  const selectedDateKey = useSelectedDateKey();
  const { isWorkoutRecordPending, summary: activitySummary } = useActivityCalories(selectedDateKey);
  const {
    data: dayMeal,
    isError: isSummaryError,
    isPending: isSummaryPending,
  } = useDayMealsQuery(selectedDateKey);

  const isMenstruationCardPending =
    dashboardMode === "menstruation" && isMenstruationPending;

  if (
    isSummaryPending ||
    isProfilePending ||
    isWorkoutRecordPending ||
    isMenstruationCardPending
  ) {
    return <PreviewTodayScoreSkeleton />;
  }

  const nutritionSummary = getDayNutritionSummary(dayMeal, profile, activitySummary?.calories);
  const nutrition = isProfileError
    ? { message: "목표 정보를 불러오지 못했어요", score: null }
    : isSummaryError
      ? { message: "식사 정보를 불러오지 못했어요", score: null }
      : nutritionSummary;
  const characterSrc = getScoreCharacterSrc(nutrition.score ?? 0);
  const activityCalories =
    typeof nutritionSummary.calories.activity === "number" &&
    Number.isFinite(nutritionSummary.calories.activity) &&
    nutritionSummary.calories.activity > 0
      ? Math.round(nutritionSummary.calories.activity)
      : 0;
  return (
    <div className={styles.root}>
      {dashboardMode === "menstruation" ? (
        <MenstruationCardButton phase={menstrualPhase} />
      ) : (
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
      )}

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
            {activityCalories > 0 && (
              <InfoPopover ariaLabel="운동 칼로리 안내" side="bottom">
                운동으로 {activityCalories.toLocaleString("ko-KR")}kcal 소모
              </InfoPopover>
            )}
          </div>
          <ScoreProgress variant="primary" value={nutritionSummary.calories.progressPercent} />
        </Tile>

        <Tile className={styles.macrosGroup}>
          <div className={styles.macrosItem}>
            <div className={styles.macroTitle}>
              <p className="body-s-medium text-primary">탄수화물</p>
              {nutritionSummary.notices.carbsEstimatedFromSubNutrients && (
                <InfoPopover ariaLabel="순탄수 기준 안내">
                  탄수화물에서 대체당과 식이섬유를 뺀 순탄수를 기준으로 탄수화물 정보를 제공하고
                  있어요
                </InfoPopover>
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
      <div className={styles.nutritionBalanceCard}>
        <div className={styles.summaryArea}>
          <div className={styles.skeletonTitleArea}>
            <Skeleton width={136} height={25} radius={12} />
            <Skeleton width={154} height={20} radius={12} />
          </div>

          <Skeleton className={styles.score} width={72} height={45} radius={12} />
        </div>

        <Skeleton className={styles.skeletonCharacter} width={100} height={100} radius={100} />
      </div>

      <section className={styles.nutritionSection}>
        <Tile className={styles.calorieGroup}>
          <Skeleton width={52} height={25} radius={12} />
          <Skeleton width={190} height={32} radius={12} />
          <Skeleton width="100%" height={8} radius={12} />
        </Tile>

        <Tile className={styles.macrosGroup}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.macrosItem}>
              <Skeleton width={52} height={20} radius={12} />
              <Skeleton width={72} height={20} radius={12} />
              <Skeleton width="100%" height={8} radius={12} />
            </div>
          ))}
        </Tile>
      </section>
    </SkeletonStatus>
  );
}
