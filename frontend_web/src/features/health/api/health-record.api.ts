import { appApiData } from "@/shared/api/apiClient";
import type {
  DeleteWorkoutRecordRequestDto,
  SearchWorkoutRequestDto,
  UpsertWorkoutRecordRequestDto,
} from "@/shared/api/types/api.request.dto";
import {
  type WorkoutDetailResponseDto,
  type WorkoutIdResponseDto,
  type WorkoutRecordResponseDto,
  type WorkoutSearchResponseDto,
} from "@/shared/api/types/api.response.dto";

export async function getTodayWorkoutRecord(date: string) {
  const response = await appApiData<WorkoutRecordResponseDto>({
    method: "POST",
    endpoint: "/home/getWorkoutRecord",
    body: { date },
  });

  return response;
}

export async function deleteTodayWorkoutRecord(body: DeleteWorkoutRecordRequestDto) {
  await appApiData({
    method: "POST",
    endpoint: "/home/deleteWorkoutRecord",
    body,
  });
}

export async function getSearchWorkout(body: SearchWorkoutRequestDto) {
  const response = await appApiData<WorkoutSearchResponseDto>({
    method: "POST",
    endpoint: "/home/searchWorkout",
    body,
  });

  return response;
}

export async function getWorkoutDetail(workoutId: number) {
  const response = await appApiData<WorkoutDetailResponseDto>({
    method: "POST",
    endpoint: "/home/workout/detail",
    body: { workout_id: workoutId },
  });

  return response;
}

export async function upsertWorkoutRecord(body: UpsertWorkoutRecordRequestDto) {
  const response = await appApiData<WorkoutIdResponseDto>({
    method: "POST",
    endpoint: "/home/registerWorkout",
    body,
  });

  return response;
}
