import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";

import Calendar from "@/features/calendar/components/Calendar";
import { useDeleteWorkoutRecordMutation } from "@/features/health/hooks/mutations/workout.mutation";
import { useGetWorkoutRecordQuery } from "@/features/health/hooks/queries/workout.query";
import { formatWorkoutDuration } from "@/features/health/utils/workoutFormat";
import { PATH } from "@/router/path";
import { getWorkoutSearchPath, getWorkoutUpsertPath } from "@/router/pathHelpers";
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
  const { mutate: deleteWorkoutRecord, isPending: isDeletePending } =
    useDeleteWorkoutRecordMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editWorkoutOrderIds, setEditWorkoutOrderIds] = useState<number[]>([]);
  const [removedWorkoutIds, setRemovedWorkoutIds] = useState<Set<number>>(() => new Set());
  const draggingWorkoutIdRef = useRef<number | null>(null);
  const workouts = workoutRecordQuery.data?.workout_list ?? EMPTY_WORKOUT_RECORDS;
  const editWorkouts = useMemo(() => {
    const workoutById = new Map(workouts.map((workout) => [workout.workout_id, workout]));
    const orderedWorkouts = editWorkoutOrderIds.flatMap((workoutId) => {
      const workout = workoutById.get(workoutId);

      return workout && !removedWorkoutIds.has(workoutId) ? [workout] : [];
    });
    const orderedWorkoutIdSet = new Set(editWorkoutOrderIds);
    const newWorkouts = workouts.filter(
      (workout) =>
        !orderedWorkoutIdSet.has(workout.workout_id) &&
        !removedWorkoutIds.has(workout.workout_id),
    );

    return [...orderedWorkouts, ...newWorkouts];
  }, [editWorkoutOrderIds, removedWorkoutIds, workouts]);
  const summary = useMemo(() => getWorkoutSummary(workouts), [workouts]);
  const editSummary = useMemo(() => getWorkoutSummary(editWorkouts), [editWorkouts]);

  const startEditMode = () => {
    setEditWorkoutOrderIds(workouts.map((workout) => workout.workout_id));
    setRemovedWorkoutIds(new Set());
    setIsEditMode(true);
  };

  const closeEditMode = () => {
    setIsEditMode(false);
    draggingWorkoutIdRef.current = null;
  };

  const completeEditMode = () => {
    closeEditMode();
  };

  const moveWorkout = (fromWorkoutId: number, toWorkoutId: number) => {
    if (fromWorkoutId === toWorkoutId) return;

    setEditWorkoutOrderIds((current) => {
      const orderIds = current.length > 0 ? current : workouts.map((workout) => workout.workout_id);
      const fromIndex = orderIds.indexOf(fromWorkoutId);
      const toIndex = orderIds.indexOf(toWorkoutId);

      if (fromIndex < 0 || toIndex < 0) return current;

      const nextOrderIds = [...orderIds];
      const [movedWorkoutId] = nextOrderIds.splice(fromIndex, 1);
      nextOrderIds.splice(toIndex, 0, movedWorkoutId);

      return nextOrderIds;
    });
  };

  const handleDeleteWorkout = (workoutId: number) => {
    setRemovedWorkoutIds((current) => new Set(current).add(workoutId));
    deleteWorkoutRecord(
      {
        date: selectedDateKey,
        workout_id: workoutId,
      },
      {
        onError: () => {
          setRemovedWorkoutIds((current) => {
            const nextRemovedWorkoutIds = new Set(current);
            nextRemovedWorkoutIds.delete(workoutId);

            return nextRemovedWorkoutIds;
          });
        },
      },
    );
  };

  const handleDragStart = (workoutId: number) => {
    draggingWorkoutIdRef.current = workoutId;
  };

  const handleDragEnter = (workoutId: number) => {
    const draggingWorkoutId = draggingWorkoutIdRef.current;
    if (draggingWorkoutId === null) return;

    moveWorkout(draggingWorkoutId, workoutId);
  };

  const handleDragEnd = () => {
    draggingWorkoutIdRef.current = null;
  };

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
          <p className="typo-body2">{errorMessage}</p>
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
          <p className="typo-body2">{emptyMessage}</p>
        </section>
      );
    }

    return content();
  };

  const renderEditContent = () =>
    renderStatusContent(
      "운동 기록을 불러오는 중입니다.",
      "운동 기록을 불러오지 못했어요",
      "운동 기록이 없어요",
      () => (
        <section className={styles.recordList} aria-label="운동 수정 목록">
          {editWorkouts.map((workout) => (
            <WorkoutEditCard
              key={workout.workout_id}
              workout={workout}
              deleteDisabled={isDeletePending}
              onClick={() => handleWorkoutCardClick(workout)}
              onDelete={() => handleDeleteWorkout(workout.workout_id)}
              onDragEnd={handleDragEnd}
              onDragEnter={() => handleDragEnter(workout.workout_id)}
              onDragStart={() => handleDragStart(workout.workout_id)}
            />
          ))}
        </section>
      ),
  );

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

  if (isEditMode) {
    return (
      <section className={styles.page}>
        <header className={styles.editHeader}>
          <button
            type="button"
            className={styles.editCloseButton}
            onClick={closeEditMode}
            aria-label="운동 수정 닫기"
          >
            <SystemIcon name="close" size={24} />
          </button>
          <h1 className={`${styles.editHeaderTitle} typo-title3`}>운동수정</h1>
          <div aria-hidden="true" className={styles.editHeaderSpacer} />
        </header>

        <main className={styles.content}>
          <section className={styles.cardContainer}>
            <div className={styles.summaryGrid} aria-label="운동 수정 요약">
              <article className={styles.summaryCard}>
                <span className={`${styles.summaryTitle} typo-caption3`}>총 운동 시간</span>
                <div className={styles.summaryValueRow}>
                  <span className={`${styles.summaryValue} typo-title2`}>
                    {formatWorkoutDuration(editSummary.duration)}
                  </span>
                </div>
              </article>
              <article className={styles.summaryCard}>
                <span className={`${styles.summaryTitle} typo-caption3`}>총 소모 칼로리</span>
                <div className={styles.summaryValueRow}>
                  <span className={`${styles.summaryValue} typo-title2`}>
                    {editSummary.burnedCalories.toLocaleString("ko-KR")}
                  </span>
                  <span className="typo-caption3">kcal</span>
                </div>
              </article>
            </div>
          </section>

          <div className={styles.sectionHeader}>
            <p className="typo-title3">오늘 한 운동</p>
          </div>

          {renderEditContent()}
        </main>

        <footer className={styles.editFooter}>
          <Button
            fullWidth
            size="large"
            variant="outlined"
            color="primary"
            onClick={handleSearchWorkout}
          >
            <SystemIcon name="plus" size={18} />
            운동 추가하기
          </Button>
          <Button fullWidth size="large" onClick={completeEditMode}>
            완료하기
          </Button>
        </footer>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <PageHeader title="운동 기록" onBack={handleBack} />

      <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} variant="normal" />

      <main className={styles.content}>
        <section className={styles.cardContainer}>
          <p className="typo-title3">오늘 운동 요약</p>
          <div className={styles.summaryGrid} aria-label="운동 요약">
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryTitle} typo-caption3`}>총 운동 시간</span>
              <div className={styles.summaryValueRow}>
                <span className={`${styles.summaryValue} typo-title2`}>
                  {formatWorkoutDuration(summary.duration)}
                </span>
              </div>
            </article>
            <article className={styles.summaryCard}>
              <span className={`${styles.summaryTitle} typo-caption3`}>총 소모 칼로리</span>
              <div className={styles.summaryValueRow}>
                <span className={`${styles.summaryValue} typo-title2`}>
                  {summary.burnedCalories.toLocaleString("ko-KR")}
                </span>
                <span className="typo-caption3">kcal</span>
              </div>
            </article>
          </div>
        </section>

        <div className={styles.sectionHeader}>
          <p className="typo-title3">오늘 한 운동</p>
          {workouts.length > 0 && (
            <Button variant="text" color="normal" size="small" onClick={startEditMode}>
              수정
              <SystemIcon name="chevron-right-thin" size={18} />
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

function WorkoutEditCard({
  deleteDisabled,
  workout,
  onClick,
  onDelete,
  onDragEnd,
  onDragEnter,
  onDragStart,
}: {
  deleteDisabled: boolean;
  workout: WorkoutRecordItemResponseDto;
  onClick: () => void;
  onDelete: () => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragStart: () => void;
}) {
  return (
    <article
      className={styles.editRecordCard}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
    >
      <button
        type="button"
        className={styles.dragHandle}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        aria-label={`${workout.workout_name} 순서 변경`}
      >
        <span aria-hidden="true" className={styles.dragDots} />
      </button>

      <button type="button" className={styles.editRecordMain} onClick={onClick}>
        <div className={styles.thumbnail}>
          {workout.workout_image ? (
            <img src={workout.workout_image} alt="" className={styles.thumbnailImage} />
          ) : (
            <SystemIcon name={workout.workout_type === "cardio" ? "walking" : "fire"} size={28} />
          )}
        </div>

        <div className={styles.recordContent}>
          <p className={`typo-label1`}>{workout.workout_name}</p>
          <p className="typo-caption4">
            {workout.workout_type === "cardio"
              ? `${formatWorkoutDuration(workout.workout_duration)}`
              : `${workout.set_list?.length ?? 0}세트`}
          </p>
        </div>

        <span className={`${styles.calorieText} typo-label3`}>
          {workout.burned_calories.toLocaleString("ko-KR")}kcal
        </span>
      </button>

      <button
        type="button"
        className={styles.deleteButton}
        onClick={onDelete}
        disabled={deleteDisabled}
        aria-label={`${workout.workout_name} 삭제`}
      >
        <SystemIcon name="trash" size={18} />
      </button>
    </article>
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
          <SystemIcon name={workout.workout_type === "cardio" ? "walking" : "fire"} size={28} />
        )}
      </div>

      <div className={styles.recordContent}>
        <p className={`typo-label1`}>{workout.workout_name}</p>

        <p className="typo-caption4">
          {workout.workout_type === "cardio"
            ? `${formatWorkoutDuration(workout.workout_duration)}`
            : `${workout.set_list?.length}세트`}
        </p>
      </div>

      <span className={`${styles.calorieText} typo-label3`}>
        {workout.burned_calories.toLocaleString("ko-KR")}kcal
      </span>
      <SystemIcon name="chevron-right-thin" size={18} className={styles.chevronIcon} />
    </button>
  );
}
