import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useMealFeedbackMutation } from "@/features/chat/hooks/mutations/useMealFeedbackMutation";
import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import Tile from "@/features/home/components/cards/Tile";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/PreviewTodayScoreSection.module.css";
import type { HomeDashboardMode } from "@/features/home/types/homeDashboard.types";
import { getDayNutritionSummary } from "@/features/home/utils/dayMealSummary";
import MenstruationCardButton from "@/features/menstruation/components/MenstruationCardButton";
import { menstrualApplicants } from "@/features/menstruation/constants/menstruation.constant";
import type { MenstrualPhaseResult } from "@/features/menstruation/hooks/useMenstrualPhase";
import {
  useGetProfileQuery,
  useGoalSnapshotByDateQuery,
} from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
import ScoreProgress from "@/shared/commons/progress/Progress";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import { getTodayFormatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

const SCORE_CHARACTER_SOURCES = [
  { maxScore: 20, src: "/icons/characters/score-0.png" },
  { maxScore: 40, src: "/icons/characters/score-21.png" },
  { maxScore: 60, src: "/icons/characters/score-41.png" },
  { maxScore: 80, src: "/icons/characters/score-61.png" },
  { maxScore: 100, src: "/icons/characters/score-81.png" },
] as const;

const DEFAULT_CHARACTER_SRC = SCORE_CHARACTER_SOURCES[0].src;

export default function PreviewTodayScoreSection({
  homeMode,
  menstrualPhase,
}: {
  homeMode: HomeDashboardMode;
  menstrualPhase: MenstrualPhaseResult;
}) {
  const selectedDateKey = useSelectedDateKey();
  const selectedDate = parseDateKey(selectedDateKey);
  const isChatBlocked = useIsFeatureBlocked(FEATURE_GUARD.CHAT);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdditionalCareOpen, setIsAdditionalCareOpen] = useState<boolean>(false);
  const { mutate: requestMealFeedback, isPending: isCoachingPending } = useMealFeedbackMutation({
    onError: (error) => {
      toast.warning(error.message || "식사 코칭을 불러오지 못했어요. 다시 시도해주세요.");
    },
  });
  const coachingLabel =
    selectedDateKey === getTodayFormatDateKey()
      ? "오늘의 식사 코칭 받기"
      : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 식사 코칭 받기`;
  const { isWorkoutRecordPending, summary: activitySummary } = useActivityCalories(selectedDateKey);
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

  const { data: userGoal, isPending: isUserGoalPending } =
    useGoalSnapshotByDateQuery(selectedDateKey);

  const showCoachingButton =
    homeMode === "daily" &&
    !isChatBlocked &&
    !isSummaryError &&
    dayMeal !== undefined &&
    Object.values(dayMeal.menusByTime).some((menus) => menus.length > 0);

  if (isSummaryPending || isProfilePending || isWorkoutRecordPending || isUserGoalPending) {
    return <PreviewTodayScoreSkeleton showCoachingButton={showCoachingButton} />;
  }

  const showCareTrialButton =
    profile?.is_subscribed &&
    !menstrualApplicants.includes(profile!.user_id) &&
    profile.gender === 1;

  const nutritionSummary = getDayNutritionSummary(
    dayMeal,
    {
      target_calories: userGoal?.target_calories ?? profile?.target_calories ?? 0,
      target_ratio: userGoal?.target_ratio ?? profile?.target_ratio ?? [0, 0, 0],
    },
    activitySummary?.calories,
  );
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
      {homeMode === "menstruation" ? (
        <MenstruationCardButton phase={menstrualPhase} />
      ) : (
        <article className={styles.nutritionBalanceCard}>
          <div className={styles.nutritionBalanceSummary}>
            <div className={styles.summaryArea}>
              <div className={styles.titleArea}>
                <p className="text-primary title-s-semi">오늘의 영양 밸런스</p>
                <p className={`${styles.message} text-tertiary body-s-regular`}>
                  {nutrition.message}
                </p>
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
          </div>
          {showCoachingButton && (
            <button
              type="button"
              className={`${styles.coachingActionButton} body-s-medium text-primary textCenter`}
              disabled={isCoachingPending}
              aria-busy={isCoachingPending}
              onClick={() => {
                if (queryClient.isMutating({ mutationKey: ["meal-feedback"] }) > 0) return;

                requestMealFeedback(selectedDateKey);
                navigate(PATH.CHAT);
                track(EVENT_NAME.CLICK_MEAL_FEEDBACK_AI_COACH);
              }}
            >
              {coachingLabel}
            </button>
          )}
        </article>
      )}

      {showCareTrialButton && (
        <Tile
          className={styles.additionalCareButton}
          onClick={() => {
            setIsAdditionalCareOpen(true);
            track(EVENT_NAME.CLICK_MENSTRUAL_CARE);
          }}
        >
          <p className="body-s-medium text-primary">생리 주기 케어 추가 체험 신청</p>
          <div className={styles.additionalIcon}>
            <SystemIcon name="arrow-insert" />
          </div>
        </Tile>
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
              <InfoPopover ariaLabel="운동 칼로리 안내" align="start" side="bottom">
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
                <InfoPopover ariaLabel="순탄수 기준 안내" align="start" side="bottom">
                  탄수화물에서 대체당과 식이섬유를 뺀
                  <br />
                  순탄수를 기준으로 탄수화물 정보를
                  <br />
                  제공하고 있어요
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

      <ConfirmModal
        open={isAdditionalCareOpen}
        onOpenChange={setIsAdditionalCareOpen}
        title="생리 주기에 맞춘 멜로 케어, 만나보세요!"
        actionOrder="confirm-cancel"
        hideTabBar
        cancelText="취소"
        confirmText="체험단 신청하기"
        onCancel={() => {}}
        onConfirm={() => {
          track(EVENT_NAME.CLICK_MENSTRUAL_CARE_TRIAL_APPLY);
          toast.success("신청 완료! 준비 마치고 곧 찾아올게요!");
        }}
      />
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

function PreviewTodayScoreSkeleton({ showCoachingButton }: { showCoachingButton: boolean }) {
  return (
    <SkeletonStatus className={styles.root} label="오늘 식사 점수를 불러오는 중입니다.">
      <div className={styles.nutritionBalanceCard}>
        <div className={styles.nutritionBalanceSummary}>
          <div className={styles.summaryArea}>
            <div className={styles.skeletonTitleArea}>
              <Skeleton width={136} height={25} radius={12} />
              <Skeleton width={154} height={20} radius={12} />
            </div>

            <Skeleton className={styles.score} width={72} height={45} radius={12} />
          </div>

          <Skeleton className={styles.skeletonCharacter} width={100} height={100} radius={100} />
        </div>

        {showCoachingButton && (
          <Skeleton className={styles.coachingActionSkeleton} height={40} radius={16} />
        )}
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
