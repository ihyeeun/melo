import { useActivity } from "@stackflow/react";

import { useGetWorkoutDetailQuery } from "@/features/health/hooks/queries/workout.query";
import { getWorkoutSearchPath, getWorkoutUpsertPath } from "@/router/pathHelpers";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import { getTodayFormatDateKey, isValidDateKey } from "@/shared/utils/dateFormat";

import styles from "../styles/WorkoutDetailSheetPage.module.css";

function getSafeDateKey(rawDate: string | undefined) {
  return rawDate && isValidDateKey(rawDate) ? rawDate : getTodayFormatDateKey();
}

function getSafeWorkoutId(rawWorkoutId: string | undefined) {
  if (!rawWorkoutId) return null;

  const workoutId = Number(rawWorkoutId);
  return Number.isInteger(workoutId) && workoutId > 0 ? workoutId : null;
}

function isWorkoutEditMode(rawMode: string | undefined) {
  return rawMode === "edit";
}

export default function WorkoutDetailSheetPage() {
  const activity = useActivity();
  const navigate = useNavigate();
  const date = getSafeDateKey(activity.params.date);
  const workoutId = getSafeWorkoutId(activity.params.workoutId);
  const isEditMode = isWorkoutEditMode(activity.params.mode);
  const workoutPathOptions = isEditMode ? ({ mode: "edit" } as const) : undefined;
  const workoutDetailQuery = useGetWorkoutDetailQuery(workoutId ?? 0, {
    enabled: workoutId !== null,
  });
  const detailWorkout = workoutDetailQuery.data;
  const isOpen =
    activity.transitionState === "enter-active" || activity.transitionState === "enter-done";

  const closeSheet = () => {
    if (!activity.isActive) return;
    navigateBack({ fallbackTo: getWorkoutSearchPath(date, workoutPathOptions) });
  };

  const handleRegister = () => {
    if (workoutId === null) return;
    navigate(getWorkoutUpsertPath(date, workoutId, workoutPathOptions), {
      replace: true,
      state: isEditMode ? { returnDepth: 2 } : undefined,
    });
  };

  const renderContent = () => {
    if (workoutId === null) {
      return <SheetStatus message="운동 정보를 찾을 수 없어요" onClose={closeSheet} />;
    }

    if (workoutDetailQuery.isPending) {
      return (
        <section className={styles.statusContainer}>
          <LoadingIndicator label="운동 상세 정보를 불러오는 중입니다." />
        </section>
      );
    }

    if (workoutDetailQuery.isError) {
      return <SheetStatus message="운동 상세 정보를 불러오지 못했어요" onClose={closeSheet} />;
    }

    if (!detailWorkout) {
      return <SheetStatus message="운동 정보를 찾을 수 없어요" onClose={closeSheet} />;
    }

    const imageUrl = detailWorkout.workout_gif;
    const bodyParts = detailWorkout.body_parts;
    const equipment = detailWorkout.equipments;

    return (
      <div className={styles.sheetContainer}>
        <h2 className={`${styles.title} typo-title3`}>{detailWorkout.workout_name}</h2>

        <div className={styles.thumbnail}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className={styles.thumbnailImage} />
          ) : (
            <SystemIcon
              name={detailWorkout.workout_type === "cardio" ? "walking" : "fire"}
              size={40}
            />
          )}
        </div>
        <section className={styles.infoGroup}>
          <p className={`${styles.sectionTitle} typo-label3`}>기구</p>
          {equipment ? <p className={`typo-label3`}>{equipment}</p> : null}
        </section>

        {bodyParts.length > 0 ? (
          <section className={styles.infoGroup}>
            <p className={`${styles.sectionTitle} typo-label3`}>운동 부하</p>
            <div className={styles.chipList}>{bodyParts.join(", ")}</div>
          </section>
        ) : null}

        <Button variant="filled" color="primary" fullWidth onClick={handleRegister}>
          운동 추가하기
        </Button>
      </div>
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} bottomPadding={20}>
      {renderContent()}
    </BottomSheet>
  );
}

function SheetStatus({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <section className={styles.statusContainer}>
      <p className="typo-body2">{message}</p>
      <Button variant="outlined" color="normal" size="small" onClick={onClose}>
        닫기
      </Button>
    </section>
  );
}
