import Calendar from "@/features/calendar/components/Calendar";
import styles from "@/features/diary/styles/DiaryPage.module.css";
import { useGetWorkoutRecordQuery } from "@/features/health/hooks/queries/workout.query";
import { useActivityCalories } from "@/features/health/hooks/useActivityCalories";
import { useSyncNativeStepCount } from "@/features/health/hooks/useSyncNativeStepCount";
import Tile from "@/features/home/components/cards/Tile";
import { useDayMealsQuery, useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import { getDayNutritionSummary } from "@/features/home/utils/dayMealSummary";
import { DayMealCopyButton } from "@/features/meal-record/components/DayMealCopyButton";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { getMealRecordPath, getMealSearchPath, getWorkoutRecordPath } from "@/router/pathHelpers";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
import { ScrollFogArea } from "@/shared/commons/scrollFog";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { getTodayFormatDateKey, isFutureDateKey, parseDateKey } from "@/shared/utils/dateFormat";

const MEAL_TYPES = [
  { time: "0", label: "아침", icon: "breakfast" },
  { time: "1", label: "점심", icon: "lunch" },
  { time: "2", label: "저녁", icon: "dinner" },
  { time: "3", label: "간식", icon: "snack" },
  { time: "4", label: "야식", icon: "late-snack" },
] as const;

export default function DiaryPage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const navigate = useNavigate();

  const { data: dayMeal, isPending: isSummaryPending } = useDayMealsQuery(selectedDateKey);
  const { data: profile, isPending: isProfilePending } = useGetProfileQuery();
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

  const nutrition = getDayNutritionSummary(dayMeal, profile, activitySummary?.calories);
  const currentCalorie = nutrition.calories.current;
  const targetCalorie = nutrition.calories.target;
  const calorieDiff = targetCalorie - currentCalorie;
  const calorieStatusText =
    calorieDiff < 0 ? "초과했어요" : calorieDiff === 0 ? "완벽해요!" : "더 먹을 수 있어요";

  if (isSummaryPending || isProfilePending || isStepCaloriesPending || isWorkoutRecordPending) {
    return;
  }

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
      <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <ScrollFogArea role="main" className={`main ${styles.content}`}>
        <section className={styles.mealSummaryCard}>
          <div>
            <p className="title-l-semi text-primary textCenter">
              {nutrition.calories.current}{" "}
              <span className="body-l-regular text-tertiary">
                / {nutrition.calories.target} kcal
              </span>
            </p>

            <div className={styles.macroArea}>
              <span className={`body-s-regular ${styles.macroName}`}>
                탄 {profile?.target_ratio[0]}%
              </span>
              <span className={`body-s-regular ${styles.macroName}`}>
                단 {profile?.target_ratio[1]}%
              </span>
              <span className={`body-s-regular ${styles.macroName}`}>
                지 {profile?.target_ratio[2]}%
              </span>
            </div>
          </div>

          <div className={styles.caloriesArea}>
            <div className={styles.calorieItem}>
              <p className="caption-m-medium text-tertiary">섭취 칼로리</p>
              <p className="body-l-medium text-primary">
                {currentCalorie.toLocaleString()}
                <span className="caption-m-medium">kcal</span>
              </p>
            </div>
            <div className={styles.calorieItem}>
              <p className="caption-m-medium text-tertiary">목표 칼로리</p>
              <p className="body-l-medium text-primary">
                {targetCalorie.toLocaleString()}
                <span className="caption-m-medium">kcal</span>
              </p>
            </div>
            <div className={styles.calorieItem}>
              <p className="caption-m-medium text-tertiary">{calorieStatusText}</p>
              <p className="body-l-medium text-primary">
                {Math.abs(calorieDiff).toLocaleString()}
                <span className="caption-m-medium">kcal</span>
              </p>
            </div>
          </div>
        </section>

        <Tile>
          <div className={styles.burnedCalorieTitle}>
            <h2 className="title-s-semi text-primary">총 소모 칼로리</h2>
            <p className="body-l-medium text-primary marginLeft">
              <span className="title-l-semi text-primary">
                {activitySummary?.totalCalories.toLocaleString() ?? 0}
              </span>{" "}
              kcal
            </p>
          </div>

          <div className={styles.burnedCalorieList}>
            <div className={styles.burnedCalorieItem}>
              <span className="caption-m-medium text-tertiary">운동</span>
              <span className="caption-m-medium text-secondary marginLeft">
                {activitySummary?.workoutCalories.toLocaleString() ?? 0} kcal
              </span>
            </div>
            <div className={styles.burnedCalorieItem}>
              <span className="caption-m-medium text-tertiary">걸음</span>
              <InfoPopover
                ariaLabel="걸음 소모 칼로리 안내"
                iconSize={16}
                className={styles.infoPopover}
              >
                평소 활동량을 고려해 목표 칼로리가 설정되어 있어요
              </InfoPopover>
              <span className="caption-m-medium text-secondary marginLeft">
                {activitySummary?.stepCalories.toLocaleString() ?? 0} kcal
              </span>
            </div>
          </div>
        </Tile>

        <section className={styles.fieldGroup}>
          <h2 className="title-s-semi text-primary">건강 기록</h2>

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
                <p className="caption-m-medium text-disabled">목표 {profile?.target_weight}kg</p>
                <div className={styles.bodyLogValue}>
                  <span className={`title-l-semi amp-mask ${styles.bodyLogValueWeight}`}>
                    {displayWeight.toLocaleString()}
                  </span>
                  <span className="body-l-regular text-tertiary">kg</span>
                </div>
              </div>
            </Tile>
          </div>
        </section>

        <div className={styles.fieldGroup}>
          <div className={styles.mealRecordTitle}>
            <h2 className="title-s-semi text-primary">식단 기록</h2>
            <DayMealCopyButton dayMeals={dayMeal} />
          </div>

          <ul className={styles.mealRecordGroup}>
            {MEAL_TYPES.map(({ time, label, icon }) => {
              const calories = dayMeal?.caloriesByTime[time] ?? 0;
              const hasImage = Boolean(dayMeal?.imagesByTime[time]);
              const hasMealRecord =
                (dayMeal?.menusByTime[time].length ?? 0) > 0 ||
                Boolean(dayMeal?.didNotEatByTime[time]);

              return (
                <li key={time}>
                  <button
                    type="button"
                    className={styles.mealRecordButton}
                    onClick={() => handleMoveMealRecord(time, hasMealRecord)}
                  >
                    <div className={styles.mealImageBox}>
                      {hasImage ? (
                        <img
                          src={dayMeal?.imagesByTime[time]}
                          className={styles.mealImage}
                          alt={label}
                        />
                      ) : (
                        <div className={styles.mealIcon} data-recorded={hasMealRecord}>
                          <SystemIcon name={icon} size={18} />
                        </div>
                      )}
                    </div>

                    <div className={styles.mealInfo}>
                      <span className="caption-m-medium text-tertiary">{label}</span>
                      <span className="caption-m-medium text-secondary marginLeft">
                        {calories.toLocaleString()}kcal
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <Tile
          className={`${styles.fieldGroup} ${styles.workoutGroupButton}`}
          onClick={handleMoveWorkoutRecord}
        >
          <div className={styles.workoutRecordTitle}>
            <h2 className="title-s-semi text-primary">운동 기록</h2>
            <SystemIcon
              name="chevron-right"
              size={18}
              className="marginLeft text-secondary"
              onClick={handleMoveWorkoutRecord}
            />
          </div>

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
            <p className="body-s-regular text-tertiary">아직 오늘의 운동 기록이 없어요</p>
          )}
        </Tile>
      </ScrollFogArea>
    </div>
  );
}
