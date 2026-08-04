import { http, HttpResponse } from "msw";

import { API_BASE_URL } from "@/shared/api/apiClient";
import type {
  DeleteWorkoutRecordRequestDto,
  UpsertWorkoutRecordRequestDto,
} from "@/shared/api/types/api.request.dto";
import type {
  WorkoutDetailResponseDto,
  WorkoutIdResponseDto,
  WorkoutRecordItemResponseDto,
  WorkoutRecordResponseDto,
  WorkoutSearchItemResponseDto,
  WorkoutSearchResponseDto,
} from "@/shared/api/types/api.response.dto";

function endpoint(path: string) {
  return `${API_BASE_URL}${path}`;
}

function ok<T>(data: T, statusCode = 200) {
  return HttpResponse.json(
    {
      message: "OK",
      statusCode,
      data,
    },
    { status: statusCode },
  );
}

// 검색 목록 값
const workoutSearchItems: WorkoutSearchItemResponseDto[] = [
  {
    workout_id: 1001,
    workout_name: "벤치프레스_근력",
    workout_type: "weight",
  },
  { workout_id: 1003, workout_name: "러닝_유산소", workout_type: "cardio" },
];

// 운동 상세 내역 값
const workoutDetailItems: WorkoutDetailResponseDto[] = [
  {
    workout_id: 1001,
    workout_name: "벤치프레스",
    workout_type: "weight",
    equiopment: "바벨",
    body_parts: [
      "가슴",
      "삼두",
      "삼두",
      "삼두",
      "삼두",
      "삼두",
      "삼두",
      "삼두",
      "삼두",
      "삼두",
      "삼두",
    ],
  },
  {
    workout_id: 1002,
    workout_name: "덤벨 플라이",
    workout_type: "weight",
    equiopment: "덤벨",
    body_parts: ["가슴", "어깨"],
  },
  {
    workout_id: 1003,
    workout_name: "러닝",
    workout_type: "cardio",
    equiopment: "실외",
    body_parts: ["전신", "하체"],
  },
];

// 조회 값
const workoutRecordItems: WorkoutRecordItemResponseDto[] = [
  {
    workout_id: 1001,
    workout_name: "벤치프레스",
    workout_duration: 35,
    burned_calories: 210,
    workout_type: "weight",
    set_list: [
      { set_order: 1, weight: 40, reps: 12 },
      { set_order: 2, weight: 45, reps: 10 },
      { set_order: 3, weight: 50, reps: 8 },
    ],
  },
  {
    workout_id: 1002,
    workout_name: "덤벨 플라이",
    workout_duration: 28,
    burned_calories: 140,
    workout_type: "weight",
    set_list: [
      { set_order: 1, weight: 8, reps: 15 },
      { set_order: 2, weight: 10, reps: 12 },
      { set_order: 3, weight: 10, reps: 12 },
    ],
  },
  {
    workout_id: 1003,
    workout_name: "러닝",
    workout_type: "cardio",
    workout_duration: 30,
    burned_calories: 300,
    intensity: 1,
  },
];

const workoutRecordResponse: WorkoutRecordResponseDto = {
  workout_list: workoutRecordItems,
};

const workoutSearchResponse: WorkoutSearchResponseDto = {
  workout_list: workoutSearchItems,
};

function getWorkoutName(workoutId: number) {
  return (
    workoutDetailItems.find((item) => item.workout_id === workoutId)?.workout_name ??
    workoutSearchItems.find((item) => item.workout_id === workoutId)?.workout_name ??
    "운동"
  );
}

function toWorkoutRecordItem(workout: UpsertWorkoutRecordRequestDto): WorkoutRecordItemResponseDto {
  if (workout.workout_type === "cardio") {
    return {
      burned_calories: workout.burned_calories,
      intensity: workout.intensity,
      workout_duration: workout.workout_duration,
      workout_id: workout.workout_id,
      workout_name: getWorkoutName(workout.workout_id),
      workout_type: "cardio",
    };
  }

  return {
    burned_calories: workout.burned_calories,
    set_list: workout.set_list ?? [],
    workout_duration: workout.workout_duration,
    workout_id: workout.workout_id,
    workout_name: getWorkoutName(workout.workout_id),
    workout_type: "weight",
  };
}

export const handlers = [
  http.post(endpoint("/home/getWorkoutRecord"), () => {
    return ok(workoutRecordResponse);
  }),

  http.post(endpoint("/home/deleteWorkoutRecord"), async ({ request }) => {
    const body = (await request.json()) as DeleteWorkoutRecordRequestDto;

    if (typeof body.workout_id === "number") {
      const workoutIndex = workoutRecordItems.findIndex(
        (workout) => workout.workout_id === body.workout_id,
      );

      if (workoutIndex >= 0) {
        workoutRecordItems.splice(workoutIndex, 1);
      }
    } else {
      workoutRecordItems.splice(0, workoutRecordItems.length);
    }

    return ok(null);
  }),

  http.post(endpoint("/home/searchWorkout"), () => {
    return ok(workoutSearchResponse);
  }),

  http.post(endpoint("/home/workout/detail"), async ({ request }) => {
    const body = (await request.json()) as Partial<WorkoutIdResponseDto>;
    const workout =
      workoutDetailItems.find((item) => item.workout_id === body.workout_id) ??
      workoutDetailItems[0];

    return ok(workout);
  }),

  http.post(endpoint("/home/registerWorkout"), async ({ request }) => {
    const body = (await request.json()) as Partial<UpsertWorkoutRecordRequestDto>;

    if (typeof body.workout_id === "number") {
      const nextWorkout = toWorkoutRecordItem(body as UpsertWorkoutRecordRequestDto);
      const workoutIndex = workoutRecordItems.findIndex(
        (item) => item.workout_id === nextWorkout.workout_id,
      );

      if (workoutIndex >= 0) {
        workoutRecordItems[workoutIndex] = nextWorkout;
      } else {
        workoutRecordItems.push(nextWorkout);
      }
    }

    return ok({
      workout_id: body.workout_id ?? workoutSearchItems[0]?.workout_id ?? 0,
    });
  }),
];
