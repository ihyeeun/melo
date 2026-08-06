import { useQueryClient } from "@tanstack/react-query";
import type { PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  deleteTodayWorkoutRecord,
  upsertWorkoutRecord,
} from "@/features/health/api/health-record.api";
import {
  useGetWorkoutRecordQuery,
  workoutKeys,
} from "@/features/health/hooks/queries/workout.query";
import {
  useClearWorkoutRecordEdit,
  useInitializeWorkoutRecordEdit,
  useMoveWorkoutRecordEditRecord,
  useRemoveWorkoutRecordEditRecord,
  useWorkoutRecordEditDate,
  useWorkoutRecordEditRecords,
} from "@/features/health/stores/workoutRecordEdit.store";
import { formatWorkoutDuration } from "@/features/health/utils/workoutFormat";
import {
  getWorkoutRecordPath,
  getWorkoutSearchPath,
  getWorkoutUpsertPath,
} from "@/router/pathHelpers";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import type { UpsertWorkoutRecordRequestDto } from "@/shared/api/types/api.request.dto";
import type {
  WorkoutRecordItemResponseDto,
  WorkoutRecordResponseDto,
} from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator, LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey, isValidDateKey } from "@/shared/utils/dateFormat";

import styles from "../styles/WorkoutRecordPage.module.css";

const EMPTY_WORKOUT_RECORDS: WorkoutRecordItemResponseDto[] = [];

function getSafeWorkoutDateKey(rawDate: string | null) {
  return rawDate && isValidDateKey(rawDate) ? rawDate : getTodayFormatDateKey();
}

function getWorkoutSummary(workouts: WorkoutRecordItemResponseDto[]) {
  return workouts.reduce(
    (acc, workout) => ({
      burnedCalories: acc.burnedCalories + workout.burned_calories,
      duration: acc.duration + workout.workout_duration,
    }),
    { burnedCalories: 0, duration: 0 },
  );
}

function createUpsertWorkoutRecordRequest(
  date: string,
  workout: WorkoutRecordItemResponseDto,
): UpsertWorkoutRecordRequestDto {
  const baseRequest = {
    burned_calories: workout.burned_calories,
    date,
    workout_duration: workout.workout_duration,
    workout_id: workout.workout_id,
  };

  if (workout.workout_type === "cardio") {
    return {
      ...baseRequest,
      ...(workout.intensity !== undefined ? { intensity: workout.intensity } : {}),
      workout_type: "cardio",
    };
  }

  return {
    ...baseRequest,
    set_list: workout.set_list?.map((set) => ({ ...set })) ?? [],
    workout_type: "weight",
  };
}

function cloneWorkoutRecord(record: WorkoutRecordItemResponseDto): WorkoutRecordItemResponseDto {
  return {
    ...record,
    ...(record.set_list ? { set_list: record.set_list.map((set) => ({ ...set })) } : {}),
  };
}

function createUpsertWorkoutRecordRequests(date: string, records: WorkoutRecordItemResponseDto[]) {
  return records.map((record) => createUpsertWorkoutRecordRequest(date, record));
}

function serializeWorkoutRecordRequest(date: string, workout: WorkoutRecordItemResponseDto) {
  return JSON.stringify(createUpsertWorkoutRecordRequest(date, workout));
}

function areSameWorkoutIds(left: number[], right: number[]) {
  return (
    left.length === right.length && left.every((workoutId, index) => workoutId === right[index])
  );
}

function canSaveWorkoutRecordsWithoutReset(
  currentRecords: WorkoutRecordItemResponseDto[],
  nextRecords: WorkoutRecordItemResponseDto[],
) {
  const currentWorkoutIds = currentRecords.map((record) => record.workout_id);
  const nextWorkoutIds = nextRecords.map((record) => record.workout_id);
  const currentWorkoutIdSet = new Set(currentWorkoutIds);
  const nextWorkoutIdSet = new Set(nextWorkoutIds);
  const keptCurrentWorkoutIds = currentWorkoutIds.filter((workoutId) =>
    nextWorkoutIdSet.has(workoutId),
  );
  const newWorkoutIds = nextWorkoutIds.filter((workoutId) => !currentWorkoutIdSet.has(workoutId));

  return areSameWorkoutIds(nextWorkoutIds, [...keptCurrentWorkoutIds, ...newWorkoutIds]);
}

function getWorkoutRecordSavePlan({
  currentRecords,
  date,
  nextRecords,
}: {
  currentRecords: WorkoutRecordItemResponseDto[];
  date: string;
  nextRecords: WorkoutRecordItemResponseDto[];
}) {
  const shouldResetBeforeUpsert = !canSaveWorkoutRecordsWithoutReset(currentRecords, nextRecords);

  if (shouldResetBeforeUpsert) {
    return {
      deleteWorkoutIds: [],
      shouldResetBeforeUpsert,
      upsertRequests: createUpsertWorkoutRecordRequests(date, nextRecords),
    };
  }

  const nextWorkoutIdSet = new Set(nextRecords.map((record) => record.workout_id));
  const currentSignatureByWorkoutId = new Map(
    currentRecords.map((record) => [
      record.workout_id,
      serializeWorkoutRecordRequest(date, record),
    ]),
  );
  const deleteWorkoutIds = currentRecords
    .filter((record) => !nextWorkoutIdSet.has(record.workout_id))
    .map((record) => record.workout_id);
  const upsertRequests = nextRecords.reduce<UpsertWorkoutRecordRequestDto[]>((requests, record) => {
    const request = createUpsertWorkoutRecordRequest(date, record);
    const currentSignature = currentSignatureByWorkoutId.get(record.workout_id);

    if (currentSignature !== JSON.stringify(request)) {
      requests.push(request);
    }

    return requests;
  }, []);

  return {
    deleteWorkoutIds,
    shouldResetBeforeUpsert,
    upsertRequests,
  };
}

function hasWorkoutRecordSaveChanges(savePlan: ReturnType<typeof getWorkoutRecordSavePlan>) {
  return (
    savePlan.shouldResetBeforeUpsert ||
    savePlan.deleteWorkoutIds.length > 0 ||
    savePlan.upsertRequests.length > 0
  );
}

function trackWorkoutRecordEditCompleted() {
  track(EVENT_NAME.WORKOUT_RECORD_COMPLETED, {
    source: "workout_edit",
  });
}

export default function WorkoutRecordEditPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dateKey = getSafeWorkoutDateKey(searchParams.get("date"));
  const workoutRecordQuery = useGetWorkoutRecordQuery(dateKey);
  const editDate = useWorkoutRecordEditDate();
  const editRecords = useWorkoutRecordEditRecords();
  const initializeEditRecords = useInitializeWorkoutRecordEdit();
  const clearEditRecords = useClearWorkoutRecordEdit();
  const removeEditRecord = useRemoveWorkoutRecordEditRecord();
  const moveEditRecord = useMoveWorkoutRecordEditRecord();
  const draggingWorkoutIdRef = useRef<number | null>(null);
  const [draggingWorkoutId, setDraggingWorkoutId] = useState<number | null>(null);
  const [isSavePending, setIsSavePending] = useState(false);
  const serverWorkouts = workoutRecordQuery.data?.workout_list ?? EMPTY_WORKOUT_RECORDS;
  const draftRecords = editDate === dateKey ? editRecords : serverWorkouts;
  const editSummary = useMemo(() => getWorkoutSummary(draftRecords), [draftRecords]);

  useEffect(() => {
    if (!workoutRecordQuery.data || editDate === dateKey) return;

    initializeEditRecords({
      date: dateKey,
      records: serverWorkouts,
    });
  }, [dateKey, editDate, initializeEditRecords, serverWorkouts, workoutRecordQuery.data]);

  useEffect(() => {
    return () => {
      clearEditRecords();
    };
  }, [clearEditRecords]);

  const leaveEditMode = () => {
    clearEditRecords();
    draggingWorkoutIdRef.current = null;
    setDraggingWorkoutId(null);
    navigateBack({ fallbackTo: getWorkoutRecordPath(dateKey) });
  };

  const closeEditMode = () => {
    if (isSavePending) return;

    leaveEditMode();
  };

  const completeEditMode = async () => {
    if (workoutRecordQuery.isPending || workoutRecordQuery.isError || isSavePending) return;

    const savePlan = getWorkoutRecordSavePlan({
      currentRecords: serverWorkouts,
      date: dateKey,
      nextRecords: draftRecords,
    });

    try {
      setIsSavePending(true);

      if (savePlan.shouldResetBeforeUpsert) {
        if (serverWorkouts.length > 0) {
          await deleteTodayWorkoutRecord({ date: dateKey });
        }
      } else if (savePlan.deleteWorkoutIds.length === serverWorkouts.length) {
        if (serverWorkouts.length > 0) {
          await deleteTodayWorkoutRecord({ date: dateKey });
        }
      } else {
        for (const workoutId of savePlan.deleteWorkoutIds) {
          await deleteTodayWorkoutRecord({ date: dateKey, workout_id: workoutId });
        }
      }

      for (const request of savePlan.upsertRequests) {
        await upsertWorkoutRecord(request);
      }

      queryClient.setQueryData<WorkoutRecordResponseDto>(workoutKeys.records.byDate(dateKey), {
        workout_list: draftRecords.map(cloneWorkoutRecord),
      });
      if (hasWorkoutRecordSaveChanges(savePlan)) {
        trackWorkoutRecordEditCompleted();
      }
      leaveEditMode();
      toast.success("운동 기록이 저장되었어요");
    } catch {
      setIsSavePending(false);
      toast.warning("운동 기록 저장에 실패했어요", "잠시 후 다시 시도해주세요.");
    }
  };

  const ensureEditRecordsInitialized = () => {
    if (editDate === dateKey || !workoutRecordQuery.data) return;

    initializeEditRecords({
      date: dateKey,
      records: serverWorkouts,
    });
  };

  const handleSearchWorkout = () => {
    if (isSavePending) return;

    ensureEditRecordsInitialized();
    navigate(getWorkoutSearchPath(dateKey, { mode: "edit" }));
  };

  const handleWorkoutCardClick = (workout: WorkoutRecordItemResponseDto) => {
    if (isSavePending) return;

    ensureEditRecordsInitialized();
    navigate(getWorkoutUpsertPath(dateKey, workout.workout_id, { mode: "edit" }), {
      state: { returnDepth: 1, workoutRecord: workout },
    });
  };

  const handleDeleteWorkout = (workoutId: number) => {
    if (isSavePending) return;

    removeEditRecord(workoutId);
  };

  const handleDragStart = (workoutId: number) => {
    draggingWorkoutIdRef.current = workoutId;
    setDraggingWorkoutId(workoutId);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    const draggingWorkoutId = draggingWorkoutIdRef.current;
    if (draggingWorkoutId === null) return;

    const element = document.elementFromPoint(clientX, clientY);
    const recordElement =
      element instanceof Element ? element.closest<HTMLElement>("[data-workout-record-id]") : null;
    const targetWorkoutId = Number(recordElement?.dataset.workoutRecordId);

    if (!Number.isInteger(targetWorkoutId) || targetWorkoutId <= 0) return;

    moveEditRecord(draggingWorkoutId, targetWorkoutId);
  };

  const handleDragEnd = () => {
    draggingWorkoutIdRef.current = null;
    setDraggingWorkoutId(null);
  };

  const renderStatusContent = (
    targetRecords: WorkoutRecordItemResponseDto[],
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

    if (targetRecords.length === 0) {
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
      draftRecords,
      "운동 기록을 불러오는 중입니다.",
      "운동 기록을 불러오지 못했어요",
      "운동 기록이 없어요",
      () => (
        <section className={styles.recordList} aria-label="운동 수정 목록">
          {draftRecords.map((workout) => (
            <WorkoutEditCard
              key={workout.workout_id}
              workout={workout}
              isDragging={draggingWorkoutId === workout.workout_id}
              onClick={() => handleWorkoutCardClick(workout)}
              onDelete={() => handleDeleteWorkout(workout.workout_id)}
              onDragEnd={handleDragEnd}
              onDragMove={handleDragMove}
              onDragStart={() => handleDragStart(workout.workout_id)}
            />
          ))}
        </section>
      ),
    );

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
        <h1 className={`${styles.editHeaderTitle} typo-title3`}>운동 수정</h1>
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
          variant="outlined"
          color="primary"
          disabled={workoutRecordQuery.isPending || workoutRecordQuery.isError || isSavePending}
          onClick={handleSearchWorkout}
        >
          <SystemIcon name="plus" size={18} />
          운동 추가하기
        </Button>
        <Button
          fullWidth
          disabled={workoutRecordQuery.isPending || workoutRecordQuery.isError || isSavePending}
          onClick={completeEditMode}
        >
          {isSavePending ? "저장 중" : "완료하기"}
        </Button>
      </footer>

      {isSavePending ? <LoadingOverlay label="운동 기록을 저장하는 중입니다." /> : null}
    </section>
  );
}

function WorkoutEditCard({
  isDragging,
  workout,
  onClick,
  onDelete,
  onDragEnd,
  onDragMove,
  onDragStart,
}: {
  isDragging: boolean;
  workout: WorkoutRecordItemResponseDto;
  onClick: () => void;
  onDelete: () => void;
  onDragEnd: () => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragStart: () => void;
}) {
  const releasePointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <article
      className={`${styles.editRecordCard} ${isDragging ? styles.editRecordCardDragging : ""}`}
      data-workout-record-id={workout.workout_id}
    >
      <button
        type="button"
        className={styles.dragHandle}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;

          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          onDragStart();
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

          event.preventDefault();
          onDragMove(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          releasePointerCapture(event);
          onDragEnd();
        }}
        onPointerCancel={(event) => {
          releasePointerCapture(event);
          onDragEnd();
        }}
        aria-label={`${workout.workout_name} 순서 변경`}
      >
        <SystemIcon name="grip" size={24} />
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
          <p className={`ellipsis typo-title4`}>{workout.workout_name}</p>
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
        aria-label={`${workout.workout_name} 삭제`}
      >
        <SystemIcon name="trash" size={18} />
      </button>
    </article>
  );
}
