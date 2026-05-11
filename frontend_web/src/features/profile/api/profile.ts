import { appApiData } from "@/shared/api/appApi";
import type { ProfileResponseDto, UserGoalSnapshotResponseDto } from "@/shared/api/types/api.dto";

const END_POINT = {
  GET_PROFILE: "/profile/getProfile",
  UPDATE_GENDER: "/profile/updateGender",
  UPDATE_BIRTH_YEAR: "/profile/updateBirthYear",
  UPDATE_HEIGHT: "/profile/updateHeight",
  UPDATE_WEIGHT: "/profile/updateWeight",
  UPDATE_ACTIVITY: "/profile/updateActivity",
  UPDATE_GOAL: "/profile/updateGoal",
  UPDATE_TARGET_WEIGHT: "/profile/updateTargetWeight",
  UPDATE_TARGET_CALORIES: "/profile/updateTargetCalories",
  UPDATE_TARGET_RATIO: "/profile/updateTargetRatio",
  REGISTER_SUB_CODE: "/profile/registerSubCode",
  UPDATE_NICKNAME: "/profile/updateNickname",
  GET_USER_GOAL_SNAPSHOT: "/profile/getUserGoalSnapshot",
};

export async function getProfile() {
  const response = appApiData<ProfileResponseDto>({
    endpoint: END_POINT.GET_PROFILE,
    method: "GET",
  });

  return response;
}

async function updateProfileField(endpoint: string, body: Record<string, unknown>) {
  const response = await appApiData<ProfileResponseDto>({
    endpoint,
    method: "POST",
    body,
  });

  return response;
}

export function updateGender(gender: number) {
  return updateProfileField(END_POINT.UPDATE_GENDER, { gender });
}

export function updateBirthYear(birthYear: number) {
  return updateProfileField(END_POINT.UPDATE_BIRTH_YEAR, { birthYear });
}

export function updateHeight(height: number) {
  return updateProfileField(END_POINT.UPDATE_HEIGHT, { height });
}

export function updateWeight(weight: number) {
  return updateProfileField(END_POINT.UPDATE_WEIGHT, { weight });
}

export function updateActivity(activity: number) {
  return updateProfileField(END_POINT.UPDATE_ACTIVITY, { activity });
}

export function updateGoal(goal: number) {
  return updateProfileField(END_POINT.UPDATE_GOAL, { goal });
}

export function updateTargetWeight(targetWeight: number) {
  return updateProfileField(END_POINT.UPDATE_TARGET_WEIGHT, { target_weight: targetWeight });
}

export function updateTargetCalories(targetCalories: number) {
  return updateProfileField(END_POINT.UPDATE_TARGET_CALORIES, { target_calories: targetCalories });
}

export function updateTargetRatio(targetRatio: [number, number, number]) {
  return updateProfileField(END_POINT.UPDATE_TARGET_RATIO, { target_ratio: targetRatio });
}

export function registerSubCode(subCode: string) {
  return updateProfileField(END_POINT.REGISTER_SUB_CODE, { subCode });
}

export function updateNickName(nickname: string) {
  return updateProfileField(END_POINT.UPDATE_NICKNAME, { nickname });
}

export function getUserGoalSnapshot(date: string) {
  return appApiData<UserGoalSnapshotResponseDto>({
    endpoint: END_POINT.GET_USER_GOAL_SNAPSHOT,
    method: "POST",
    body: { date },
  });
}
