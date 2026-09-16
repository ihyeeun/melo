import { useActivity } from "@stackflow/react";

import { useGetWorkoutDetailQuery } from "@/features/health/hooks/queries/workout.query";
import { getWorkoutSearchPath, getWorkoutUpsertPath } from "@/router/pathHelpers";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
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
    });
  };

  const renderContent = () => {
    if (workoutId === null || !detailWorkout) {
      return <SheetStatus message="운동 정보를 찾을 수 없어요" />;
    }

    if (workoutDetailQuery.isError) {
      return <SheetStatus message="운동 상세 정보를 불러오지 못했어요" />;
    }

    if (workoutDetailQuery.isPending) {
      return (
        <section className={styles.sheetContainer}>
          <Skeleton height={25} width={124} />

          <div className={styles.thumbnail}>
            <Skeleton height={180} width={180} />
          </div>

          <div className={styles.infoGroup}>
            <Skeleton height={24} width={100} />
          </div>
          <div className={styles.infoGroup}>
            <Skeleton height={24} width={110} />
          </div>

          <Skeleton height={52} width={"100%"} />
        </section>
      );
    }

    const imageUrl = detailWorkout.workout_gif;
    const bodyParts = [
      detailWorkout.body_part_major,
      ...(detailWorkout.body_part_minor ?? []),
    ].filter((bodyPart): bodyPart is string => Boolean(bodyPart));
    const equipment = [detailWorkout.equipment_category, detailWorkout.equipment_detail]
      .filter(Boolean)
      .join(", ");

    return (
      <div className={styles.sheetContainer}>
        <h2 className={`${styles.title} title-s-semi`}>{detailWorkout.workout_name}</h2>

        <div className={styles.thumbnail}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className={styles.thumbnailImage} />
          ) : (
            <p className={`body-l-semi text-tertiary`}>이미지 준비 중이에요</p>
          )}
        </div>

        <section className={styles.infoGroup}>
          <p className={`${styles.sectionTitle} body-l-medium`}>기구</p>
          {equipment ? <p className={`body-l-medium`}>{equipment}</p> : null}
        </section>

        {bodyParts.length > 0 ? (
          <section className={styles.infoGroup}>
            <p className={`${styles.sectionTitle} body-l-medium`}>운동 부하</p>
            <div className={`${styles.chipList} body-l-medium`}>{bodyParts.join(", ")}</div>
          </section>
        ) : null}

        <Button variant="default" fullWidth onClick={handleRegister}>
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

function SheetStatus({ message }: { message: string }) {
  return (
    <section className={styles.statusContainer}>
      <p className="body-l-medium text-tertiary">{message}</p>
    </section>
  );
}
