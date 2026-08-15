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
): boolean {
  return (
    workout?.workout_type === "weight" &&
    workout.equipment_category === BODYWEIGHT_EQUIPMENT_CATEGORY
  );
}

export function calculateWorkoutCalories({
  draft,
  workout,
  profile,
}: {
  draft: WorkoutRecordDraft;
  workout: WorkoutDetailResponseDto;
  profile: ProfileResponseDto;
}): number {
  let activeValue = 0;
  let restValue = 0;

  // 1. 유산소 운동
  if (workout.workout_type === "cardio") {
    const activeMet = getCardioMet(draft.intensity);
    const activeTimeMin = draft.workout_duration;

    if (!activeMet || !activeTimeMin) return 0;

    activeValue = (activeMet - 1) * activeTimeMin;

    const restMet = 0;
    restValue = restMet;
  }

  // 2. 근력 운동
  else if (workout.workout_type === "weight") {
    const sets = getWorkoutSetListFromDraft(draft, {
      defaultWeight: isBodyweightWorkout(workout) ? 0 : undefined,
    });

    if (!sets || sets.length === 0) return 0;

    const times = calculateWeightWorkoutTimes(sets);

    const activeMet = workout.met;
    if (!activeMet || !times?.activeTime || !times.restTime) return 0;

    activeValue = (activeMet - 1) * times.activeTime;

    const restMet = 1.2;
    restValue = (restMet - 1) * times.restTime;
  }

  const workoutCalorie = ((activeValue + restValue) * 3.5 * profile.weight) / 200;

  return workoutCalorie;
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
  const times = calculateWeightWorkoutTimes(sets);

  if (!times) return;

  const totalTime = times.activeTime + times.restTime;

  return Math.max(1, Math.round(totalTime));
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

function calculateWeightWorkoutTimes(sets: WorkoutSetRequestDto[]) {
  const REP_SEC = 3;
  const REST_SEC = 90;

  if (sets.length === 0) return;

  const activeSec = sets.reduce((totalSec, set) => {
    return totalSec + set.reps * REP_SEC;
  }, 0);

  const restSec = (sets.length - 1) * REST_SEC;

  const activeTime = activeSec / 60;
  const restTime = restSec / 60;

  return {
    activeTime,
    restTime,
  };
}
