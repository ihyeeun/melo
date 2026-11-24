import { useLayoutEffect, useRef, useState } from "react";

import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import { useSyncNativeStepCount } from "@/features/health/hooks/useSyncNativeStepCount";
import Tile from "@/features/home/components/cards/Tile";
import { useRecentWeightQuery } from "@/features/home/hooks/queries/useRecentWeight.query";
import { useDayMealsQuery, useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/RecordActionSection.module.css";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import { DayMealCopyButton } from "@/features/meal-record/components/DayMealCopyButton";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { WaterIntakeRecordActionButton } from "@/features/water-intake/components/WaterIntakeRecordActionButton";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath, getWorkoutRecordPath } from "@/router/pathHelpers";
import { isNativeApp } from "@/shared/api/bridge/nativeBridge";
import type { MealType } from "@/shared/api/types/api.dto";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { MEAL_TIMES } from "@/shared/constants/meal.constants";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import { getTodayFormatDateKey, isFutureDateKey } from "@/shared/utils/dateFormat";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";

// screen: REC-01-001
export default function RecordActionSection() {
  const selectedDate = useSelectedDateKey();
  const navigate = useNavigate();
  const { data: profile } = useGetProfileQuery();
  const { data: dayMeals, isPending: isDayMealsPending } = useDayMealsQuery(selectedDate);
  const { data: bodyLog, isPending: isBodyLogPending } = useGetBodyLog(selectedDate);
  const isToday = selectedDate === getTodayFormatDateKey();
  const isFutureDate = isFutureDateKey(selectedDate);
  const isBodyLogLoaded = bodyLog !== undefined;
  // 오늘 체중 기록이 없으면 최근 기록(없으면 프로필 체중)을 흐리게 보여 준다. 다른 날은 빈 값
  const showsRecentWeight = isToday && isBodyLogLoaded && bodyLog.weight === null;
  const { recentWeight, isPending: isRecentWeightPending } = useRecentWeightQuery(selectedDate, {
    enabled: showsRecentWeight,
  });
  const recentWeightValue = recentWeight?.weight ?? profile?.weight;
  const weightCaption =
    recentWeight === undefined ? "최근" : `최근 · ${recentWeight.daysAgo}일 전`;
  const displaySteps = bodyLog?.steps ?? 0;
  const { nativeStepConnectionStatus, requestStepPermissionAndSync } = useSyncNativeStepCount(
    selectedDate,
    {
      enabled: isBodyLogLoaded && !isFutureDate,
      savedSteps: bodyLog?.steps,
    },
  );
  const {
    workoutRecords,
    summary: activitySummary,
    isWorkoutRecordPending,
  } = useActivityCalories(selectedDate);
  const isHealthConnected = nativeStepConnectionStatus === "connected";
  // [+]는 직접 입력할 수 있을 때만(미연동 · 권한 거부 · 그날 건강 앱 데이터 없음)
  const canInputSteps =
    !isFutureDate &&
    (nativeStepConnectionStatus === "disconnected" || nativeStepConnectionStatus === "no_data");

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

  // 건강 앱 미연동(권한 거부 포함)이거나 그날 데이터가 없으면 직접 입력한다.
  // 미연동이면 먼저 권한을 다시 요청해 보고, 그래도 걸음 수가 없으면 입력 시트를 연다.
  // 미래 날짜는 "이 날은 아직 기록할 수 없어요" 시트를 연다
  const openStepsEditor = async () => {
    if (isFutureDate) {
      navigate(getBodyLogSheetPath(PATH.HOME_STEPS_LOG_SHEET));
      return;
    }

    let status = nativeStepConnectionStatus;
    if (status === "disconnected" && isNativeApp()) {
      status = await requestStepPermissionAndSync();
    }
    if (status !== "disconnected" && status !== "no_data") return;

    navigate(
      getBodyLogSheetPath(PATH.HOME_STEPS_LOG_SHEET, {
        nativeStepConnectionStatus: status,
      }),
    );
  };

  return (
    <div className={styles.root}>
      <section className={styles.recordGroup}>
        <div className={styles.mealRecordTitle}>
          <h2 className="title-s-semi text-primary">식단 기록</h2>
          <DayMealCopyButton dayMeals={dayMeals} />
        </div>

        {isDayMealsPending ? (
          <MealRecordSkeleton />
        ) : (
          <ul className={styles.mealsArea}>
            {MEAL_TIMES.map(({ type, label, icon }) => {
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
                      <div className={styles.mealIcon} data-meal={type} data-selected={hasMenus}>
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
                          {formatDisplayNumber(calories)}kcal
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

      <section className={styles.recordGroup}>
        <h2 className="title-s-semi text-primary">건강 기록</h2>
        <div className={styles.bodyLogGroup}>
          <HealthMetricCard
            title="걸음 수"
            value={displaySteps}
            unit="보"
            onClick={() => void openStepsEditor()}
            isPending={isBodyLogPending}
            isHealthConnected={isHealthConnected}
            canAdd={canInputSteps}
          />
          {showsRecentWeight ? (
            <HealthMetricCard
              title="체중"
              value={recentWeightValue}
              unit="kg"
              caption={recentWeightValue === undefined ? undefined : weightCaption}
              isDimmed
              onClick={openWeightEditor}
              isPending={isRecentWeightPending}
            />
          ) : (
            <HealthMetricCard
              title="체중"
              value={bodyLog?.weight ?? undefined}
              unit="kg"
              onClick={openWeightEditor}
              isPending={isBodyLogPending}
            />
          )}
        </div>
      </section>

      <section className={styles.recordGroup}>
        <h2 className="title-s-semi text-primary">물 섭취 기록</h2>
        <WaterIntakeRecordActionButton />
      </section>

      <section className={styles.recordGroup}>
        <h2 className="title-s-semi text-primary">운동 기록</h2>
        <Tile
          onClick={
            isWorkoutRecordPending ? undefined : () => navigate(getWorkoutRecordPath(selectedDate))
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
    </div>
  );
}

function HealthMetricCard({
  title,
  value,
  unit,
  caption,
  isDimmed = false,
  onClick,
  isPending = false,
  isHealthConnected = false,
  canAdd = true,
}: {
  title: string;
  // 기록이 없으면 비워서 "-"로 보여 준다
  value: number | undefined;
  unit: string;
  // 값 위 작은 설명 (예: "최근 · 2일 전")
  caption?: string;
  isDimmed?: boolean;
  onClick: () => void;
  isPending?: boolean;
  isHealthConnected?: boolean;
  canAdd?: boolean;
}) {
  return (
    <Tile
      onClick={isPending ? undefined : onClick}
      className={styles.bodyLogButton}
      data-isHealthConnected={isHealthConnected}
    >
      <div className={styles.bodyLogTitle}>
        <p className="body-l-medium text-primary">{title}</p>
        {canAdd && (
          <SystemIcon name="plus-circle" size={18} className="text-secondary marginLeft" />
        )}
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
          {caption ? (
            <span className={`caption-m-medium text-tertiary ${styles.bodyLogCaption}`}>
              {caption}
            </span>
          ) : null}
          <span
            className={`title-l-semi amp-mask ${styles.bodyLogValueWeight} ${isDimmed ? "text-disabled" : ""}`}
          >
            {value === undefined ? "-" : value.toLocaleString()}
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
        {MEAL_TIMES.map(({ type }) => (
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
