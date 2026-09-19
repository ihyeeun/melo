import type { ReactNode } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import MealMenuPreview from "@/features/diary/components/MealMenuPreview";
import styles from "@/features/diary/styles/DiaryPage.module.css";
import { useGetWorkoutRecordQuery } from "@/features/health/hooks/queries/workout.query";
import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import { useSyncNativeStepCount } from "@/features/health/hooks/useSyncNativeStepCount";
import Tile from "@/features/home/components/cards/Tile";
import { useDayMealsQuery, useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import { getDayNutritionSummary } from "@/features/home/utils/dayMealSummary";
import { DayMealCopyButton } from "@/features/meal-record/components/DayMealCopyButton";
import {
  useGetProfileQuery,
  useGoalSnapshotByDateQuery,
} from "@/features/profile/hooks/queries/useProfileQuery";
import { WaterIntakeRecordActionButton } from "@/features/water-intake/components/WaterIntakeRecordActionButton";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath, getWorkoutRecordPath } from "@/router/pathHelpers";
import { isNativeApp, syncAppTab } from "@/shared/api/bridge/nativeBridge";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
import ArcProgress from "@/shared/commons/progress/ArcProgress";
import ScoreProgress from "@/shared/commons/progress/Progress";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { getTodayFormatDateKey, isFutureDateKey, parseDateKey } from "@/shared/utils/dateFormat";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";

const MEAL_TYPES = [
  { time: "0", label: "아침", icon: "breakfast" },
  { time: "1", label: "점심", icon: "lunch" },
  { time: "2", label: "저녁", icon: "dinner" },
  { time: "3", label: "간식", icon: "snack" },
  { time: "4", label: "야식", icon: "late-snack" },
] as const;

const NUTRIENTS = [
  { key: "carbs", label: "탄수화물" },
  { key: "protein", label: "단백질" },
  { key: "fat", label: "지방" },
] as const;

export default function DiaryPage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const navigate = useNavigate();

  const { data: dayMeal, isPending: isSummaryPending } = useDayMealsQuery(selectedDateKey);
  const { data: profile, isPending: isProfilePending } = useGetProfileQuery();
  const { data: userGoal, isPending: isUserGoalPending } =
    useGoalSnapshotByDateQuery(selectedDateKey);
  const { data: bodyLog } = useGetBodyLog(selectedDateKey);
  const isToday = selectedDateKey === getTodayFormatDateKey();
  const isFutureDate = isFutureDateKey(selectedDateKey);
  const isBodyLogLoaded = bodyLog !== undefined;
  const displayWeight = bodyLog?.weight ?? (isToday ? (profile?.weight ?? 0) : 0);
  const displaySteps = bodyLog?.steps ?? 0;
  const { nativeStepConnectionStatus } = useSyncNativeStepCount(selectedDateKey, {
    enabled: isBodyLogLoaded && !isFutureDate,
    savedSteps: bodyLog?.steps,
  });
  const {
    isStepCaloriesPending,
    isWorkoutRecordPending,
    summary: activitySummary,
  } = useActivityCalories(selectedDateKey);
  const workoutRecordQuery = useGetWorkoutRecordQuery(selectedDateKey);
  const workouts = workoutRecordQuery.data?.workout_list ?? [];
  const hasWorkoutRecords = workouts.length > 0;

  if (
    isSummaryPending ||
    isProfilePending ||
    isUserGoalPending ||
    isStepCaloriesPending ||
    isWorkoutRecordPending
  ) {
    return;
  }

  const nutrition = getDayNutritionSummary(
    dayMeal,
    {
      target_calories: userGoal?.target_calories ?? profile?.target_calories ?? 0,
      target_ratio: userGoal?.target_ratio ?? profile?.target_ratio ?? [],
    },
    activitySummary?.calories,
  );
  const currentCalorie = nutrition.calories.current;
  const targetCalorie = nutrition.calories.target;
  const targetWeight = userGoal?.target_weight ?? profile?.target_weight;

  const handleMoveMealRecord = (
    mealType: (typeof MEAL_TYPES)[number]["time"],
    hasMealRecord: boolean,
  ) => {
    navigate(
      hasMealRecord
        ? getMealRecordPath(selectedDateKey, mealType)
        : getMealSearchPath(selectedDateKey, mealType),
    );
  };

  const handleMoveWorkoutRecord = () => {
    navigate(getWorkoutRecordPath(selectedDateKey));
  };

  const handleMoveAiCoach = () => {
    if (isNativeApp()) {
      syncAppTab("chat");
      return;
    }

    navigate(PATH.CHAT);
  };

  const getBodyLogSheetPath = (pathname: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams({ date: selectedDateKey, ...params });

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
    <div className={`${styles.root} page`}>
      <Calendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        showMonthBackground={false}
      />
      <ScrollFogArea role="main" className={`main ${styles.scrollArea}`}>
        <div className={styles.content}>
          <div className={styles.nutritionSummary}>
            <section className={styles.mealSummaryCard}>
              <h2 className="body-l-medium text-primary">섭취 칼로리</h2>
              <ArcProgress
                value={currentCalorie}
                max={targetCalorie}
                ariaLabel="섭취 칼로리"
                valueText={
                  targetCalorie > 0
                    ? `${currentCalorie.toLocaleString()} / ${targetCalorie.toLocaleString()} kcal`
                    : `${currentCalorie.toLocaleString()} kcal 섭취, 목표 미설정`
                }
                gradient={{ startColor: "#ff989a", endColor: "var(--coral-400)" }}
                trackColor="var(--background-gray-2)"
                className={styles.calorieGauge}
              >
                <img
                  src="/icons/characters/diary.png"
                  alt=""
                  aria-hidden="true"
                  width={58}
                  className={styles.calorieGaugeCharacter}
                />
              </ArcProgress>
              <p className="title-l-semi text-primary textCenter">
                {currentCalorie.toLocaleString()}{" "}
                <span className="body-l-regular text-tertiary">
                  {targetCalorie > 0
                    ? `/ ${targetCalorie.toLocaleString()} kcal`
                    : "kcal / 목표 미설정"}
                </span>
              </p>
            </section>

            <section className={styles.macroCard} aria-label="영양소 섭취량">
              {NUTRIENTS.map(({ key, label }) => {
                const { current, target, progressPercent } = nutrition.nutrients[key];

                return (
                  <div key={key} className={styles.macroItem}>
                    <div className={styles.macroTitle}>
                      <h3 className="body-s-medium text-primary">{label}</h3>
                      {key === "carbs" && nutrition.notices.carbsEstimatedFromSubNutrients && (
                        <InfoPopover ariaLabel="순탄수 기준 안내">
                          탄수화물에서 대체당과 식이섬유를 뺀 순탄수를 기준으로 탄수화물 정보를
                          제공하고 있어요
                        </InfoPopover>
                      )}
                    </div>
                    <p className="body-s-medium text-primary">
                      {formatDisplayNumber(current)}{" "}
                      <span className="caption-m-regular text-tertiary">
                        / {formatDisplayNumber(target)} g
                      </span>
                    </p>
                    <ScoreProgress
                      variant="navy"
                      value={progressPercent}
                      ariaLabel={`${label} 섭취량`}
                      valueText={
                        target > 0
                          ? `${formatDisplayNumber(current)} / ${formatDisplayNumber(target)} g`
                          : `${formatDisplayNumber(current)} g 섭취, 목표 미설정`
                      }
                    />
                  </div>
                );
              })}
            </section>
          </div>

          <SectionLayout title="총 소모 칼로리">
            <div className={styles.burnedCaloriesCard}>
              <div className={styles.burnedCalorieList}>
                <section className={styles.burnedCalorieItem}>
                  <span className={styles.iconBg}>
                    <SystemIcon name="exercise" size={24} className="text-tertiary" />
                  </span>
                  <div>
                    <p className="body-s-medium text-primary">운동으로 소모</p>
                    <p className="body-l-medium text-secondary">
                      {activitySummary?.workoutCalories.toLocaleString() ?? 0} kcal
                    </p>
                  </div>
                </section>

                <section className={styles.burnedCalorieItem}>
                  <span className={styles.iconBg}>
                    <SystemIcon name="steps" size={24} className="text-tertiary" />
                  </span>
                  <div>
                    <p className={`${styles.titleWithIcon} body-s-medium text-primar`}>
                      걸음으로 소모
                      <InfoPopover
                        ariaLabel="걸음 소모 칼로리 안내"
                        iconSize={16}
                        side="bottom"
                        align="end"
                      >
                        평소 활동량을 고려해 목표 칼로리가 설정되어 있어요
                      </InfoPopover>
                    </p>
                    <p className="body-l-medium text-secondary">
                      {activitySummary?.stepCalories.toLocaleString() ?? 0} kcal
                    </p>
                  </div>
                </section>
              </div>

              <div className={styles.burnedTotalCalorie}>
                <p className="body-l-medium text-primary">총 소모 칼로리</p>
                <p className="body-l-medium text-primary marginLeft">
                  {activitySummary?.totalCalories.toLocaleString() ?? 0} kcal
                </p>
              </div>
            </div>
          </SectionLayout>

          <SectionLayout title="건강 기록">
            <div className={styles.bodyLogGroup}>
              <Tile onClick={openStepsEditor} className={styles.bodyLogButton}>
                <div className={styles.bodyLogTitle}>
                  <p className="body-l-medium text-primary">걸음 수</p>
                  <SystemIcon name="plus-circle" size={18} className="text-secondary marginLeft" />
                </div>

                <div className={styles.bodyLogValue}>
                  <span className={`title-l-semi amp-mask ${styles.bodyLogValueWeight}`}>
                    {displaySteps.toLocaleString()}
                  </span>
                  <span className="body-l-regular text-tertiary">보</span>
                </div>
              </Tile>

              <Tile onClick={openWeightEditor} className={styles.bodyLogButton}>
                <div className={styles.bodyLogTitle}>
                  <p className="body-l-medium text-primary">체중</p>
                  <SystemIcon name="plus-circle" size={18} className="text-secondary marginLeft" />
                </div>

                <div>
                  <p className="caption-m-medium text-disabled">목표 {targetWeight}kg</p>
                  <div className={styles.bodyLogValue}>
                    <span className={`title-l-semi amp-mask ${styles.bodyLogValueWeight}`}>
                      {displayWeight.toLocaleString()}
                    </span>
                    <span className="body-l-regular text-tertiary">kg</span>
                  </div>
                </div>
              </Tile>
            </div>
          </SectionLayout>

          <SectionLayout title="식단 기록">
            <ul className={styles.mealRecordGroup}>
              <div className={styles.mealCopyButton}>
                <DayMealCopyButton dayMeals={dayMeal} />
              </div>

              {MEAL_TYPES.map(({ time, label, icon }) => {
                const calories = dayMeal?.caloriesByTime[time] ?? 0;
                const hasImage = Boolean(dayMeal?.imagesByTime[time]);
                const menus = dayMeal?.menusByTime[time] ?? [];
                const hasMealRecord = menus.length > 0 || Boolean(dayMeal?.didNotEatByTime[time]);

                return (
                  <li key={time}>
                    <button
                      type="button"
                      className={styles.mealRecordButton}
                      onClick={() => handleMoveMealRecord(time, hasMealRecord)}
                    >
                      <div className={styles.mealImageBox} data-hasMeal={hasMealRecord}>
                        {hasMealRecord ? (
                          hasImage ? (
                            <img
                              src={dayMeal?.imagesByTime[time]}
                              className={styles.mealImage}
                              alt={label}
                            />
                          ) : (
                            <div className={styles.hasMealRecordSection}>
                              <div className={styles.mealIcon} data-hasMeal={hasMealRecord}>
                                <SystemIcon name={icon} size={18} />
                              </div>
                              <MealMenuPreview menus={menus} />
                            </div>
                          )
                        ) : (
                          <div className={styles.mealIcon} data-hasMeal={hasMealRecord}>
                            <SystemIcon name="plus" size={18} />
                          </div>
                        )}
                      </div>

                      <div className={styles.mealInfo}>
                        <span className="body-l-medium text-primary">{label}</span>
                        <span className="body-m-regular text-tertiary marginLeft">
                          {formatDisplayNumber(calories)} kcal
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  className={`${styles.mealRecordButton} ${styles.aiCoachButton}`}
                  onClick={handleMoveAiCoach}
                  aria-label="AI 코치에게 식단 추천받기, AI 코치 탭으로 이동"
                >
                  <span className={styles.aiCoachArrow} aria-hidden="true">
                    <SystemIcon name="arrow-insert" size={24} />
                  </span>
                  <img
                    src="/icons/characters/search.png"
                    alt=""
                    className={styles.aiCoachCharacter}
                  />
                  <span className={`${styles.aiCoachLabel} body-l-medium text-secondary`}>
                    AI 코치에게
                    <br />
                    식단 추천받기
                  </span>
                </button>
              </li>
            </ul>
          </SectionLayout>

          <SectionLayout title="물 섭취 기록">
            <WaterIntakeRecordActionButton />
          </SectionLayout>

          <SectionLayout title="운동 기록">
            <Tile className={`${styles.workoutGroupButton}`} onClick={handleMoveWorkoutRecord}>
              {hasWorkoutRecords ? (
                <ul className={styles.workoutRecordGroup}>
                  {workouts.map((item) => {
                    const setCount = item.set_list?.length ?? 0;

                    return (
                      <li key={item.workout_id} className={styles.workoutRecordItem}>
                        <div className={styles.workoutImageBox}>
                          {item.workout_image ? (
                            <img src={item.workout_image} className={styles.workoutImage} alt="" />
                          ) : (
                            <SystemIcon name="more-horiz" size={24} />
                          )}
                        </div>
                        <div className={styles.workoutInfo}>
                          <p className="body-s-regular text-secondary">{item.workout_name}</p>
                          <p className="body-s-regular text-disabled">
                            {setCount > 0 && `${setCount}세트`} {item.workout_duration}분{" "}
                            {item.burned_calories.toLocaleString()}kcal
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.workoutEmptyAction}>
                  <div className={styles.workoutEmptyContent}>
                    <p className="body-l-medium text-primary">
                      {hasWorkoutRecords ? "" : "아직 오늘의 운동 기록이 없어요"}
                    </p>
                    <p className="body-s-regular text-tertiary">아직 오늘의 운동 기록이 없어요</p>
                  </div>
                  <SystemIcon
                    name="chevron-right"
                    size={18}
                    className="marginLeft text-secondary"
                    onClick={handleMoveWorkoutRecord}
                  />
                </div>
              )}
            </Tile>
          </SectionLayout>
        </div>
      </ScrollFogArea>
    </div>
  );
}

function SectionLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.sectionGroup}>
      <div className={styles.titleArea}>
        <h2 className="title-s-semi text-primary">{title}</h2>
        {description && <p className="body-s-regular text-tertiary">{description}</p>}
      </div>

      {children}
    </div>
  );
}
