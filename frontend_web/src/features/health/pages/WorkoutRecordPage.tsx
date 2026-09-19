import type { ReactNode } from "react";
import { useMemo } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import { useGetWorkoutRecordQuery } from "@/features/health/hooks/queries/workout.query";
import { formatWorkoutDuration } from "@/features/health/utils/workoutFormat";
import Tile from "@/features/home/components/cards/Tile";
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
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
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
    errorMessage: string,
    emptyMessage: string,
    content: () => ReactNode,
  ) => {
    if (workoutRecordQuery.isPending) {
      return (
        <section className={styles.workoutList}>
          <div className={styles.recordCard}>
            <Skeleton height={100} width={100} />
          </div>
        </section>
      );
    }

    if (workoutRecordQuery.isError) {
      return (
        <section className={styles.workoutListErrorArea}>
          <p className="body-l-medium">{errorMessage}</p>
          <Button
            variant="text"
            size="xs"
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
        <section className={styles.workoutListEmptyArea}>
          <img src="/icons/characters/question.png" width={200} />
          <p className="body-l-medium text-tertiary">{emptyMessage}</p>
        </section>
      );
    }

    return content();
  };

  const renderContent = () => {
    return renderStatusContent("운동 기록을 불러오지 못했어요", "운동 기록이 없어요", () => (
      <section className={styles.workoutList} aria-label="운동 기록 목록">
        {workouts.map((workout) => (
          <WorkoutRecordCard
            key={workout.workout_id}
            workout={workout}
            onClick={() => handleWorkoutCardClick(workout)}
          />
        ))}
      </section>
    ));
  };

  return (
    <section className={`${styles.page} page`}>
      <PageHeader title="운동 기록" onBack={handleBack} />

      <Calendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        safeAreaTop={false}
        showMonthBackground={false}
        showRecordedDots={false}
      />

      <main className={`${styles.content} main`}>
        <section className={styles.summaryArea}>
          <p className="title-s-semi text-primary">오늘 운동 요약</p>
          <div className={styles.summaryGrid} aria-label="운동 요약">
            <Tile>
              <p className={`body-l-medium text-primary`}>총 운동 시간</p>
              <p className={`${styles.amount} title-l-semi text-primary`}>
                {formatWorkoutDuration(summary.duration)
                  .split(/(시간|분)/)
                  .map((part, index) =>
                    part === "시간" || part === "분" ? (
                      <span key={index} className="body-l-regular text-tertiary">
                        {` ${part}`}
                      </span>
                    ) : (
                      part
                    ),
                  )}
              </p>
            </Tile>
            <Tile>
              <p className={`body-l-medium text-primary`}>총 소모 칼로리</p>
              <p className={`${styles.amount} title-l-semi text-primary`}>
                {summary.burnedCalories.toLocaleString("ko-KR")}
                <span className="body-l-regular text-tertiary"> kcal</span>
              </p>
            </Tile>
          </div>
        </section>

        <div className={styles.workoutListTitle}>
          <p className="title-s-semi text-primary">오늘 한 운동</p>
          {workouts.length > 0 && (
            <button onClick={handleEditWorkoutRecords} className="body-s-regular text-secondary">
              수정하기
            </button>
          )}
        </div>

        {renderContent()}
      </main>
      <button
        onClick={handleSearchWorkout}
        className={styles.addButton}
        type="button"
        aria-label="운동 기록 추가하러 가기"
      >
        <SystemIcon name="plus" size={28} />
      </button>
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
    <button type="button" className={styles.workoutCard} onClick={onClick}>
      <div className={styles.workoutImage}>
        {workout.workout_image ? (
          <img src={workout.workout_image} alt="" className={styles.thumbnailImage} />
        ) : (
          <SystemIcon
            name={workout.workout_type === "cardio" ? "walking" : "fitness"}
            size={28}
            className="text-tertiary"
          />
        )}
      </div>

      <div className={styles.workoutInfoArea}>
        <p className={`ellipsis body-l-medium text-primary`}>{workout.workout_name}</p>

        <p className={`body-s-regular text-secondary ${styles.workoutMeta}`}>
          <span>
            {workout.workout_type === "cardio"
              ? `${formatWorkoutDuration(workout.workout_duration)}`
              : `${workout.set_list?.length}세트`}
          </span>
          <span>{workout.burned_calories.toLocaleString("ko-KR")} kcal</span>
        </p>
      </div>
      <SystemIcon name="chevron-right" size={18} className={`text-tertiary`} />
    </button>
  );
}
