import { useEffect } from "react";

import ActivityCaloriesPopover from "@/features/health/components/ActivityCaloriesPopover";
import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import styles from "@/features/home/styles/TodayMealScorePage.module.css";
import type { DayMealSummary } from "@/features/home/utils/dayMealSummary";
import {
  getActivityAdjustedTargetCalories,
  getActivityCalorieProgressDash,
  getCalorieSummary,
  getNutrientStatus,
  getNutrientStatusLabel,
  hasValidTargets,
  type NutrientStatus,
  resolveTargetCalories,
} from "@/features/home/utils/todayMealFeedback";
import { NutrientWarningPopover } from "@/features/meal-record/components/NutrientWarningPopover";
import { PATH } from "@/router/path";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import ScoreProgress from "@/shared/commons/progress/Progress";
import { navigateBack, useLocation, useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import type { TargetsNutrients } from "@/shared/stores/targetNutrient.store";
import { calculateMacroPercentToGram, type MacroKey } from "@/shared/utils/nutrientScore";

type NutrientItem = {
  key: MacroKey;
  name: "탄수화물" | "단백질" | "지방";
  current: number;
  showNotice?: boolean;
  target: number;
  status: NutrientStatus;
  progressPercent: number;
};

const NET_CARBS_NOTICE_MESSAGE = [
  "탄수화물에서 대체당과 식이섬유를 뺀 순탄수를 기준으로 탄수화물 정보를 제공하고 있어요.",
] as const;

const progressStatusClassName: Record<NutrientStatus, string> = {
  insufficient: styles.progressInsufficient,
  adequate: styles.progressAdequate,
  excess: styles.progressExcess,
};

const badgeStatusClassName: Record<NutrientStatus, string> = {
  insufficient: styles.badgeInsufficient,
  adequate: styles.badgeAdequate,
  excess: styles.badgeExcess,
};

export default function TodayMealScorePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const selectedDateKey = useSelectedDateKey();

  const pageState = state as TodayMealScorePageState | null;
  const { summary: activitySummary } = useActivityCalories(selectedDateKey);
  const isValidState = Boolean(
    pageState &&
    pageState.currents &&
    hasValidTargets(pageState.targets) &&
    Number.isFinite(pageState.score),
  );

  useEffect(() => {
    if (isValidState) {
      return;
    }

    navigate(PATH.HOME, { replace: true });
  }, [isValidState, navigate]);

  if (!isValidState || !pageState) {
    return null;
  }

  const [carbsRatio, proteinRatio, fatRatio] = pageState.targets.target_ratio;
  const targetCalories = resolveTargetCalories(pageState.targets);

  if (targetCalories === null) {
    return null;
  }

  const adjustedTargetCalories = getActivityAdjustedTargetCalories(
    targetCalories,
    activitySummary?.calories,
  );
  const calorieSummary = getCalorieSummary(
    pageState.currents.totalCalories,
    adjustedTargetCalories,
  );
  const roundedTargetCalories = calorieSummary.roundedTargetCalories ?? Math.round(targetCalories);
  const calorieProgressDash = getActivityCalorieProgressDash({
    targetCalories,
    adjustedTargetCalories,
  });
  const nutrientBaseItems: Array<Omit<NutrientItem, "status" | "progressPercent">> = [
    {
      key: "carbs",
      name: "탄수화물",
      current: Math.round(pageState.currents.totalNutrients.carbs),
      showNotice: pageState.currents.nutrientNotices.carbsEstimatedFromSubNutrients ?? false,
      target: Math.round(
        calculateMacroPercentToGram({
          nutrientType: "carbs",
          totalCalories: targetCalories,
          percent: carbsRatio,
        }),
      ),
    },
    {
      key: "protein",
      name: "단백질",
      current: Math.round(pageState.currents.totalNutrients.protein),
      target: Math.round(
        calculateMacroPercentToGram({
          nutrientType: "protein",
          totalCalories: targetCalories,
          percent: proteinRatio,
        }),
      ),
    },
    {
      key: "fat",
      name: "지방",
      current: Math.round(pageState.currents.totalNutrients.fat),
      target: Math.round(
        calculateMacroPercentToGram({
          nutrientType: "fat",
          totalCalories: targetCalories,
          percent: fatRatio,
        }),
      ),
    },
  ];

  const nutrientItems: NutrientItem[] = nutrientBaseItems.map((item) => {
    const status = getNutrientStatus(item.current, item.target);

    return {
      ...item,
      status,
      progressPercent: getNutrientProgressPercent(item.current, item.target),
    };
  });

  const score = Math.round(pageState.score);
  const isCalorieExceeded = calorieSummary.roundedCurrentCalories > roundedTargetCalories;

  return (
    <section className={styles.page}>
      <PageHeader title="오늘의 식사 분석" onBack={() => navigateBack()} />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.mealScoreCard}>
            <div className={styles.scoreDescription}>
              <p className="typo-title2">오늘의 식사 점수</p>
            </div>
            <p className={styles.scoreValue}>
              <span className={`${styles.score} typo-h2`}>{score}</span>
              <span className={`${styles.score} typo-caption1`}>점</span>
            </p>
          </section>

          <div className="divider" />

          <section className={styles.nutrientSection}>
            <div className={styles.calorieCard}>
              <p className="typo-title3">칼로리</p>
              <div className={styles.calorieInfo}>
                <div className={styles.calorieValueContainer}>
                  <p className="textNoWrap typo-h2">
                    {calorieSummary.roundedCurrentCalories.toLocaleString("ko-KR")} kcal
                  </p>

                  <p className="textNoWrap typo-title3">
                    / {roundedTargetCalories.toLocaleString("ko-KR")} kcal
                  </p>
                  <ActivityCaloriesPopover variant="primary" />
                </div>
                <div className={styles.calorieProgressContainer}>
                  <ScoreProgress
                    value={calorieSummary.roundedCurrentCalories}
                    max={roundedTargetCalories}
                    dash={calorieProgressDash}
                    variant={isCalorieExceeded ? "danger-white" : "primary-gray"}
                  />
                  <p className={`${styles.textAlternative} typo-body3`}>{calorieSummary.message}</p>
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className={styles.balanceCard}>
              {nutrientItems.map((item) => (
                <article key={item.name} className={styles.nutrientItem}>
                  <div className={styles.nutrientHeader}>
                    <div className={styles.nutrientTitle}>
                      <span className={styles.nutrientNameRow}>
                        <span className="typo-title4">{item.name}</span>
                        {item.showNotice && (
                          <NutrientWarningPopover
                            ariaLabel="순탄수 기준 안내"
                            messages={NET_CARBS_NOTICE_MESSAGE}
                          />
                        )}
                      </span>
                      <span className={`${styles.textAlternative} typo-label4`}>
                        {item.current.toLocaleString("ko-KR")}g /{" "}
                        {item.target.toLocaleString("ko-KR")}g
                      </span>
                    </div>
                    <NutrientStatusBadge status={item.status} />
                  </div>

                  <NutrientProgress value={item.progressPercent} status={item.status} />
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <Button
          onClick={() => navigateBack()}
          variant="filled"
          interaction="normal"
          size="large"
          color="primary"
          fullWidth
        >
          확인했어요
        </Button>
      </footer>
    </section>
  );
}

type TodayMealScorePageState = {
  score: number;
  targets: TargetsNutrients;
  currents: DayMealSummary;
};

function getNutrientProgressPercent(current: number, target: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.min(Math.round((current / target) * 100), 100);
}

function NutrientProgress({ value, status }: { value: number; status?: NutrientStatus }) {
  return (
    <div className={styles.progressTrack}>
      <div
        className={`${styles.progressIndicator} ${status ? progressStatusClassName[status] : styles.progressPrimary}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function NutrientStatusBadge({ status }: { status: NutrientStatus }) {
  return (
    <span className={`${styles.nutrientBadge} ${badgeStatusClassName[status]}`}>
      <span className={styles.nutrientBadgeDot} aria-hidden="true" />
      <span className="typo-label6">{getNutrientStatusLabel(status)}</span>
    </span>
  );
}
