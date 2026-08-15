import { useLayoutEffect, useRef, useState } from "react";

import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import { useSyncNativeStepCount } from "@/features/health/hooks/useSyncNativeStepCount";
import Tile from "@/features/home/components/cards/Tile";
import { useDayMealsQuery, useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/RecordActionSection.module.css";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath, getWorkoutRecordPath } from "@/router/pathHelpers";
import type { MealType } from "@/shared/api/types/api.dto";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey, isFutureDateKey } from "@/shared/utils/dateFormat";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";

const MEAL_TYPES = [
  { type: "0", label: "아침", icon: "breakfast" },
  { type: "1", label: "점심", icon: "lunch" },
  { type: "2", label: "저녁", icon: "dinner" },
  { type: "3", label: "간식", icon: "snack" },
  { type: "4", label: "야식", icon: "late-snack" },
] as const;

export default function RecordActionSection({ selectedDate }: { selectedDate: string }) {
  const navigate = useNavigate();
  const { data: profile } = useGetProfileQuery();
  const { data: dayMeals, isPending: isDayMealsPending } = useDayMealsQuery(selectedDate);
  const { data: bodyLog, isPending: isBodyLogPending } = useGetBodyLog(selectedDate);
  const canAccessWorkoutRecord = profile?.role === "ADMIN";
  const isToday = selectedDate === getTodayFormatDateKey();
  const isFutureDate = isFutureDateKey(selectedDate);
  const isBodyLogLoaded = bodyLog !== undefined;
  const displayWeight = bodyLog?.weight ?? (isToday ? (profile?.weight ?? 0) : 0);
  const displaySteps = bodyLog?.steps ?? 0;
  const { nativeStepConnectionStatus } = useSyncNativeStepCount(selectedDate, {
    enabled: isBodyLogLoaded && !isFutureDate,
    savedSteps: bodyLog?.steps,
  });
  const {
    workoutRecords,
    summary: activitySummary,
    isWorkoutRecordPending,
  } = useActivityCalories(selectedDate);

  const hasWorkoutRecords = workoutRecords.length > 0;
  const totalWorkoutDuration = workoutRecords.reduce(
    (total, workout) => total + workout.workout_duration,
    0,
  );

  const handleMoveMealRecord = (mealType: MealType, hasMenus: boolean) => {
    navigate(
      hasMenus
        ? getMealRecordPath(selectedDate, mealType)
        : getMealSearchPath(selectedDate, mealType),
    );
  };

  const getBodyLogSheetPath = (pathname: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams({ date: selectedDate, ...params });

    return `${pathname}?${searchParams.toString()}`;
  };

  const openWeightEditor = () => {
    navigate(getBodyLogSheetPath(PATH.HOME_WEIGHT_LOG_SHEET));
  };

  const openStepsEditor = () => {
    navigate(
      getBodyLogSheetPath(PATH.HOME_STEPS_LOG_SHEET, {
        nativeStepConnectionStatus,
      }),
    );
  };

  return (
    <div className={styles.root}>
      <section className={styles.recordGroup}>
        <h2 className="title-s-semi text-primary">식단 기록</h2>

        {isDayMealsPending ? (
          <MealRecordSkeleton />
        ) : (
          <ul className={styles.mealsArea}>
            {MEAL_TYPES.map(({ type, label, icon }) => {
              const menus = dayMeals?.menusByTime[type] ?? [];
              const hasMenus = menus.length > 0;
              const calories = dayMeals?.caloriesByTime[type] ?? 0;

              return (
                <li key={type} className={styles.mealItem}>
                  <button
                    type="button"
                    className={styles.mealButton}
                    onClick={() => handleMoveMealRecord(type, hasMenus)}
                  >
                    <div className={styles.mealTitleArea}>
                      <div className={styles.mealIcon} data-selected={hasMenus}>
                        <SystemIcon size={18} name={icon} />
                      </div>

                      <p className="body-l-medium text-primary">{label}</p>

                      <SystemIcon
                        name="plus-circle"
                        size={24}
                        className="marginLeft text-secondary"
                      />
                    </div>
                    {hasMenus && (
                      <div className={styles.mealInfo}>
                        <MealSummaryText menus={menus} />
                        <p className="body-s-regular text-disabled">
                          {formatNumberWithMaxOneDecimal(calories)}kcal
                        </p>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canAccessWorkoutRecord ? (
        <section className={styles.recordGroup}>
          <h2 className="title-s-semi text-primary">운동 기록</h2>
          <Tile
            onClick={
              isWorkoutRecordPending
                ? undefined
                : () => navigate(getWorkoutRecordPath(selectedDate))
            }
            className={styles.workoutButton}
          >
            {isWorkoutRecordPending ? (
              <WorkoutRecordSkeleton />
            ) : hasWorkoutRecords ? (
              <div className={styles.workoutTitleGroup}>
                <p className="body-l-medium text-primary">오늘 운동</p>
                <p className="body-s-regular text-tertiary">
                  총 {totalWorkoutDuration}분,{" "}
                  {activitySummary?.calories.toLocaleString("ko-KR") ?? 0}
                  kcal 소모
                </p>
              </div>
            ) : (
              <div className={styles.workoutTitleGroup}>
                <p className="body-l-medium text-primary">아직 오늘의 운동 기록이 없어요</p>
                <p className="body-s-regular text-tertiary">지금 바로 기록하러 갈까요?</p>
              </div>
            )}

            {!isWorkoutRecordPending ? (
              <SystemIcon size={24} name="chevron-right" className="marginLeft text-secondary" />
            ) : null}
          </Tile>
        </section>
      ) : null}

      <section className={styles.recordGroup}>
        <h2 className="title-s-semi text-primary">건강 기록</h2>
        <div className={styles.bodyLogGroup}>
          <HealthMetricCard
            title="걸음 수"
            value={displaySteps}
            unit="보"
            onClick={openStepsEditor}
            isPending={isBodyLogPending}
          />
          <HealthMetricCard
            title="체중"
            value={displayWeight}
            unit="kg"
            onClick={openWeightEditor}
            isPending={isBodyLogPending}
          />
        </div>
      </section>
    </div>
  );
}

function HealthMetricCard({
  title,
  value,
  unit,
  onClick,
  isPending = false,
}: {
  title: string;
  value: number;
  unit: string;
  onClick: () => void;
  isPending?: boolean;
}) {
  return (
    <Tile onClick={isPending ? undefined : onClick} className={styles.bodyLogButton}>
      <div className={styles.bodyLogTitle}>
        <p className="body-l-medium text-primary">{title}</p>
        <SystemIcon name="plus-circle" size={18} className="text-secondary marginLeft" />
      </div>
      {isPending ? (
        <SkeletonStatus
          className={styles.bodyLogValue}
          label={`${title} 정보를 불러오는 중입니다.`}
        >
          <Skeleton width={unit === "보" ? 72 : 52} height={32} radius={12} />
          <span className="body-l-regular text-tertiary">{unit}</span>
        </SkeletonStatus>
      ) : (
        <div className={styles.bodyLogValue}>
          <span className={`title-l-semi amp-mask ${styles.bodyLogValueWeight}`}>
            {value.toLocaleString()}
          </span>
          <span className="body-l-regular text-tertiary">{unit}</span>
        </div>
      )}
    </Tile>
  );
}

function MealRecordSkeleton() {
  return (
    <SkeletonStatus label="식단 기록을 불러오는 중입니다.">
      <ul className={styles.mealsArea}>
        {MEAL_TYPES.map(({ type }) => (
          <li key={type} className={styles.mealItem}>
            <div className={`${styles.mealButton} ${styles.mealSkeletonButton}`}>
              <div className={styles.mealTitleArea}>
                <Skeleton width={30} height={30} radius={999} />
                <Skeleton width={40} height={24} radius={12} />
                <Skeleton
                  className={styles.mealSkeletonAction}
                  width={24}
                  height={24}
                  radius={999}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SkeletonStatus>
  );
}

function WorkoutRecordSkeleton() {
  return (
    <SkeletonStatus className={styles.workoutSkeleton} label="운동 기록을 불러오는 중입니다.">
      <div className={styles.workoutTitleGroup}>
        <Skeleton width={132} height={25} radius={12} />
        <Skeleton width={176} height={20} radius={12} />
      </div>
      <Skeleton className="marginLeft" width={24} height={24} radius={999} />
    </SkeletonStatus>
  );
}

function MealSummaryText({ menus }: { menus: MenuWithQuantity[] }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [summaryText, setSummaryText] = useState(() => getMealSummaryText(menus, 1));

  useLayoutEffect(() => {
    const textElement = textRef.current;
    const measureElement = measureRef.current;

    if (!textElement || !measureElement) return;

    const updateSummaryText = () => {
      const availableWidth = textElement.clientWidth;

      if (availableWidth === 0) return;

      for (let visibleCount = menus.length; visibleCount >= 1; visibleCount -= 1) {
        const candidate = getMealSummaryText(menus, visibleCount);
        measureElement.textContent = candidate;

        if (measureElement.getBoundingClientRect().width <= availableWidth) {
          setSummaryText(candidate);
          return;
        }
      }

      setSummaryText(`총 ${menus.length}개 메뉴`);
    };

    updateSummaryText();

    const resizeObserver = new ResizeObserver(updateSummaryText);
    resizeObserver.observe(textElement);

    return () => resizeObserver.disconnect();
  }, [menus]);

  return (
    <p ref={textRef} className={`${styles.mealSummary} body-s-regular text-secondary`}>
      <span ref={measureRef} aria-hidden className={styles.mealSummaryMeasure} />
      {summaryText}
    </p>
  );
}

function getMealSummaryText(menus: MenuWithQuantity[], visibleCount: number) {
  if (menus.length === 0) return "기록된 식사가 없어요";

  const visibleNames = menus
    .slice(0, visibleCount)
    .map(({ name }) => name)
    .join(", ");
  const hiddenCount = menus.length - visibleCount;

  return hiddenCount > 0 ? `${visibleNames} 외 ${hiddenCount}개` : visibleNames;
}
