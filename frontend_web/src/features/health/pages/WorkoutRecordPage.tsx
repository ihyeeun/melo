import type { ReactNode } from "react";
import { useMemo } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import { useGetWorkoutRecordQuery } from "@/features/health/hooks/queries/workout.query";
import { formatWorkoutDuration } from "@/features/health/utils/workoutFormat";
import { PATH } from "@/router/path";
import {
  getWorkoutRecordEditPath,
  getWorkoutSearchPath,
  getWorkoutUpsertPath,
} from "@/router/pathHelpers";
import type { WorkoutRecordItemResponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { navigateBack, useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey, useSetSelectedDate } from "@/shared/stores/selectedDate.store";
import { parseDateKey } from "@/shared/utils/dateFormat";

import styles from "../styles/WorkoutRecordPage.module.css";

const EMPTY_WORKOUT_RECORDS: WorkoutRecordItemResponseDto[] = [];

function getWorkoutSummary(workouts: WorkoutRecordItemResponseDto[]) {
  return workouts.reduce(
    (acc, workout) => ({
      burnedCalories: acc.burnedCalories + workout.burned_calories,
      duration: acc.duration + workout.workout_duration,
    }),
    { burnedCalories: 0, duration: 0 },
  );
}

export default function WorkoutRecordPage() {
  const selectedDateKey = useSelectedDateKey();
  const setSelectedDate = useSetSelectedDate();
  const selectedDate = parseDateKey(selectedDateKey);
  const navigate = useNavigate();
  const workoutRecordQuery = useGetWorkoutRecordQuery(selectedDateKey);
  const workouts = workoutRecordQuery.data?.workout_list ?? EMPTY_WORKOUT_RECORDS;
  const summary = useMemo(() => getWorkoutSummary(workouts), [workouts]);

  const handleWorkoutCardClick = (workout: WorkoutRecordItemResponseDto) => {
    navigate(getWorkoutUpsertPath(selectedDateKey, workout.workout_id), {
      state: { workoutRecord: workout },
    });
  };

  const handleBack = () => {
    navigateBack({ fallbackTo: PATH.HOME });
  };

  const handleSearchWorkout = () => {
    navigate(getWorkoutSearchPath(selectedDateKey));
  };

  const handleEditWorkoutRecords = () => {
    navigate(getWorkoutRecordEditPath(selectedDateKey));
  };

  const renderStatusContent = (
    pendingMessage: string,
    errorMessage: string,
    emptyMessage: string,
    content: () => ReactNode,
  ) => {
    if (workoutRecordQuery.isPending) {
      return (
        <section className={styles.statusContainer}>
          <LoadingIndicator label={pendingMessage} />
        </section>
      );
    }

    if (workoutRecordQuery.isError) {
      return (
        <section className={styles.emptyState}>
          <p className="body-l-medium">{errorMessage}</p>
          <Button
            variant="text"
            color="normal"
            size="small"
            onClick={() => {
              void workoutRecordQuery.refetch();
            }}
          >
            다시 시도
          </Button>
        </section>
      );
    }

    if (workouts.length === 0) {
      return (
        <section className={styles.emptyState}>
          <p className="body-l-medium">{emptyMessage}</p>
        </section>
      );
    }

    return content();
  };

  const renderContent = () => {
    return renderStatusContent(
      "운동 기록을 불러오는 중입니다.",
      "운동 기록을 불러오지 못했어요",
      "운동 기록이 없어요",
      () => (
        <section className={styles.recordList} aria-label="운동 기록 목록">
          {workouts.map((workout) => (
            <WorkoutRecordCard
              key={workout.workout_id}
              workout={workout}
              onClick={() => handleWorkoutCardClick(workout)}
            />
          ))}
        </section>
      ),
    );
  };

  return (
    <section className={styles.page}>
      <PageHeader title="운동 기록" onBack={handleBack} />

      <Calendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        safeAreaTop={false}
        showRecordedDots={false}
      />

      <main className={styles.content}>
        <section className={styles.cardContainer}>
          <p className="title-s-semi">오늘 운동 요약</p>
          <div className={styles.summaryGrid} aria-label="운동 요약">
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryTitle} body-m-regular`}>총 운동 시간</span>
              <div className={styles.summaryValueRow}>
                <span className={`${styles.summaryValue} title-m-semi`}>
                  {formatWorkoutDuration(summary.duration)}
                </span>
              </div>
            </article>
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryTitle} body-m-regular`}>총 소모 칼로리</span>
              <div className={styles.summaryValueRow}>
                <span className={`${styles.summaryValue} title-m-semi`}>
                  {summary.burnedCalories.toLocaleString("ko-KR")}
                </span>
                <span className="body-m-regular">kcal</span>
              </div>
            </article>
          </div>
        </section>

        <div className={styles.sectionHeader}>
          <p className="title-s-semi">오늘 한 운동</p>
          {workouts.length > 0 && (
            <Button variant="text" color="normal" size="small" onClick={handleEditWorkoutRecords}>
              수정
              <SystemIcon name="chevron-right" size={18} />
            </Button>
          )}
        </div>

        {renderContent()}
      </main>

      <footer className={styles.footer}>
        <Button fullWidth size="large" onClick={handleSearchWorkout}>
          <SystemIcon name="plus" size={18} />
          운동 추가하기
        </Button>
      </footer>
    </section>
  );
}

function WorkoutRecordCard({
  workout,
  onClick,
}: {
  workout: WorkoutRecordItemResponseDto;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.recordCard} onClick={onClick}>
      <div className={styles.thumbnail}>
        {workout.workout_image ? (
          <img src={workout.workout_image} alt="" className={styles.thumbnailImage} />
        ) : (
          <SystemIcon name={workout.workout_type === "cardio" ? "walking" : "fitness"} size={28} />
        )}
      </div>

      <div className={styles.recordContent}>
        <p className={`ellipsis body-l-semi`}>{workout.workout_name}</p>

        <p className="caption-m-medium">
          {workout.workout_type === "cardio"
            ? `${formatWorkoutDuration(workout.workout_duration)}`
            : `${workout.set_list?.length}세트`}
        </p>
      </div>

      <span className={`${styles.calorieText} body-m-regular`}>
        {workout.burned_calories.toLocaleString("ko-KR")}kcal
      </span>
      <SystemIcon name="chevron-right" size={18} className={styles.chevronIcon} />
    </button>
  );
}
