import type {
  UpsertWorkoutRecordRequestDto,
  WorkoutSetRequestDto,
} from "@/shared/api/types/api.request.dto";
import type {
  ProfileResponseDto,
  WorkoutDetailResponseDto,
} from "@/shared/api/types/api.response.dto";

type WorkoutRecordDraft = Partial<
  Omit<UpsertWorkoutRecordRequestDto, "burned_calories" | "date" | "set_list">
> & {
  burned_calories?: number | null;
  set_list?: Array<Partial<WorkoutSetRequestDto>>;
};

const BODYWEIGHT_EQUIPMENT_CATEGORY = "맨몸";

function isValidNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isBodyweightWorkout(
  workout: Pick<WorkoutDetailResponseDto, "equipment_category" | "workout_type"> | undefined,
) {
  return (
    workout?.workout_type === "weight" &&
    workout.equipment_category === BODYWEIGHT_EQUIPMENT_CATEGORY
  );
}

export function getWorkoutSetListFromDraft(
  draft: Pick<WorkoutRecordDraft, "set_list">,
  options?: {
    defaultWeight?: number;
  },
): WorkoutSetRequestDto[] | null {
  if (!draft.set_list) return null;

  return draft.set_list.reduce<WorkoutSetRequestDto[] | null>((sets, set, index) => {
    if (sets === null) return null;

    const weight = options?.defaultWeight ?? set.weight;

    if (!isValidNumber(weight) || !isValidNumber(set.reps)) return null;

    sets.push({
      reps: set.reps,
      set_order: index + 1,
      weight,
    });

    return sets;
  }, []);
}

export function calculateWeightWorkoutDuration(sets: WorkoutSetRequestDto[]) {
  if (sets.length === 0) return undefined;

  const totalReps = sets.reduce((acc, set) => acc + set.reps, 0);
  if (totalReps === 0) return undefined;

  const durationMinutes = (totalReps * 3 + (sets.length - 1) * 90) / 60;

  return Math.max(1, Math.round(durationMinutes));
}

export function calculateCaloriesBurned({
  draft,
  workout,
  profile,
}: {
  draft: WorkoutRecordDraft;
  workout: WorkoutDetailResponseDto;
  profile: ProfileResponseDto;
}) {
  const burnedCalories = 3.5 * (profile.weight / 200);

  if (workout.workout_type === "cardio") {
    const workoutTime = draft.workout_duration;

    // 유산소인 경우에는 운동시간을 받아야해
    if (!isValidNumber(workoutTime) || workoutTime === 0) return;

    const met = getCardioMet(draft.intensity);
    if (!met) return;

    return burnedCalories * met * workoutTime;
  }

  if (workout.workout_type === "weight") {
    const sets = getWorkoutSetListFromDraft(draft, {
      defaultWeight: isBodyweightWorkout(workout) ? 0 : undefined,
    });

    // 무산소인 경우에는 운동시간이 필요없음
    if (!sets || sets.length === 0) return;
    const weightWorkoutTime = calculateWeightWorkoutDuration(sets);
    if (!weightWorkoutTime) return;

    return burnedCalories * (workout.met ?? 2.5) * weightWorkoutTime;
  }
}

function getCardioMet(intensity?: 0 | 1 | 2) {
  switch (intensity) {
    case 0:
      return 4.5;
    case 1:
      return 6.5;
    case 2:
      return 9;
    default:
      return undefined;
  }
}
