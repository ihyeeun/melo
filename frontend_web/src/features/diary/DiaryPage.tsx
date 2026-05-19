import { Check, ChevronDown, ChevronRight, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import styles from "@/features/diary/styles/DiaryPage.module.css";
import ActionCard from "@/features/home/components/cards/ActionCard";
import TodayBodyLogSection from "@/features/home/components/TodayBodyLogSection";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import { getCalorieSummary, hasValidTargets } from "@/features/home/utils/todayMealFeedback";
import {
  useTodayMealRecordDeleteMutation,
  useTodayMealRecordRegisterMutation,
} from "@/features/meal-record/hooks/mutations/useTodayMealRecordMutation";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath } from "@/router/pathHelpers";
import type { MealTime, MealType } from "@/shared/api/types/api.dto";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import ScoreProgress from "@/shared/commons/progress/Progress";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { useTargetsState } from "@/shared/stores/targetNutrient.store";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";
import {
  calculateDailyNutritionMetricsForDisplay,
  getCalorieProgressPercent,
} from "@/shared/utils/nutrientScore";

type DiaryMeal = {
  type: MealType;
  label: string;
  iconSrc: string;
  emptyStatusText?: string;
};

const DIARY_MEALS: readonly DiaryMeal[] = [
  {
    type: "0",
    label: "아침",
    iconSrc: "/icons/breakfast.svg",
    emptyStatusText: "안 먹었어요",
  },
  { type: "1", label: "점심", iconSrc: "/icons/lunch.svg", emptyStatusText: "안 먹었어요" },
  { type: "2", label: "저녁", iconSrc: "/icons/dinner.svg", emptyStatusText: "안 먹었어요" },
  { type: "3", label: "간식", iconSrc: "/icons/snack.svg" },
  { type: "4", label: "야식", iconSrc: "/icons/pizza-icon.svg" },
];

export default function DiaryPage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const [expandedMealType, setExpandedMealType] = useState<MealType | null>(null);
  const navigate = useNavigate();
  const targets = useTargetsState();

  const { data: dayMeals, isPending } = useDayMealsQuery(selectedDateKey);

  const nutritionMetrics = useMemo(() => {
    if (isPending || !dayMeals || !targets) {
      return null;
    }

    return calculateDailyNutritionMetricsForDisplay({
      actualCalories: dayMeals.totalCalories,
      targetCalories: targets.target_calories,
      actualMacrosInGram: {
        carbs: dayMeals.totalNutrients.carbs,
        protein: dayMeals.totalNutrients.protein,
        fat: dayMeals.totalNutrients.fat,
      },
      targetMacroRatios: {
        carbs: targets.target_ratio[0],
        protein: targets.target_ratio[1],
        fat: targets.target_ratio[2],
      },
    });
  }, [dayMeals, isPending, targets]);

  const targetCalories = targets?.target_calories ?? 2100;
  const totalCalories = isPending ? 0 : (dayMeals?.totalCalories ?? 0);
  const calorieSummary = getCalorieSummary(totalCalories, targetCalories);
  const roundedTargetCalories = calorieSummary.roundedTargetCalories ?? Math.round(targetCalories);
  const calorieProgress =
    nutritionMetrics?.calorieProgressPercent ??
    getCalorieProgressPercent(totalCalories, targetCalories);
  const isCalorieExceeded = totalCalories > targetCalories;
  const mealScore = nutritionMetrics?.score.totalScore ?? 0;

  const calorieMessage = calorieSummary.message;
  const handleMoveMealRecord = (mealType: MealType) => {
    const hasRecord =
      (dayMeals?.menusByTime[mealType]?.length ?? 0) > 0 ||
      Boolean(dayMeals?.didNotEatByTime[mealType]);

    if (hasRecord) {
      navigate(getMealRecordPath(selectedDateKey, mealType));
      return;
    }

    navigate(getMealSearchPath(selectedDateKey, mealType));
  };

  const handleTodayMealScoreClick = () => {
    if (!hasValidTargets(targets)) {
      toast.warning("목표 칼로리 설정 후 이용할 수 있어요");
      return;
    }

    navigate(PATH.TODAY_MEAL_SCORE, {
      state: {
        score: mealScore,
        targets: targets,
        currents: dayMeals,
        calorieMessage: calorieSummary.message,
      },
    });
  };

  return (
    <div className={styles.page}>
      <Calendar initialDate={selectedDate} onSelectDate={setSelectedDate} />
      <main className={styles.main}>
        <div className={styles.content}>
          {isPending ? (
            <ActionCard className={styles.summaryCard}>
              <DiarySummarySkeleton />
            </ActionCard>
          ) : (
            <ActionCard onClick={handleTodayMealScoreClick} className={styles.summaryCard}>
              <div className={styles.scoreCard}>
                <div className={styles.scoreText}>
                  <p className={styles.calorieText}>
                    <span className={`${styles.scoreCurrent} typo-h2`}>
                      {calorieSummary.roundedCurrentCalories.toLocaleString("ko-KR")}
                    </span>
                    <span className="typo-title2">
                      / {roundedTargetCalories.toLocaleString("ko-KR")} kcal
                    </span>
                  </p>
                  <span className={styles.scoreDivider} aria-hidden="true" />
                  <span className={`${styles.score} typo-title2`}>{mealScore}점</span>

                  <ChevronRight size={24} className={styles.icon} />
                </div>
                <div className={styles.scoreContainer}>
                  <ScoreProgress
                    value={calorieProgress}
                    variant={isCalorieExceeded ? "danger-white" : "primary-gray"}
                  />
                  <p className={`${styles.calorieMessage} typo-body4`}>{calorieMessage}</p>
                </div>
              </div>
            </ActionCard>
          )}

          <div className="divider" />

          <section className={styles.actionCardList}>
            {isPending
              ? DIARY_MEALS.map((meal) => <MealRecordCardSkeleton key={meal.type} />)
              : DIARY_MEALS.map((meal) => {
                  const mealMenus = dayMeals?.menusByTime[meal.type] ?? [];
                  const mealCalories = getTotalMealCalories(mealMenus);
                  const didNotEat = Boolean(dayMeals?.didNotEatByTime[meal.type]);

                  return (
                    <MealRecordCard
                      key={meal.type}
                      title={meal.label}
                      iconSrc={meal.iconSrc}
                      menus={mealMenus}
                      calories={mealCalories}
                      emptyStatusText={meal.emptyStatusText}
                      didNotEat={didNotEat}
                      isExpanded={expandedMealType === meal.type}
                      onNavigate={() => handleMoveMealRecord(meal.type)}
                      onToggleExpand={() => {
                        setExpandedMealType((prev) => (prev === meal.type ? null : meal.type));
                      }}
                      mealType={meal.type}
                      selectedDate={selectedDate}
                    />
                  );
                })}
          </section>

          <div className={styles.bodyCardList}>
            <TodayBodyLogSection date={selectedDateKey} />
          </div>
        </div>
      </main>
    </div>
  );
}

function DiarySummarySkeleton() {
  return (
    <SkeletonStatus className={styles.scoreCard} label="식사 데이터를 불러오는 중입니다.">
      <div className={styles.scoreText}>
        <Skeleton width={168} height={36} radius={999} />
        <span className={styles.scoreDivider} aria-hidden="true" />
        <Skeleton width={52} height={28} radius={999} />
        <Skeleton className={styles.icon} width={24} height={24} variant="circle" />
      </div>
      <div className={styles.scoreContainer}>
        <Skeleton width="100%" height={8} radius={999} />
        <div className={styles.calorieMessage}>
          <Skeleton width={156} height={18} radius={999} />
        </div>
      </div>
    </SkeletonStatus>
  );
}

function MealRecordCardSkeleton() {
  return (
    <ActionCard className={styles.mealCard}>
      <SkeletonStatus
        className={styles.mealCardSkeletonContent}
        label="식사 카드 정보를 불러오는 중입니다."
      >
        <div className={styles.mealHeader}>
          <div className={styles.mealTitleContainer}>
            <Skeleton width={32} height={32} variant="circle" />
            <Skeleton width={52} height={22} radius={999} />
          </div>
          <Skeleton width={24} height={24} variant="circle" />
        </div>

        <div className={styles.mealSummaryCard}>
          <div className={styles.mealSummaryButton}>
            <Skeleton width="58%" height={18} radius={999} />
            <Skeleton width="28%" height={18} radius={999} />
          </div>
          <Skeleton width="72%" height={16} radius={999} />
        </div>
      </SkeletonStatus>
    </ActionCard>
  );
}

function MealRecordCard({
  title,
  iconSrc,
  menus,
  calories,
  emptyStatusText,
  didNotEat,
  isExpanded,
  onNavigate,
  onToggleExpand,
  mealType,
  selectedDate,
}: {
  title: string;
  iconSrc: string;
  menus: MenuWithQuantity[];
  calories: number;
  emptyStatusText?: string;
  didNotEat: boolean;
  isExpanded: boolean;
  onNavigate: () => void;
  onToggleExpand: () => void;
  mealType: MealType;
  selectedDate: Date;
}) {
  const hasMenus = menus.length > 0;
  const { mutate: registerDidNotEatMutate, isPending: isRegisterDidNotEatPending } =
    useTodayMealRecordRegisterMutation();
  const { mutate: deleteDidNotEatMutate, isPending: isDeleteDidNotEatPending } =
    useTodayMealRecordDeleteMutation();
  const isDidNotEatPending = isRegisterDidNotEatPending || isDeleteDidNotEatPending;

  const handleDidNotEatToggle = () => {
    if (hasMenus || isDidNotEatPending) {
      return;
    }

    const body = {
      date: formatDateKey(selectedDate),
      time: Number(mealType) as MealTime,
    };

    if (didNotEat) {
      deleteDidNotEatMutate(body);
      return;
    }

    registerDidNotEatMutate(body);
  };

  return (
    <ActionCard
      className={`${styles.mealCard} ${hasMenus || didNotEat ? "" : styles.mealCardEmpty}`}
    >
      <div className={styles.mealHeader}>
        <button type="button" onClick={onNavigate} className={styles.mealTitleContainer}>
          <img src={iconSrc} alt="" aria-hidden="true" className={styles.mealIcon} />
          <p className="typo-title3">{title}</p>
        </button>

        {hasMenus ? (
          <button
            type="button"
            onClick={onNavigate}
            className={styles.navigateButton}
            aria-label={`${title} 기록으로 이동`}
          >
            <ChevronRight size={24} />
          </button>
        ) : didNotEat && emptyStatusText ? (
          <button
            type="button"
            onClick={handleDidNotEatToggle}
            className={styles.emptyStatusButton}
            aria-pressed
            disabled={isDidNotEatPending}
          >
            <div className={styles.emptyStatusIconActive}>
              <Check size={12} strokeWidth={3} />
            </div>
            <span className={`${styles.textPrimary} typo-title4`}>{emptyStatusText}</span>
          </button>
        ) : (
          <div className={styles.emptyMeta} aria-label={`${title} 기록하기`}>
            {emptyStatusText && (
              <button
                type="button"
                onClick={handleDidNotEatToggle}
                className={styles.emptyStatusButton}
                aria-pressed={false}
                disabled={isDidNotEatPending}
              >
                <div className={styles.emptyStatusIcon}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <span className={`${styles.emptyStatusText} typo-title4`}>{emptyStatusText}</span>
              </button>
            )}

            <button type="button" onClick={onNavigate}>
              <PlusIcon size={24} className={styles.emptyPlusIcon} />
            </button>
          </div>
        )}
      </div>

      {hasMenus ? (
        <div className={styles.mealSummaryCard}>
          <button
            type="button"
            className={styles.mealSummaryButton}
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-label={`${title} 상세 ${isExpanded ? "접기" : "펼치기"}`}
          >
            <span className={`${styles.mealSummaryTitle} typo-title4`}>
              {getMealSummaryText(menus)}
            </span>

            <span className={styles.mealSummaryMeta}>
              <span className={`${styles.score} typo-title3`}>{formatCalories(calories)} kcal</span>
              <ChevronDown
                size={24}
                className={`${styles.mealSummaryArrow} ${isExpanded ? styles.mealSummaryArrowExpanded : ""}`}
              />
            </span>
          </button>

          {isExpanded ? (
            <ul className={styles.mealDetailList}>
              {menus.map((menu) => (
                <li key={menu.id} className={styles.mealDetailItem}>
                  <span className="typo-body4">{menu.name}</span>
                  <span className={`${styles.textAlternative} typo-body4`}>
                    {formatCalories(menu.calories)} kcal
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {isDidNotEatPending ? (
        <LoadingOverlay label={`${title} 식사 상태를 저장하는 중입니다.`} />
      ) : null}
    </ActionCard>
  );
}

function formatCalories(value: number) {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

function getTotalMealCalories(menus: MenuWithQuantity[]) {
  return menus.reduce((sum, menu) => sum + menu.calories, 0);
}

function getMealSummaryText(menus: MenuWithQuantity[]) {
  if (menus.length === 0) {
    return "기록된 식사가 없어요";
  }

  if (menus.length === 1) {
    return menus[0].name;
  }

  return `${menus[0].name} 외 ${menus.length - 1}개`;
}
