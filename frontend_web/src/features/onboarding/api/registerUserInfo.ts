import { END_POINT } from "@/features/onboarding/api/endpoints";
import { authedApiData } from "@/shared/api/appApi";

type UserInfoRequest = {
  gender: number;
  birthYear: number;
  height: number;
  weight: number;
  activity: number;
  goal: number;
  target_weight: number;
  target_calories: number;
  target_ratio: [carbs: number, protein: number, fat: number];
  subCode: string;
};

type UserInfoReponse = {
  nickname: string;
  email: string;
} & UserInfoRequest;

export function postRegisterUserInfo(payload: UserInfoRequest) {
  return authedApiData<UserInfoReponse>({
    endpoint: END_POINT.REGISTER_USER_INFO,
    method: "POST",
    body: payload,
  });
}
